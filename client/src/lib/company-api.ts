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

// ============ AUDIT API ============

export type AuditType = "INTERNAL" | "EXTERNAL";
export type AuditStatus = "DRAFT" | "IN_PROGRESS" | "IN_REVIEW" | "CLOSED";
export type ServiceContext = "SIL" | "COMMUNITY_ACCESS" | "IN_HOME" | "CENTRE_BASED" | "OTHER";
export type IndicatorRating = "MAJOR_NC" | "MINOR_NC" | "CONFORMITY" | "CONFORMITY_BEST_PRACTICE";
export type FindingStatus = "OPEN" | "UNDER_REVIEW" | "CLOSED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Audit {
  id: string;
  companyId: string;
  auditType: AuditType;
  title: string;
  description: string | null;
  status: AuditStatus;
  serviceContext: ServiceContext;
  serviceContextLabel: string | null;
  scopeTimeFrom: string;
  scopeTimeTo: string;
  createdByCompanyUserId: string | null;
  externalAuditorName: string | null;
  externalAuditorOrg: string | null;
  externalAuditorEmail: string | null;
  scopeLocked: boolean;
  closeReason: string | null;
  entityName: string | null;
  entityAbn: string | null;
  entityAddress: string | null;
  auditPurpose: string | null;
  methodology: string | null;
  executiveSummary: string | null;
  createdAt: string;
  scorePercent?: number | null;
  completedCount?: number;
  indicatorCount?: number;
}

export interface AuditTemplate {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  indicatorCount?: number;
}

export interface AuditTemplateIndicator {
  id: string;
  templateId: string;
  indicatorText: string;
  guidanceText: string | null;
  evidenceRequirements: string | null;
  riskLevel: RiskLevel;
  isCriticalControl: boolean;
  auditDomainCode: "STAFF_PERSONNEL" | "GOV_POLICY" | "OPERATIONAL" | "SITE_ENVIRONMENT" | null;
  sortOrder: number;
}

export interface AuditIndicatorResponse {
  id: string;
  auditId: string;
  templateIndicatorId: string;
  rating: IndicatorRating;
  comment: string | null;
  status: "OPEN" | "CLOSED";
  createdByCompanyUserId: string;
}

export interface Finding {
  id: string;
  companyId: string;
  auditId: string;
  templateIndicatorId: string;
  severity: "MINOR_NC" | "MAJOR_NC";
  findingText: string;
  status: FindingStatus;
  ownerCompanyUserId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface ScopeOption {
  category: { id: string; categoryKey: string; categoryLabel: string };
  lineItems: { id: string; itemCode: string; itemLabel: string; budgetGroup: string }[];
}

export interface ServiceContextOption {
  key: string;
  label: string;
}

export interface LineItemOption {
  lineItemId: string;
  code: string;
  label: string;
}

export interface LineItemsByCategory {
  categoryId: string;
  categoryKey: string;
  categoryLabel: string;
  items: LineItemOption[];
}

export interface AuditOptions {
  serviceContexts: ServiceContextOption[];
  lineItemsByCategory: LineItemsByCategory[];
  selectedLineItemCount: number;
}

export interface AuditDomain {
  id: string;
  companyId: string;
  code: "STAFF_PERSONNEL" | "GOV_POLICY" | "OPERATIONAL";
  name: string;
  description: string | null;
  isEnabledByDefault: boolean;
  createdAt: string;
}

export interface AuditScopeDomain {
  id: string;
  auditId: string;
  domainId: string;
  isIncluded: boolean;
  domain: AuditDomain;
}

export interface ScopeOptionsResponse {
  lineItemsByCategory: LineItemsByCategory[];
  selectedLineItemCount: number;
}

export interface AuditRunnerScopeDomain {
  id: string;
  code: "STAFF_PERSONNEL" | "GOV_POLICY" | "OPERATIONAL";
  name: string;
  isIncluded: boolean;
}

export interface AuditRunnerData {
  audit: Audit;
  template: AuditTemplate | null;
  indicators: AuditTemplateIndicator[];
  responses: AuditIndicatorResponse[];
  scopeItems: { id: string; auditId: string; lineItemId: string }[];
  scopeDomains?: AuditRunnerScopeDomain[];
  progress: { total: number; completed: number };
}

export async function getAuditOptions(): Promise<AuditOptions> {
  const res = await fetch("/api/company/audits/options", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audit options");
  return res.json();
}

export async function getAuditDomains(): Promise<AuditDomain[]> {
  const res = await fetch("/api/company/audit-domains", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audit domains");
  return res.json();
}

export async function getAuditScopeDomains(auditId: string): Promise<AuditScopeDomain[]> {
  const res = await fetch(`/api/company/audits/${auditId}/domains`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audit scope domains");
  return res.json();
}

export async function updateAuditScopeDomains(auditId: string, domainIds: string[]): Promise<AuditScopeDomain[]> {
  const res = await fetch(`/api/company/audits/${auditId}/domains`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ domainIds }),
  });
  if (!res.ok) throw new Error("Failed to update audit scope domains");
  return res.json();
}

export async function createAudit(input: {
  auditType: AuditType;
  title: string;
  description?: string;
  serviceContextKey: string;
  serviceContextLabel: string;
  scopeTimeFrom: string;
  scopeTimeTo: string;
  externalAuditorName?: string;
  externalAuditorOrg?: string;
  externalAuditorEmail?: string;
  entityName?: string;
  entityAbn?: string;
  entityAddress?: string;
  auditPurpose?: string;
  selectedLineItemIds?: string[];
  selectedDomainIds?: string[];
}): Promise<Audit> {
  const res = await fetch("/api/company/audits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || data.message || "Failed to create audit");
  }
  return res.json();
}

export async function getAudits(filters?: { status?: AuditStatus; auditType?: AuditType }): Promise<Audit[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.auditType) params.set("auditType", filters.auditType);
  
