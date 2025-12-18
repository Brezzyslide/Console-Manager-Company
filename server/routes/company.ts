import { Router } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../storage";
import {
  comparePassword,
  hashPassword,
  generateCompanyToken,
  setCompanyCookie,
  clearCompanyCookie,
  requireCompanyAuth,
  type AuthenticatedCompanyRequest,
} from "../lib/companyAuth";

const router = Router();

const loginSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/login", async (req, res) => {
  try {
    const { companyId, email, password } = loginSchema.parse(req.body);
    
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

const passwordResetSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
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

export default router;
