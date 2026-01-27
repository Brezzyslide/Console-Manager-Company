import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { fromZodError } from "zod-validation-error";
import { storage } from "../storage";
import {
  comparePassword,
  hashPassword,
  generateCompanyToken,
  setCompanyCookie,
  clearCompanyCookie,
  requireCompanyAuth,
  requireRole,
  checkRateLimit,
  resetRateLimit,
  type AuthenticatedCompanyRequest,
} from "../lib/companyAuth";

const router = Router();

function generateSecurePassword(): string {
  return crypto.randomBytes(12).toString("base64").slice(0, 16);
}

const loginSchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/login", async (req, res) => {
  const rateLimitKey = `${req.body.companyId || "unknown"}:${req.body.email || "unknown"}`;
  const rateLimitResult = checkRateLimit(rateLimitKey);
  
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: "Too many login attempts. Please try again later.",
      retryAfter: rateLimitResult.retryAfter,
    });
  }
  try {
    const { companyId: companyIdentifier, email, password } = loginSchema.parse(req.body);
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyIdentifier);
    
    let companyId: string;
    if (isUUID) {
      companyId = companyIdentifier;
    } else {
      const company = await storage.getCompanyByCode(companyIdentifier.toUpperCase());
      if (!company) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      companyId = company.id;
    }
    
    const user = await storage.getCompanyUserByEmail(companyId, email);
    
    if (!user || !user.isActive) {
      await storage.logChange({
        actorType: "system",
        actorId: null,
        companyId,
        action: "COMPANY_USER_LOGIN_FAILED",
        entityType: "company_user",
        entityId: null,
        beforeJson: null,
        afterJson: { email: email.toLowerCase(), reason: "invalid_credentials" },
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    let isValid = false;
    
    if (user.mustResetPassword && user.tempPasswordHash) {
      isValid = await comparePassword(password, user.tempPasswordHash);
    } else if (user.passwordHash) {
      isValid = await comparePassword(password, user.passwordHash);
    }
    
    if (!isValid) {
      await storage.logChange({
        actorType: "system",
        actorId: null,
        companyId,
        action: "COMPANY_USER_LOGIN_FAILED",
        entityType: "company_user",
        entityId: user.id,
        beforeJson: null,
        afterJson: { email: user.email, reason: "invalid_password" },
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = generateCompanyToken(
      user.id,
      user.companyId,
      user.email,
      user.role,
      user.mustResetPassword
    );
    setCompanyCookie(res, token);
    
    resetRateLimit(rateLimitKey);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: user.id,
      companyId: user.companyId,
      action: "COMPANY_USER_LOGIN_SUCCESS",
      entityType: "company_user",
      entityId: user.id,
      beforeJson: null,
      afterJson: { email: user.email, role: user.role },
    });
    
    return res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      requiresPasswordReset: user.mustResetPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Company login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  await storage.logChange({
    actorType: "company_user",
    actorId: req.companyUser!.companyUserId,
    companyId: req.companyUser!.companyId,
    action: "COMPANY_USER_LOGOUT",
    entityType: "company_user",
    entityId: req.companyUser!.companyUserId,
    beforeJson: null,
    afterJson: { email: req.companyUser!.email },
  });
  
  clearCompanyCookie(res);
  return res.json({ success: true });
});

router.get("/me", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const user = await storage.getCompanyUser(req.companyUser!.companyUserId);
    
    if (!user) {
      clearCompanyCookie(res);
      return res.status(401).json({ error: "User not found" });
    }
    
    return res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      requiresPasswordReset: user.mustResetPassword,
    });
  } catch (error) {
    console.error("Get company user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const users = await storage.getCompanyUsers(req.companyUser!.companyId);
    
    const safeUsers = users.map(user => ({
      id: user.id,
      fullName: user.fullName,
      role: user.role,
    }));
    
    return res.json(safeUsers);
  } catch (error) {
    console.error("Get company users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const passwordResetSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(12, "Password must be at least 12 characters"),
  confirmPassword: z.string().min(12),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

router.post("/password-reset", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const { currentPassword, newPassword } = passwordResetSchema.parse(req.body);
    
    const user = await storage.getCompanyUser(req.companyUser!.companyUserId);
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    let isCurrentPasswordValid = false;
    
    if (user.mustResetPassword && user.tempPasswordHash) {
      isCurrentPasswordValid = await comparePassword(currentPassword, user.tempPasswordHash);
    } else if (user.passwordHash) {
      isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    }
    
    if (!isCurrentPasswordValid) {
      await storage.logChange({
        actorType: "company_user",
        actorId: user.id,
        companyId: user.companyId,
        action: "COMPANY_PASSWORD_RESET_FAILED",
        entityType: "company_user",
        entityId: user.id,
        beforeJson: null,
        afterJson: { reason: "invalid_current_password" },
      });
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    
    const newPasswordHash = await hashPassword(newPassword);
    const updatedUser = await storage.updateCompanyUserPassword(user.id, newPasswordHash);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: user.id,
      companyId: user.companyId,
      action: "COMPANY_PASSWORD_RESET",
      entityType: "company_user",
      entityId: user.id,
      beforeJson: { mustResetPassword: true },
      afterJson: { mustResetPassword: false },
    });
    
    const token = generateCompanyToken(
      updatedUser.id,
      updatedUser.companyId,
      updatedUser.email,
      updatedUser.role,
      updatedUser.mustResetPassword
    );
    setCompanyCookie(res, token);
    
    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Password reset error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============ ADMIN ENDPOINTS ============
// All admin endpoints require CompanyAdmin role

router.get("/admin/users", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const users = await storage.getCompanyUsers(req.companyUser!.companyId);
    
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      mustResetPassword: user.mustResetPassword,
      createdAt: user.createdAt,
    }));
    
    return res.json(safeUsers);
  } catch (error) {
    console.error("Get company users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["CompanyAdmin", "Auditor", "Reviewer", "StaffReadOnly"]),
});

