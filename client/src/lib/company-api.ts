import { z } from "zod";

export const companyLoginSchema = z.object({
  companyId: z.string().uuid("Invalid company ID"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CompanyLoginInput = z.infer<typeof companyLoginSchema>;

export const passwordResetSchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(12, "Password must be at least 12 characters"),
  confirmPassword: z.string().min(12, "Password must be at least 12 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export interface CompanyUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string;
  requiresPasswordReset: boolean;
}

export interface CompanyUserListItem {
  id: string;
  email: string;
  fullName: string;
  role: "CompanyAdmin" | "Auditor" | "Reviewer" | "StaffReadOnly";
  isActive: boolean;
  mustResetPassword: boolean;
  createdAt: string;
}

export const createUserSchema = z.object({
  email: z.string().email("Valid email required"),
  fullName: z.string().min(1, "Full name is required"),
  role: z.enum(["CompanyAdmin", "Auditor", "Reviewer", "StaffReadOnly"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function companyLogin(input: CompanyLoginInput): Promise<CompanyUser> {
  const res = await fetch("/api/company/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login failed");
  }
  
  return res.json();
}

export async function companyLogout(): Promise<void> {
  const res = await fetch("/api/company/logout", {
    method: "POST",
    credentials: "include",
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Logout failed");
  }
}

export async function getCompanyMe(): Promise<CompanyUser> {
  const res = await fetch("/api/company/me", {
    credentials: "include",
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Not authenticated");
  }
  
  return res.json();
}

export async function resetPassword(input: PasswordResetInput): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/company/password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Password reset failed");
  }
  
  return res.json();
}

// Admin API functions
export async function getCompanyUsers(): Promise<CompanyUserListItem[]> {
  const res = await fetch("/api/company/admin/users", {
    credentials: "include",
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to fetch users");
  }
  
  return res.json();
}

export async function createCompanyUser(input: CreateUserInput): Promise<{ id: string; email: string; fullName: string; role: string; tempPassword: string }> {
  const res = await fetch("/api/company/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create user");
  }
  
  return res.json();
}

export async function updateCompanyUser(id: string, updates: { fullName?: string; role?: string; isActive?: boolean }): Promise<CompanyUserListItem> {
  const res = await fetch(`/api/company/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update user");
  }
  
  return res.json();
}

export async function resetUserTempPassword(id: string): Promise<{ tempPassword: string; message: string }> {
  const res = await fetch(`/api/company/admin/users/${id}/reset-temp-password`, {
    method: "POST",
    credentials: "include",
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to reset password");
  }
  
  return res.json();
}

// ============ ONBOARDING API ============

export interface OnboardingStatus {
  onboardingStatus: "not_started" | "in_progress" | "completed";
  checklist: {
    hasCompanySettings: boolean;
    hasAtLeastOneServiceSelected: boolean;
    hasAtLeastOneDocumentUploadedOrLinked: boolean;
  };
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const res = await fetch("/api/company/onboarding/status", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch onboarding status");
  return res.json();
}

export async function startOnboarding(): Promise<{ onboardingStatus: string }> {
  const res = await fetch("/api/company/onboarding/start", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to start onboarding");
  return res.json();
}

export async function completeOnboarding(): Promise<{ onboardingStatus: string }> {
  const res = await fetch("/api/company/onboarding/complete", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to complete onboarding");
  }
  return res.json();
}

// ============ SETTINGS API ============

export interface CompanySettings {
  id: string;
  companyId: string;
  tradingName: string | null;
  businessAddress: string | null;
  primaryPhone: string | null;
  ndisRegistrationGroups: string[] | null;
  operatingRegions: string[] | null;
  supportDeliveryContexts: string[] | null;
  keyRisksSummary: string | null;
  documentRetentionNote: string | null;
}

export const settingsSchema = z.object({
  tradingName: z.string().nullable().optional(),
  businessAddress: z.string().nullable().optional(),
  primaryPhone: z.string().nullable().optional(),
  ndisRegistrationGroups: z.array(z.string()).nullable().optional(),
  operatingRegions: z.array(z.string()).nullable().optional(),
  supportDeliveryContexts: z.array(z.string()).nullable().optional(),
  keyRisksSummary: z.string().nullable().optional(),
  documentRetentionNote: z.string().nullable().optional(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const res = await fetch("/api/company/settings", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function updateCompanySettings(input: SettingsInput): Promise<CompanySettings> {
  const res = await fetch("/api/company/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update settings");
  }
  return res.json();
}

// ============ SERVICES API ============

export interface ServiceItem {
  id: string;
  itemCode: string;
  itemLabel: string;
  budgetGroup: string;
  isSelected: boolean;
}

export interface ServiceCategory {
  categoryId: string;
  categoryKey: string;
  categoryLabel: string;
  items: ServiceItem[];
  selectedCount: number;
}

export interface ServicesData {
  mode: "ALL" | "CATEGORY" | "CUSTOM";
  categories: ServiceCategory[];
  totalSelected: number;
}

export async function getCompanyServices(): Promise<ServicesData> {
  const res = await fetch("/api/company/services", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

export interface ServicesUpdateInput {
  mode: "ALL" | "CATEGORY" | "CUSTOM";
  selectedCategoryIds?: string[];
  selectedLineItemIds?: string[];
}

export async function updateCompanyServices(input: ServicesUpdateInput): Promise<{ mode: string; selectedCount: number }> {
  const res = await fetch("/api/company/services", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update services");
  }
  return res.json();
}

// ============ DOCUMENTS API ============

export type DocType = 
  | "policy_pack"
  | "org_chart"
  | "incident_management_policy"
  | "medication_policy"
  | "behaviour_support_policy"
  | "restrictive_practice_policy"
  | "training_matrix"
  | "insurance"
  | "service_agreement_template"
  | "privacy_policy"
  | "complaints_policy"
  | "other";

export interface CompanyDocument {
  id: string;
  companyId: string;
  docType: DocType;
  title: string;
  storageKind: "upload" | "link";
  filePath: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  externalLink: string | null;
  notes: string | null;
  createdAt: string;
}

export async function getCompanyDocuments(): Promise<CompanyDocument[]> {
  const res = await fetch("/api/company/documents", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function addDocumentLink(input: {
  docType: DocType;
  title: string;
  externalLink: string;
  notes?: string;
}): Promise<CompanyDocument> {
  const res = await fetch("/api/company/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...input, storageKind: "link" }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to add document");
  }
  return res.json();
}

export async function uploadDocument(
  file: File,
  docType: DocType,
  title: string,
  notes?: string
): Promise<CompanyDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docType", docType);
  formData.append("title", title);
  if (notes) formData.append("notes", notes);
  
  const res = await fetch("/api/company/documents", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to upload document");
  }
  return res.json();
}

export async function updateDocument(
  id: string,
  updates: { title?: string; docType?: DocType; notes?: string; externalLink?: string }
): Promise<CompanyDocument> {
  const res = await fetch(`/api/company/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update document");
  }
  return res.json();
}
