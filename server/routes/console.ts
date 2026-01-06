import { Router } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../storage";
import {
  comparePassword,
  hashPassword,
  generateConsoleToken,
  setConsoleCookie,
  clearConsoleCookie,
  requireConsoleAuth,
  type AuthenticatedConsoleRequest,
} from "../lib/consoleAuth";
import { insertCompanySchema } from "@shared/schema";

const router = Router();

// POST /api/console/login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await storage.getConsoleUserByEmail(email);
    
    if (!user || !user.isActive) {
      await storage.logChange({
        actorType: "system",
        actorId: null,
        companyId: null,
        action: "CONSOLE_LOGIN_FAILED",
        entityType: "console_user",
        entityId: null,
        beforeJson: null,
        afterJson: { email: email.toLowerCase(), reason: "invalid_credentials" },
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const isValid = await comparePassword(password, user.passwordHash);
    
    if (!isValid) {
      await storage.logChange({
        actorType: "system",
        actorId: null,
        companyId: null,
        action: "CONSOLE_LOGIN_FAILED",
        entityType: "console_user",
        entityId: user.id,
        beforeJson: null,
        afterJson: { email: user.email, reason: "invalid_password" },
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = generateConsoleToken(user.id, user.email);
    setConsoleCookie(res, token);
    
    await storage.logChange({
      actorType: "console",
      actorId: user.id,
      companyId: null,
      action: "CONSOLE_LOGIN_SUCCESS",
      entityType: "console_user",
      entityId: user.id,
      beforeJson: null,
      afterJson: { email: user.email },
    });
    
    return res.json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/console/logout
router.post("/logout", requireConsoleAuth, async (req: AuthenticatedConsoleRequest, res) => {
  await storage.logChange({
    actorType: "console",
    actorId: req.consoleUser!.consoleUserId,
    companyId: null,
    action: "CONSOLE_LOGOUT",
    entityType: "console_user",
    entityId: req.consoleUser!.consoleUserId,
    beforeJson: null,
    afterJson: { email: req.consoleUser!.email },
  });
  
  clearConsoleCookie(res);
  return res.json({ success: true });
});

// GET /api/console/me
router.get("/me", requireConsoleAuth, async (req: AuthenticatedConsoleRequest, res) => {
  try {
    const user = await storage.getConsoleUser(req.consoleUser!.consoleUserId);
    
    if (!user) {
      clearConsoleCookie(res);
      return res.status(401).json({ error: "User not found" });
    }
    
    return res.json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/console/companies
router.get("/companies", requireConsoleAuth, async (req, res) => {
  try {
    const companies = await storage.getCompanies();
    return res.json(companies);
  } catch (error) {
    console.error("Get companies error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Extended create company schema with service selection
const createCompanyWithServicesSchema = insertCompanySchema.extend({
  serviceSelectionMode: z.enum(["ALL", "CATEGORY", "CUSTOM"]).default("CUSTOM"),
  selectedCategoryIds: z.array(z.string()).optional(),
  selectedLineItemIds: z.array(z.string()).optional(),
});

// POST /api/console/companies
router.post("/companies", requireConsoleAuth, async (req: AuthenticatedConsoleRequest, res) => {
  try {
    const data = createCompanyWithServicesSchema.parse(req.body);
    const { serviceSelectionMode, selectedCategoryIds, selectedLineItemIds, ...companyData } = data;
    
    // Create company with service selection mode
    const company = await storage.createCompany({
      ...companyData,
      serviceSelectionMode,
      serviceCatalogueVersion: "seed-v1",
    });
    
    // Log company creation
    await storage.logChange({
      actorType: "console",
      actorId: req.consoleUser!.consoleUserId,
      companyId: company.id,
      action: "COMPANY_CREATED",
      entityType: "company",
      entityId: company.id,
      beforeJson: null,
      afterJson: company,
    });
    
    // Provision default roles
    const defaultRoles = [
      { roleKey: "CompanyAdmin", roleLabel: "Company Admin" },
      { roleKey: "Auditor", roleLabel: "Auditor" },
      { roleKey: "Reviewer", roleLabel: "Reviewer" },
      { roleKey: "StaffReadOnly", roleLabel: "Staff (Read Only)" },
    ];
    
    for (const role of defaultRoles) {
      await storage.createCompanyRole({
        companyId: company.id,
        roleKey: role.roleKey,
        roleLabel: role.roleLabel,
      });
    }
    
    await storage.logChange({
      actorType: "console",
      actorId: req.consoleUser!.consoleUserId,
      companyId: company.id,
      action: "COMPANY_ROLES_PROVISIONED",
      entityType: "company",
      entityId: company.id,
      beforeJson: null,
      afterJson: defaultRoles,
    });
    
    // Handle service selections based on mode
    let selectedItemIds: string[] = [];
    
    if (serviceSelectionMode === "ALL") {
      const allItems = await storage.getActiveLineItems();
      selectedItemIds = allItems.map(item => item.id);
    } else if (serviceSelectionMode === "CATEGORY" && selectedCategoryIds?.length) {
      const categoryItems = await storage.getLineItemsByCategoryIds(selectedCategoryIds);
      selectedItemIds = categoryItems.map(item => item.id);
    } else if (serviceSelectionMode === "CUSTOM" && selectedLineItemIds?.length) {
      selectedItemIds = selectedLineItemIds;
    }
    
    // Create company service selections
    if (selectedItemIds.length > 0) {
      const selections = selectedItemIds.map(lineItemId => ({
        companyId: company.id,
        lineItemId,
        selectedByConsoleUserId: req.consoleUser!.consoleUserId,
      }));
      
      await storage.createCompanyServiceSelections(selections);
      
      await storage.logChange({
        actorType: "console",
        actorId: req.consoleUser!.consoleUserId,
        companyId: company.id,
        action: "COMPANY_SERVICES_SELECTED",
        entityType: "company",
        entityId: company.id,
        beforeJson: null,
        afterJson: { mode: serviceSelectionMode, selectedCount: selectedItemIds.length, selectedItemIds },
      });
    }
    
    // Generate temporary password for Company Admin
    const tempPassword = generateSecurePassword();
    const tempPasswordHash = await hashPassword(tempPassword);
    
    // Create initial Company Admin user
    const adminUser = await storage.createCompanyUser({
      companyId: company.id,
      email: companyData.primaryContactEmail,
      fullName: companyData.primaryContactName,
      role: "CompanyAdmin",
      tempPasswordHash,
      mustResetPassword: true,
      isActive: true,
    });
    
    await storage.logChange({
      actorType: "console",
      actorId: req.consoleUser!.consoleUserId,
      companyId: company.id,
      action: "COMPANY_ADMIN_PROVISIONED",
      entityType: "company_user",
      entityId: adminUser.id,
      beforeJson: null,
      afterJson: { email: adminUser.email, role: adminUser.role },
    });
    
    return res.status(201).json({
      company,
      adminEmail: adminUser.email,
      tempPassword,
      serviceSelection: {
        mode: serviceSelectionMode,
        selectedCount: selectedItemIds.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Create company error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/console/companies/:id
router.get("/companies/:id", requireConsoleAuth, async (req, res) => {
  try {
    const company = await storage.getCompany(req.params.id);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    const roles = await storage.getCompanyRoles(company.id);
    const admin = await storage.getCompanyAdmin(company.id);
    
    // Get service selections with full details
    const selections = await storage.getCompanyServiceSelections(company.id);
    const allLineItems = await storage.getSupportLineItems();
    const categories = await storage.getSupportCategories();
    
    const selectedItems = selections.map(sel => {
      const item = allLineItems.find(i => i.id === sel.lineItemId);
      const category = item ? categories.find(c => c.id === item.categoryId) : null;
      return item ? {
        id: item.id,
        itemCode: item.itemCode,
        itemLabel: item.itemLabel,
        budgetGroup: item.budgetGroup,
        categoryKey: category?.categoryKey,
        categoryLabel: category?.categoryLabel,
      } : null;
    }).filter(Boolean);
    
    // Group by category
    const servicesByCategory = categories.map(cat => ({
      categoryKey: cat.categoryKey,
      categoryLabel: cat.categoryLabel,
      items: selectedItems.filter(item => item?.categoryKey === cat.categoryKey),
    })).filter(cat => cat.items.length > 0);
    
    return res.json({
      ...company,
      roles: roles.map(r => ({ id: r.id, roleKey: r.roleKey, roleLabel: r.roleLabel })),
      adminEmail: admin?.email || null,
      adminName: admin?.fullName || null,
      serviceSelection: {
        mode: company.serviceSelectionMode,
        totalSelected: selectedItems.length,
        byCategory: servicesByCategory,
      },
    });
  } catch (error) {
    console.error("Get company error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/console/companies/:id - Update company details
const updateCompanySchema = z.object({
  legalName: z.string().min(2).optional(),
  abn: z.string().optional(),
  ndisRegistrationNumber: z.string().optional(),
  primaryContactName: z.string().min(2).optional(),
  primaryContactEmail: z.string().email().optional(),
  timezone: z.string().optional(),
  complianceScope: z.array(z.string()).optional(),
  status: z.enum(['active', 'suspended', 'onboarding']).optional(),
});

router.patch("/companies/:id", requireConsoleAuth, async (req: AuthenticatedConsoleRequest, res) => {
  try {
    const companyId = req.params.id;
    const updates = updateCompanySchema.parse(req.body);
    
    const existingCompany = await storage.getCompany(companyId);
    if (!existingCompany) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    const beforeJson = {
      legalName: existingCompany.legalName,
      abn: existingCompany.abn,
      ndisRegistrationNumber: existingCompany.ndisRegistrationNumber,
      primaryContactName: existingCompany.primaryContactName,
      primaryContactEmail: existingCompany.primaryContactEmail,
      timezone: existingCompany.timezone,
      complianceScope: existingCompany.complianceScope,
      status: existingCompany.status,
    };
    
    const updatedCompany = await storage.updateCompany(companyId, updates);
    
    if (!updatedCompany) {
      return res.status(404).json({ error: "Company not found or update failed" });
    }
    
    await storage.logChange({
      actorType: "console",
      actorId: req.consoleUser!.consoleUserId,
      companyId,
      action: "COMPANY_UPDATED",
      entityType: "company",
      entityId: companyId,
      beforeJson,
      afterJson: {
        legalName: updatedCompany.legalName,
        abn: updatedCompany.abn,
        ndisRegistrationNumber: updatedCompany.ndisRegistrationNumber,
        primaryContactName: updatedCompany.primaryContactName,
        primaryContactEmail: updatedCompany.primaryContactEmail,
        timezone: updatedCompany.timezone,
        complianceScope: updatedCompany.complianceScope,
        status: updatedCompany.status,
      },
    });
    
    return res.json(updatedCompany);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Update company error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/console/support-catalogue
router.get("/support-catalogue", requireConsoleAuth, async (req, res) => {
  try {
    const categories = await storage.getSupportCategories();
    const lineItems = await storage.getActiveLineItems();
    
    const catalogueWithItems = categories.map(cat => ({
      id: cat.id,
      categoryKey: cat.categoryKey,
      categoryLabel: cat.categoryLabel,
      sortOrder: cat.sortOrder,
      lineItems: lineItems
        .filter(item => item.categoryId === cat.id)
        .map(item => ({
          id: item.id,
          itemCode: item.itemCode,
          itemLabel: item.itemLabel,
          budgetGroup: item.budgetGroup,
          sortOrder: item.sortOrder,
        })),
    }));
    
    return res.json(catalogueWithItems);
  } catch (error) {
    console.error("Get support catalogue error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/console/audit-logs - Get recent audit logs
router.get("/audit-logs", requireConsoleAuth, async (req: AuthenticatedConsoleRequest, res) => {
  try {
    const logs = await storage.getRecentChangeLogs(200);
    return res.json(logs);
  } catch (error) {
    console.error("Get audit logs error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/console/companies/:id/users - Get company users
router.get("/companies/:id/users", requireConsoleAuth, async (req: AuthenticatedConsoleRequest, res) => {
  try {
    const company = await storage.getCompany(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    const users = await storage.getCompanyUsers(req.params.id);
    return res.json(users.map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      mustResetPassword: u.mustResetPassword,
      createdAt: u.createdAt,
    })));
  } catch (error) {
    console.error("Get company users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/console/companies/:id/users/:userId/reset-password - Reset user password
router.post("/companies/:id/users/:userId/reset-password", requireConsoleAuth, async (req: AuthenticatedConsoleRequest, res) => {
  try {
    const company = await storage.getCompany(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    const user = await storage.getCompanyUser(req.params.userId);
    if (!user || user.companyId !== req.params.id) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const tempPassword = generateSecurePassword();
    const tempPasswordHash = await hashPassword(tempPassword);
    
    await storage.setTempPassword(user.id, user.companyId, tempPasswordHash);
    
    await storage.logChange({
      actorType: "console",
      actorId: req.consoleUser!.consoleUserId,
      companyId: company.id,
      action: "COMPANY_USER_PASSWORD_RESET",
      entityType: "company_user",
      entityId: user.id,
      beforeJson: { mustResetPassword: false },
      afterJson: { email: user.email, resetBy: "console", mustResetPassword: true },
    });
    
    return res.json({
      success: true,
      tempPassword,
      email: user.email,
      fullName: user.fullName,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Helper: Generate secure temporary password
function generateSecurePassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

export default router;