  const res = await fetch(`/api/company/audits?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audits");
  return res.json();
}

export async function getAudit(id: string): Promise<Audit & { scopeLineItems: any[]; auditRun: any; template: AuditTemplate | null }> {
  const res = await fetch(`/api/company/audits/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audit");
  return res.json();
}

export async function getScopeOptions(): Promise<{ categories: ScopeOption[] }> {
  const res = await fetch("/api/company/audits/new/scope-options", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch scope options");
  return res.json();
}

export async function getAuditScopeOptions(auditId: string): Promise<ScopeOptionsResponse> {
  const res = await fetch(`/api/company/audits/${auditId}/scope-options`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch scope options");
  return res.json();
}

export async function updateAuditScope(auditId: string, lineItemIds: string[]): Promise<{ success: boolean }> {
  const res = await fetch(`/api/company/audits/${auditId}/scope`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ lineItemIds }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update scope");
  }
  return res.json();
}

export async function getAuditTemplates(): Promise<AuditTemplate[]> {
  const res = await fetch("/api/company/audit-templates", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}

export async function getAuditTemplate(id: string): Promise<AuditTemplate & { indicators: AuditTemplateIndicator[] }> {
  const res = await fetch(`/api/company/audit-templates/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch template");
  return res.json();
}

export async function createAuditTemplate(input: { name: string; description?: string }): Promise<AuditTemplate> {
  const res = await fetch("/api/company/audit-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create template");
  }
  return res.json();
}

export async function addTemplateIndicator(
  templateId: string,
  input: {
    indicatorText: string;
    guidanceText?: string;
    evidenceRequirements?: string;
    riskLevel?: RiskLevel;
    isCriticalControl?: boolean;
    sortOrder?: number;
    auditDomainCode?: string;
  }
): Promise<AuditTemplateIndicator> {
  const res = await fetch(`/api/company/audit-templates/${templateId}/indicators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to add indicator");
  }
  return res.json();
}

// Standard Indicators Library
export interface StandardIndicator {
  id: string;
  domainCode: string;
  category: string;
  indicatorText: string;
  guidanceText?: string;
  evidenceRequirements?: string;
  riskLevel: RiskLevel;
  isCriticalControl: boolean;
  sortOrder: number;
}

export async function getStandardIndicators(domainCodes?: string[]): Promise<StandardIndicator[]> {
  const params = domainCodes?.length ? `?domains=${domainCodes.join(',')}` : '';
  const res = await fetch(`/api/company/standard-indicators${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch standard indicators");
  return res.json();
}

export async function getStandardIndicatorsByDomain(domainCode: string): Promise<StandardIndicator[]> {
  const res = await fetch(`/api/company/standard-indicators/${domainCode}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch standard indicators");
  return res.json();
}

export async function selectAuditTemplate(auditId: string, templateId: string): Promise<any> {
  const res = await fetch(`/api/company/audits/${auditId}/template`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ templateId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to select template");
  }
  return res.json();
}

export async function startAudit(auditId: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/company/audits/${auditId}/start`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to start audit");
  }
  return res.json();
}

export async function getAuditRunner(auditId: string): Promise<AuditRunnerData> {
  const res = await fetch(`/api/company/audits/${auditId}/runner`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch runner data");
  return res.json();
}

export interface AuditSummary {
  indicatorCount: number;
  conformanceCount: number;
  observationCount: number;
  minorNcCount: number;
  majorNcCount: number;
  scorePointsTotal: number;
  scorePercent: number;
  completedCount: number;
}

export async function getAuditSummary(auditId: string): Promise<AuditSummary> {
  const res = await fetch(`/api/company/audits/${auditId}/summary`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audit summary");
  return res.json();
}

export async function saveIndicatorResponse(
  auditId: string,
  indicatorId: string,
  input: { rating: IndicatorRating; comment?: string }
): Promise<AuditIndicatorResponse> {
  const res = await fetch(`/api/company/audits/${auditId}/responses/${indicatorId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to save response");
  }
  return res.json();
}

export async function submitAudit(auditId: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/company/audits/${auditId}/submit`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to submit audit");
  }
  return res.json();
}

export async function addIndicatorResponseInReview(auditId: string, data: { indicatorId: string; rating: IndicatorRating; comment?: string }): Promise<AuditIndicatorResponse> {
  const res = await fetch(`/api/company/audits/${auditId}/in-review/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to add response");
  }
  return res.json();
}

export async function closeAudit(auditId: string, closeReason?: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/company/audits/${auditId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ closeReason }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to close audit");
  }
  return res.json();
}

export interface AuditOutcome {
  id: string;
  auditId: string;
  templateIndicatorId: string;
  rating: "CONFORMANCE" | "OBSERVATION" | "MINOR_NC" | "MAJOR_NC";
  comment: string | null;
  scorePoints: number;
  scoreVersion: string;
  status: string;
  createdByCompanyUserId: string;
  createdAt: string;
  auditTitle: string;
  auditStatus: string;
  indicatorText: string;
  sortOrder: number;
}

export async function getAuditOutcomes(filters?: { rating?: string; auditId?: string }): Promise<AuditOutcome[]> {
  const params = new URLSearchParams();
  if (filters?.rating) params.set("rating", filters.rating);
  if (filters?.auditId) params.set("auditId", filters.auditId);
  
  const res = await fetch(`/api/company/audit-outcomes?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audit outcomes");
  return res.json();
}

export async function getFindings(filters?: { status?: FindingStatus; severity?: string; auditId?: string }): Promise<Finding[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.auditId) params.set("auditId", filters.auditId);
  
  const res = await fetch(`/api/company/findings?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch findings");
  return res.json();
}

export async function getFinding(id: string): Promise<Finding & { audit: Audit; indicator: AuditTemplateIndicator }> {
  const res = await fetch(`/api/company/findings/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch finding");
  return res.json();
}

export async function updateFinding(
  id: string,
  updates: { ownerCompanyUserId?: string | null; dueDate?: string | null; status?: FindingStatus }
): Promise<Finding> {
  const res = await fetch(`/api/company/findings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update finding");
  }
  return res.json();
}

// ===== EVIDENCE API =====

export type EvidenceStatus = "REQUESTED" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
export type EvidenceType = "POLICY" | "PROCEDURE" | "TRAINING_RECORD" | "INCIDENT_REPORT" | "CASE_NOTE" | "MEDICATION_RECORD" | "BSP" | "RISK_ASSESSMENT" | "ROSTER" | "OTHER";

export interface EvidenceRequest {
  id: string;
  companyId: string;
  auditId: string | null;
  findingId: string | null;
  templateIndicatorId: string | null;
  evidenceType: EvidenceType;
  requestNote: string;
  status: EvidenceStatus;
  dueDate: string | null;
  publicToken: string | null;
  requestedByCompanyUserId: string;
  reviewedByCompanyUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string | null;
  indicator?: { id: string; indicatorText: string } | null;
  audit?: { id: string; title: string; serviceContextLabel: string | null } | null;
}

export interface EvidenceItem {
  id: string;
  companyId: string;
  evidenceRequestId: string;
  storageKind: "UPLOAD" | "LINK";
  fileName: string;
  filePath: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  note: string | null;
  uploadedByCompanyUserId: string | null;
  externalUploaderName: string | null;
  externalUploaderEmail: string | null;
  documentType: string | null;
  createdAt: string;
}

export async function requestEvidence(
  findingId: string,
  data: { evidenceType: EvidenceType; requestNote: string; dueDate?: string | null }
): Promise<EvidenceRequest> {
  const res = await fetch(`/api/company/findings/${findingId}/request-evidence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to request evidence");
  }
  return res.json();
}

export async function getEvidenceRequests(filters?: { status?: EvidenceStatus; auditId?: string }): Promise<EvidenceRequest[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.auditId) params.set("auditId", filters.auditId);
  
  const res = await fetch(`/api/company/evidence/requests?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch evidence requests");
  return res.json();
}

export async function getEvidenceRequest(id: string): Promise<EvidenceRequest & { finding: Finding; items: EvidenceItem[] }> {
  const res = await fetch(`/api/company/evidence/requests/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch evidence request");
  return res.json();
}

export async function submitEvidence(
  evidenceRequestId: string,
  data: {
    storageKind: "UPLOAD" | "LINK";
    fileName: string;
    filePath?: string;
    externalUrl?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    note?: string;
  }
): Promise<EvidenceItem> {
  const res = await fetch(`/api/company/evidence/requests/${evidenceRequestId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to submit evidence");
  }
  return res.json();
}

export async function startEvidenceReview(evidenceRequestId: string): Promise<EvidenceRequest> {
  const res = await fetch(`/api/company/evidence/requests/${evidenceRequestId}/start-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to start review");
  }
  return res.json();
}

export async function reviewEvidence(
  evidenceRequestId: string,
  data: { decision: "ACCEPTED" | "REJECTED"; reviewNote?: string }
): Promise<EvidenceRequest> {
  const res = await fetch(`/api/company/evidence/requests/${evidenceRequestId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to review evidence");
  }
  return res.json();
}

export async function getFindingEvidence(findingId: string): Promise<{ evidenceRequest: EvidenceRequest | null; items: EvidenceItem[] }> {
  const res = await fetch(`/api/company/findings/${findingId}/evidence`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch finding evidence");
  return res.json();
}

// Standalone evidence request (not linked to audit or finding)
export async function createStandaloneEvidenceRequest(data: {
  evidenceType: EvidenceType;
  requestNote: string;
  dueDate?: string | null;
}): Promise<EvidenceRequest> {
  const res = await fetch("/api/company/evidence/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to create evidence request");
  }
  return res.json();
}

// Audit-linked evidence request (pre-finding)
export async function createAuditEvidenceRequest(
  auditId: string,
  data: {
    evidenceType: EvidenceType;
    requestNote: string;
    templateIndicatorId?: string;
    dueDate?: string | null;
  }
): Promise<EvidenceRequest> {
  const res = await fetch(`/api/company/audits/${auditId}/request-evidence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to create evidence request");
  }
  return res.json();
}

// Get all evidence requests for an audit
export async function getAuditEvidenceRequests(auditId: string): Promise<EvidenceRequest[]> {
  const res = await fetch(`/api/company/audits/${auditId}/evidence-requests`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch audit evidence requests");
  return res.json();
}

// Document Checklist Types
export type ChecklistSection = "HYGIENE" | "IMPLEMENTATION" | "CRITICAL";
export type ChecklistResponse = "YES" | "NO" | "PARTLY" | "NA";
export type ReviewDecision = "ACCEPT" | "REJECT";

export interface DocumentChecklistItem {
  id: string;
  templateId: string;
  section: ChecklistSection;
  itemKey: string;
  itemText: string;
  isCritical: boolean;
  sortOrder: number;
}

export interface DocumentChecklistTemplate {
  id: string;
  documentType: string;
  templateName: string;
  description: string | null;
  version: number;
  isActive: boolean;
  items?: DocumentChecklistItem[];
}

export interface DocumentReviewInput {
  evidenceRequestId: string;
  evidenceItemId: string;
  auditId?: string;
  responses: Array<{ itemId: string; response: ChecklistResponse }>;
  decision: ReviewDecision;
  comments?: string;
}

export interface DocumentReview {
  id: string;
  companyId: string;
  evidenceRequestId: string;
  evidenceItemId: string;
  checklistTemplateId: string;
  reviewerCompanyUserId: string;
  responses: Array<{ itemId: string; response: ChecklistResponse }>;
  decision: ReviewDecision;
  dqsPercent: number;
  criticalFailuresCount: number;
  auditId: string | null;
  comments: string | null;
  createdAt: string;
}

// Document Checklist API
export async function getDocumentChecklistTemplates(): Promise<DocumentChecklistTemplate[]> {
  const res = await fetch("/api/company/document-checklists/templates", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch checklist templates");
  return res.json();
}

export async function getDocumentChecklistTemplate(documentType: string): Promise<DocumentChecklistTemplate & { items: DocumentChecklistItem[] }> {
  const res = await fetch(`/api/company/document-checklists/templates/${documentType}`, { credentials: "include" });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch checklist template");
  }
  return res.json();
}

// Document Review API
export interface DocumentReviewResult {
  review: DocumentReview;
  suggestedFinding: SuggestedFinding | null;
}

export async function createDocumentReview(data: DocumentReviewInput): Promise<DocumentReviewResult> {
  const res = await fetch("/api/company/document-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to create document review");
  }
  return res.json();
}

export async function getDocumentReviewByEvidenceItem(evidenceItemId: string): Promise<DocumentReview | null> {
  const res = await fetch(`/api/company/document-reviews/${evidenceItemId}`, { credentials: "include" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch document review");
  return res.json();
}

// Suggested Findings API
export type SuggestedFindingType = "OBSERVATION" | "MINOR_NC" | "MAJOR_NC" | "NONE";
export type SeverityFlag = "LOW" | "MEDIUM" | "HIGH";
export type SuggestionStatus = "PENDING" | "CONFIRMED" | "DISMISSED";

export interface SuggestedFinding {
  id: string;
  companyId: string;
  auditId: string;
  indicatorResponseId: string | null;
  evidenceRequestId: string;
  documentReviewId: string;
  suggestedType: SuggestedFindingType;
  severityFlag: SeverityFlag | null;
  rationaleText: string;
  status: SuggestionStatus;
  confirmedFindingId: string | null;
  dismissedByUserId: string | null;
  dismissedReason: string | null;
  dismissedAt: string | null;
  createdAt: string;
}

export async function getPendingSuggestedFindings(auditId?: string): Promise<SuggestedFinding[]> {
  const params = auditId ? `?auditId=${auditId}` : "";
  const res = await fetch(`/api/company/suggested-findings${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch suggested findings");
  return res.json();
}

export async function getSuggestedFindingsForIndicator(indicatorResponseId: string): Promise<SuggestedFinding[]> {
  const res = await fetch(`/api/company/suggested-findings/indicator/${indicatorResponseId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch suggested findings for indicator");
  return res.json();
}

export async function getSuggestedFinding(id: string): Promise<SuggestedFinding | null> {
  const res = await fetch(`/api/company/suggested-findings/${id}`, { credentials: "include" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch suggested finding");
  return res.json();
}

export interface ConfirmSuggestionInput {
  findingType: "OBSERVATION" | "MINOR_NC" | "MAJOR_NC";
  description: string;
}

export interface ConfirmSuggestionResult {
  suggestion: SuggestedFinding;
  finding: Finding | null;
}

export async function confirmSuggestedFinding(id: string, data: ConfirmSuggestionInput): Promise<ConfirmSuggestionResult> {
  const res = await fetch(`/api/company/suggested-findings/${id}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to confirm suggested finding");
  }
  return res.json();
}

export async function dismissSuggestedFinding(id: string, reason?: string): Promise<SuggestedFinding> {
  const res = await fetch(`/api/company/suggested-findings/${id}/dismiss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to dismiss suggested finding");
  }
  return res.json();
}
