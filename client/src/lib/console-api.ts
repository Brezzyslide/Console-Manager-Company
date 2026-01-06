import { z } from "zod";

export const companySchema = z.object({
  id: z.string(),
  legalName: z.string(),
  abn: z.string().optional().nullable(),
  ndisRegistrationNumber: z.string().optional().nullable(),
  primaryContactName: z.string(),
  primaryContactEmail: z.string(),
  timezone: z.string(),
  complianceScope: z.array(z.string()),
  status: z.enum(['active', 'suspended', 'onboarding']),
  serviceSelectionMode: z.enum(['ALL', 'CATEGORY', 'CUSTOM']).nullable().optional(),
  serviceCatalogueVersion: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type Company = z.infer<typeof companySchema>;

export const lineItemSchema = z.object({
  id: z.string(),
  itemCode: z.string(),
  itemLabel: z.string(),
  budgetGroup: z.string(),
  sortOrder: z.number(),
});

export type LineItem = z.infer<typeof lineItemSchema>;

export const categoryWithItemsSchema = z.object({
  id: z.string(),
  categoryKey: z.string(),
  categoryLabel: z.string(),
  sortOrder: z.number(),
  lineItems: z.array(lineItemSchema),
});

export type CategoryWithItems = z.infer<typeof categoryWithItemsSchema>;

export const serviceSelectionSummarySchema = z.object({
  mode: z.enum(['ALL', 'CATEGORY', 'CUSTOM']).nullable(),
  totalSelected: z.number(),
  byCategory: z.array(z.object({
    categoryKey: z.string(),
    categoryLabel: z.string(),
    items: z.array(z.object({
      id: z.string(),
      itemCode: z.string(),
      itemLabel: z.string(),
      budgetGroup: z.string(),
      categoryKey: z.string().optional(),
      categoryLabel: z.string().optional(),
    })),
  })),
});

export type ServiceSelectionSummary = z.infer<typeof serviceSelectionSummarySchema>;

export const companyRoleSchema = z.object({
  id: z.string(),
  roleKey: z.string(),
  roleLabel: z.string(),
});

export type CompanyRole = z.infer<typeof companyRoleSchema>;

export const companyDetailsSchema = companySchema.extend({
  roles: z.array(companyRoleSchema),
  adminEmail: z.string().nullable(),
  adminName: z.string().nullable(),
  serviceSelection: serviceSelectionSummarySchema.optional(),
});

export type CompanyDetails = z.infer<typeof companyDetailsSchema>;

export const createCompanySchema = z.object({
  legalName: z.string().min(2, "Legal name is required"),
  abn: z.string().optional(),
  ndisRegistrationNumber: z.string().optional(),
  primaryContactName: z.string().min(2, "Primary contact name is required"),
  primaryContactEmail: z.string().email("Valid email is required"),
  timezone: z.string().default("Australia/Melbourne"),
  complianceScope: z.array(z.string()).default([]),
  serviceSelectionMode: z.enum(["ALL", "CATEGORY", "CUSTOM"]).default("CUSTOM"),
  selectedCategoryIds: z.array(z.string()).optional(),
  selectedLineItemIds: z.array(z.string()).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const consoleUserSchema = z.object({
  id: z.string(),
  email: z.string(),
});

export type ConsoleUser = z.infer<typeof consoleUserSchema>;

// API Functions

export async function loginConsole(email: string, password: string): Promise<ConsoleUser> {
  const res = await fetch("/api/console/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    throw new Error("Login failed");
  }
  
  return res.json();
}

export async function logoutConsole(): Promise<void> {
  const res = await fetch("/api/console/logout", {
    method: "POST",
  });
  
  if (!res.ok) {
    throw new Error("Logout failed");
  }
}

export async function getConsoleMe(): Promise<ConsoleUser> {
  const res = await fetch("/api/console/me");
  
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  
  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }
  
  return res.json();
}

export async function getCompanies(): Promise<Company[]> {
  const res = await fetch("/api/console/companies");
  
  if (!res.ok) {
    throw new Error("Failed to fetch companies");
  }
  
  return res.json();
}

export async function getCompany(id: string): Promise<CompanyDetails> {
  const res = await fetch(`/api/console/companies/${id}`);
  
  if (!res.ok) {
    throw new Error("Failed to fetch company");
  }
  
  return res.json();
}

export async function createCompany(data: CreateCompanyInput): Promise<{
  company: Company;
  adminEmail: string;
  tempPassword: string;
  serviceSelection: { mode: string; selectedCount: number };
}> {
  const res = await fetch("/api/console/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    throw new Error("Failed to create company");
  }
  
  return res.json();
}

export async function getSupportCatalogue(): Promise<CategoryWithItems[]> {
  const res = await fetch("/api/console/support-catalogue");
  
  if (!res.ok) {
    throw new Error("Failed to fetch support catalogue");
  }
  
  return res.json();
}

export const updateCompanySchema = z.object({
  legalName: z.string().min(2).optional(),
  abn: z.string().optional(),
  ndisRegistrationNumber: z.string().optional(),
  primaryContactName: z.string().min(2).optional(),
  primaryContactEmail: z.string().email().optional(),
  timezone: z.string().optional(),
  complianceScope: z.array(z.string()).optional(),
  status: z.enum(['active', 'suspended', 'onboarding']).optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export async function updateCompany(id: string, data: UpdateCompanyInput): Promise<Company> {
  const res = await fetch(`/api/console/companies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update company");
  }
  
  return res.json();
}

export const companyUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(['CompanyAdmin', 'Auditor', 'Reviewer', 'StaffReadOnly']),
  isActive: z.boolean(),
  mustResetPassword: z.boolean(),
  createdAt: z.string(),
});

export type CompanyUser = z.infer<typeof companyUserSchema>;

export async function getCompanyUsers(companyId: string): Promise<CompanyUser[]> {
  const res = await fetch(`/api/console/companies/${companyId}/users`);
  
  if (!res.ok) {
    throw new Error("Failed to fetch company users");
  }
  
  return res.json();
}

export async function resetCompanyUserPassword(companyId: string, userId: string): Promise<{
  success: boolean;
  tempPassword: string;
  email: string;
  fullName: string;
}> {
  const res = await fetch(`/api/console/companies/${companyId}/users/${userId}/reset-password`, {
    method: "POST",
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to reset password");
  }
  
  return res.json();
}