router.post("/admin/users", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const data = createUserSchema.parse(req.body);
    const companyId = req.companyUser!.companyId;
    
    const existingUser = await storage.getCompanyUserByEmail(companyId, data.email);
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }
    
    const tempPassword = generateSecurePassword();
    const tempPasswordHash = await hashPassword(tempPassword);
    
    const newUser = await storage.createCompanyUser({
      companyId,
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      role: data.role,
      tempPasswordHash,
      mustResetPassword: true,
      isActive: true,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "COMPANY_USER_CREATED",
      entityType: "company_user",
      entityId: newUser.id,
      beforeJson: null,
      afterJson: { email: newUser.email, role: newUser.role, fullName: newUser.fullName },
    });
    
    return res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      tempPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Create company user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(["CompanyAdmin", "Auditor", "Reviewer", "StaffReadOnly"]).optional(),
  isActive: z.boolean().optional(),
});

router.patch("/admin/users/:id", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const userId = req.params.id;
    const updates = updateUserSchema.parse(req.body);
    const companyId = req.companyUser!.companyId;
    
    const existingUser = await storage.getCompanyUser(userId);
    
    if (!existingUser || existingUser.companyId !== companyId) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const beforeJson = {
      fullName: existingUser.fullName,
      role: existingUser.role,
      isActive: existingUser.isActive,
    };
    
    const updatedUser = await storage.updateCompanyUser(userId, companyId, updates);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "COMPANY_USER_UPDATED",
      entityType: "company_user",
      entityId: userId,
      beforeJson,
      afterJson: updates,
    });
    
    return res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      mustResetPassword: updatedUser.mustResetPassword,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Update company user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users/:id/reset-temp-password", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const userId = req.params.id;
    const companyId = req.companyUser!.companyId;
    
    const existingUser = await storage.getCompanyUser(userId);
    
    if (!existingUser || existingUser.companyId !== companyId) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const tempPassword = generateSecurePassword();
    const tempPasswordHash = await hashPassword(tempPassword);
    
    await storage.setTempPassword(userId, companyId, tempPasswordHash);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "COMPANY_USER_TEMP_PASSWORD_RESET",
      entityType: "company_user",
      entityId: userId,
      beforeJson: { mustResetPassword: existingUser.mustResetPassword },
      afterJson: { mustResetPassword: true },
    });
    
    return res.json({
      tempPassword,
      message: "Temporary password generated. User must reset password on next login.",
    });
  } catch (error) {
    console.error("Reset temp password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/billing-status", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const billingTenant = await storage.getBillingTenantByCompanyId(companyId);
    
    if (!billingTenant) {
      return res.json({
        status: "INACTIVE",
        hasCustomer: false,
        hasSubscription: false,
        message: "No billing configured",
      });
    }
    
    const isPastDue = billingTenant.billingStatus === "PAST_DUE";
    const isCanceled = billingTenant.billingStatus === "CANCELED";
    const isInactive = billingTenant.billingStatus === "INACTIVE";
    
    let message = null;
    if (isPastDue) {
      message = "Your subscription payment is past due. Please update your payment method.";
    } else if (isCanceled) {
      message = "Your subscription has been canceled. Contact support to reactivate.";
    }
    
    return res.json({
      status: billingTenant.billingStatus,
      hasCustomer: !!billingTenant.stripeCustomerId,
      hasSubscription: !!billingTenant.stripeSubscriptionId,
      trialEndsAt: billingTenant.trialEndsAt,
      message,
      showWarning: isPastDue || isCanceled,
    });
  } catch (error) {
    console.error("Get billing status error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/billing", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const billingTenant = await storage.getBillingTenantByCompanyId(companyId);
    
    if (!billingTenant) {
      return res.json({
        hasCustomer: false,
        subscription: null,
        plan: null,
        seatOverride: null,
        invoices: [],
        oneTimeCharges: [],
      });
    }

    let plan = null;
    if (billingTenant.billingPlanId) {
      plan = await storage.getBillingPlan(billingTenant.billingPlanId);
    }

    const seatOverride = await storage.getActiveSeatOverride(companyId);
    const oneTimeCharges = await storage.getOneTimeCharges(companyId);

    let invoices: any[] = [];
    if (billingTenant.stripeCustomerId) {
      try {
        const { getUncachableStripeClient } = await import("../stripeClient");
        const stripe = await getUncachableStripeClient();
        const stripeInvoices = await stripe.invoices.list({
          customer: billingTenant.stripeCustomerId,
          limit: 10,
        });
        invoices = stripeInvoices.data;
      } catch (err) {
        console.error("Failed to fetch Stripe invoices:", err);
      }
    }

    return res.json({
      hasCustomer: !!billingTenant.stripeCustomerId,
      subscription: billingTenant.stripeSubscriptionId ? {
        status: billingTenant.billingStatus,
        seatCount: billingTenant.seatCount,
        currentPeriodStart: billingTenant.currentPeriodStart,
        currentPeriodEnd: billingTenant.currentPeriodEnd,
      } : null,
      plan: plan ? {
        name: plan.name,
        defaultSeatPriceCents: plan.defaultSeatPriceCents,
      } : null,
      seatOverride: seatOverride ? {
        overrideSeatPriceCents: seatOverride.overrideSeatPriceCents,
      } : null,
      invoices,
      oneTimeCharges,
    });
  } catch (error) {
    console.error("Get tenant billing error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/billing/portal", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const billingTenant = await storage.getBillingTenantByCompanyId(companyId);
    
    if (!billingTenant?.stripeCustomerId) {
      return res.status(400).json({ error: "No billing customer configured" });
    }

    const { getUncachableStripeClient } = await import("../stripeClient");
    const stripe = await getUncachableStripeClient();
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : (process.env.APP_URL || "http://localhost:5000");
    
    const session = await stripe.billingPortal.sessions.create({
      customer: billingTenant.stripeCustomerId,
      return_url: `${baseUrl}/company/billing`,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Create billing portal error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
