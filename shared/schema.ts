import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, json, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Console Users (Platform administrators)
export const consoleUsers = pgTable("console_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConsoleUserSchema = createInsertSchema(consoleUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertConsoleUser = z.infer<typeof insertConsoleUserSchema>;
export type ConsoleUser = typeof consoleUsers.$inferSelect;

// Companies (Tenants)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  legalName: text("legal_name").notNull(),
  abn: text("abn"),
  ndisRegistrationNumber: text("ndis_registration_number"),
  primaryContactName: text("primary_contact_name").notNull(),
  primaryContactEmail: text("primary_contact_email").notNull(),
  timezone: text("timezone").notNull().default("Australia/Melbourne"),
  complianceScope: text("compliance_scope").array().notNull().default(sql`ARRAY[]::text[]`),
  status: text("status", { enum: ["active", "suspended", "onboarding"] }).notNull().default("onboarding"),
  serviceSelectionMode: text("service_selection_mode", { enum: ["ALL", "CATEGORY", "CUSTOM"] }).default("CUSTOM"),
  serviceCatalogueVersion: text("service_catalogue_version"),
  onboardingStatus: text("onboarding_status", { enum: ["not_started", "in_progress", "completed"] }).notNull().default("not_started"),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Company Users (Users within a tenant organization)
export const companyUsers = pgTable("company_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["CompanyAdmin", "Auditor", "Reviewer", "StaffReadOnly"] }).notNull(),
  passwordHash: text("password_hash"),
  tempPasswordHash: text("temp_password_hash"),
  mustResetPassword: boolean("must_reset_password").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompanyUserSchema = createInsertSchema(companyUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanyUser = z.infer<typeof insertCompanyUserSchema>;
export type CompanyUser = typeof companyUsers.$inferSelect;

// Company Roles (Default roles provisioned per company)
export const companyRoles = pgTable("company_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  roleKey: text("role_key").notNull(),
  roleLabel: text("role_label").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompanyRoleSchema = createInsertSchema(companyRoles).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanyRole = z.infer<typeof insertCompanyRoleSchema>;
export type CompanyRole = typeof companyRoles.$inferSelect;

// Change Log (Immutable audit trail)
export const changeLog = pgTable("change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorType: text("actor_type", { enum: ["console", "company_user", "system"] }).notNull(),
  actorId: varchar("actor_id"),
  companyId: varchar("company_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  beforeJson: json("before_json"),
  afterJson: json("after_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChangeLogSchema = createInsertSchema(changeLog).omit({
  id: true,
  createdAt: true,
});

export type InsertChangeLog = z.infer<typeof insertChangeLogSchema>;
export type ChangeLog = typeof changeLog.$inferSelect;

// Support Categories (Global catalogue - not tenant-scoped)
export const supportCategories = pgTable("support_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryKey: text("category_key").notNull().unique(),
  categoryLabel: text("category_label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupportCategorySchema = createInsertSchema(supportCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertSupportCategory = z.infer<typeof insertSupportCategorySchema>;
export type SupportCategory = typeof supportCategories.$inferSelect;

// Support Line Items (Global catalogue - not tenant-scoped)
export const supportLineItems = pgTable("support_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => supportCategories.id, { onDelete: "cascade" }),
  itemCode: text("item_code").notNull(),
  itemLabel: text("item_label").notNull(),
  budgetGroup: text("budget_group").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupportLineItemSchema = createInsertSchema(supportLineItems).omit({
  id: true,
  createdAt: true,
});

export type InsertSupportLineItem = z.infer<typeof insertSupportLineItemSchema>;
export type SupportLineItem = typeof supportLineItems.$inferSelect;

// Company Service Selections (Tenant-scoped by company_id)
export const companyServiceSelections = pgTable("company_service_selections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  lineItemId: varchar("line_item_id").notNull().references(() => supportLineItems.id, { onDelete: "cascade" }),
  selectedByConsoleUserId: varchar("selected_by_console_user_id").references(() => consoleUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompanyServiceSelectionSchema = createInsertSchema(companyServiceSelections).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanyServiceSelection = z.infer<typeof insertCompanyServiceSelectionSchema>;
export type CompanyServiceSelection = typeof companyServiceSelections.$inferSelect;

// Company Settings (Tenant-scoped configuration)
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }).unique(),
  tradingName: text("trading_name"),
  businessAddress: text("business_address"),
  primaryPhone: text("primary_phone"),
  ndisRegistrationGroups: json("ndis_registration_groups").$type<string[]>(),
  operatingRegions: json("operating_regions").$type<string[]>(),
  supportDeliveryContexts: json("support_delivery_contexts").$type<string[]>(),
  keyRisksSummary: text("key_risks_summary"),
  documentRetentionNote: text("document_retention_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;

// Company Documents (Tenant-scoped document storage)
export const companyDocuments = pgTable("company_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  docType: text("doc_type", { 
    enum: [
      "policy_pack",
      "org_chart",
      "incident_management_policy",
      "medication_policy",
      "behaviour_support_policy",
      "restrictive_practice_policy",
      "training_matrix",
      "insurance",
      "service_agreement_template",
      "privacy_policy",
      "complaints_policy",
      "other"
    ] 
  }).notNull(),
  title: text("title").notNull(),
  storageKind: text("storage_kind", { enum: ["upload", "link"] }).notNull(),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileMime: text("file_mime"),
  fileSize: integer("file_size"),
  externalLink: text("external_link"),
  notes: text("notes"),
  uploadedByCompanyUserId: varchar("uploaded_by_company_user_id").references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompanyDocumentSchema = createInsertSchema(companyDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanyDocument = z.infer<typeof insertCompanyDocumentSchema>;
export type CompanyDocument = typeof companyDocuments.$inferSelect;

// Audit type enums
export const auditTypeEnum = ["INTERNAL", "EXTERNAL"] as const;
export const auditStatusEnum = ["DRAFT", "IN_PROGRESS", "IN_REVIEW", "CLOSED"] as const;
export const indicatorRatingEnum = ["MAJOR_NC", "MINOR_NC", "CONFORMITY", "CONFORMITY_BEST_PRACTICE"] as const;
export const findingStatusEnum = ["OPEN", "UNDER_REVIEW", "CLOSED"] as const;
export const serviceContextEnum = ["SIL", "COMMUNITY_ACCESS", "IN_HOME", "CENTRE_BASED", "OTHER"] as const;
export const riskLevelEnum = ["LOW", "MEDIUM", "HIGH"] as const;
export const responseStatusEnum = ["OPEN", "CLOSED"] as const;

// Audit Report enums
export const auditMethodologyEnum = ["REMOTE", "ONSITE", "HYBRID"] as const;
export const auditPurposeEnum = [
  "INITIAL_CERTIFICATION",
  "RECERTIFICATION", 
  "SURVEILLANCE",
  "SCOPE_EXTENSION",
  "TRANSFER_AUDIT",
  "SPECIAL_AUDIT",
] as const;
export const auditRecommendationEnum = [
  "CERTIFICATION_RECOMMENDED",
  "CONTINUING_CERTIFICATION_RECOMMENDED",
  "QUALIFIED_CERTIFICATION_RECOMMENDED",
  "FOLLOW_UP_REQUIRED",
  "CERTIFICATION_NOT_RECOMMENDED"
] as const;
export const ageGroupEnum = ["0-6", "7-16", "17-65", "65+"] as const;
export const interviewTypeEnum = ["PARTICIPANT", "STAFF", "STAKEHOLDER"] as const;
export const interviewMethodEnum = ["FACE_TO_FACE", "PHONE", "VIDEO", "FOCUS_GROUP"] as const;

// NDIS Practice Standards Division grouping
export const ndisDivisionEnum = [
  "RIGHTS_RESPONSIBILITIES",
  "GOVERNANCE_OPERATIONAL",
  "PROVISION_OF_SUPPORTS",
  "SUPPORT_PROVISION_ENVIRONMENT"
] as const;

// Sprint 4: Evidence enums
export const evidenceStatusEnum = ["REQUESTED", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"] as const;
export const evidenceTypeEnum = [
  // Client Identity & Authority
  "CLIENT_PROFILE",
  "NDIS_PLAN",
  "SERVICE_AGREEMENT",
  "CONSENT_FORM",
  "GUARDIAN_DOCUMENTATION",
  // Assessment & Planning
  "CARE_PLAN",
  "BSP",
  "MMP",
  "HEALTH_PLAN",
  "COMMUNICATION_PLAN",
  "RISK_ASSESSMENT",
  "EMERGENCY_PLAN",
  // Delivery of Supports
  "ROSTER",
  "SHIFT_NOTES",
  "DAILY_LOG",
  "PROGRESS_NOTES",
  "ACTIVITY_RECORD",
  // Staff & Personnel
  "QUALIFICATION",
  "WWCC",
  "TRAINING_RECORD",
  "SUPERVISION_RECORD",
  // Medication & Health
  "MEDICATION_PLAN",
  "MAR",
  "PRN_LOG",
  // Incidents & Complaints
  "INCIDENT_REPORT",
  "COMPLAINT_RECORD",
  "RP_RECORD",
  // Funding & Claims
  "SERVICE_BOOKING",
  "INVOICE_CLAIM",
  // Governance
  "POLICY",
  "PROCEDURE",
  // Other
  "REVIEW_RECORD",
  "OTHER",
  // Legacy types (kept for backward compatibility)
  "CASE_NOTE",
  "MEDICATION_RECORD",
  "CLEARANCE",
  "SUPERVISION",
  "ROSTER_TIMESHEET",
  "INCIDENT_RECORD"
] as const;
export const storageKindEnum = ["UPLOAD", "LINK"] as const;

// Document Review System enums (aligned with evidence types)
export const documentTypeEnum = [
  // Client Identity & Authority
  "CLIENT_PROFILE",
  "NDIS_PLAN",
  "SERVICE_AGREEMENT",
  "CONSENT_FORM",
  "GUARDIAN_DOCUMENTATION",
  // Assessment & Planning
  "CARE_PLAN",
  "BSP",
  "MMP",
  "HEALTH_PLAN",
  "COMMUNICATION_PLAN",
  "RISK_ASSESSMENT",
  "EMERGENCY_PLAN",
  // Delivery of Supports
  "ROSTER",
  "SHIFT_NOTES",
  "DAILY_LOG",
  "PROGRESS_NOTES",
  "ACTIVITY_RECORD",
  // Staff & Personnel
  "QUALIFICATION",
  "WWCC",
  "TRAINING_RECORD",
  "SUPERVISION_RECORD",
  // Medication & Health
  "MEDICATION_PLAN",
  "MAR",
  "PRN_LOG",
  // Incidents & Complaints
  "INCIDENT_REPORT",
  "COMPLAINT_RECORD",
  "RP_RECORD",
  // Funding & Claims
  "SERVICE_BOOKING",
  "INVOICE_CLAIM",
  // Governance
  "POLICY",
  "PROCEDURE",
  // Other
  "REVIEW_RECORD",
  "OTHER",
  // Legacy types (kept for backward compatibility)
  "CASE_NOTE",
  "MEDICATION_RECORD",
  "CLEARANCE",
  "SUPERVISION",
  "ROSTER_TIMESHEET",
  "INCIDENT_RECORD"
] as const;

export const checklistSectionEnum = ["HYGIENE", "IMPLEMENTATION", "CRITICAL"] as const;
export const checklistResponseEnum = ["YES", "NO", "PARTLY", "NA"] as const;
export const reviewDecisionEnum = ["ACCEPT", "REJECT"] as const;

// Audits (Tenant-scoped)
export const audits = pgTable("audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditType: text("audit_type", { enum: auditTypeEnum }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: auditStatusEnum }).notNull().default("DRAFT"),
  serviceContext: text("service_context", { enum: serviceContextEnum }).notNull(),
  serviceContextLabel: text("service_context_label"),
  scopeTimeFrom: timestamp("scope_time_from").notNull(),
  scopeTimeTo: timestamp("scope_time_to").notNull(),
  createdByCompanyUserId: varchar("created_by_company_user_id").references(() => companyUsers.id),
  createdByConsoleUserId: varchar("created_by_console_user_id").references(() => consoleUsers.id),
  externalAuditorName: text("external_auditor_name"),
  externalAuditorOrg: text("external_auditor_org"),
  externalAuditorEmail: text("external_auditor_email"),
  scopeLocked: boolean("scope_locked").notNull().default(false),
  closeReason: text("close_reason"),
  // Entity being audited (separate from the auditing organization)
  entityName: text("entity_name"),
  entityAbn: text("entity_abn"),
  entityAddress: text("entity_address"),
  // Audit purpose (recertification, initial, surveillance, etc.)
  auditPurpose: text("audit_purpose", { enum: auditPurposeEnum }),
  // Report metadata fields
  methodology: text("methodology", { enum: auditMethodologyEnum }),
  ageGroupsServed: text("age_groups_served").array(),
  participantSampleCount: integer("participant_sample_count"),
  recommendation: text("recommendation", { enum: auditRecommendationEnum }),
  scopeChangeNotes: text("scope_change_notes"),
  // Executive summary (AI-generated with auditor override)
  executiveSummary: text("executive_summary"),
  executiveSummaryEditedAt: timestamp("executive_summary_edited_at"),
  executiveSummaryEditedByUserId: varchar("executive_summary_edited_by_user_id").references(() => companyUsers.id),
  // Document checklist auditor comments (structured by category)
  leadAuditorComment: text("lead_auditor_comment"),
  staffInterviewCommentary: text("staff_interview_commentary"),
  clientInterviewCommentary: text("client_interview_commentary"),
  siteVisitCommentary: text("site_visit_commentary"),
  // Registration groups witnessing data (JSON array)
  registrationGroupsWitnessing: jsonb("registration_groups_witnessing"),
  // Conclusion and sign-off data (JSON object)
  conclusionData: jsonb("conclusion_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
  createdAt: true,
});

export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type Audit = typeof audits.$inferSelect;

// Audit Scope Line Items (Links audits to selected line items)
export const auditScopeLineItems = pgTable("audit_scope_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  lineItemId: varchar("line_item_id").notNull().references(() => supportLineItems.id, { onDelete: "cascade" }),
});

export const insertAuditScopeLineItemSchema = createInsertSchema(auditScopeLineItems).omit({
  id: true,
});

export type InsertAuditScopeLineItem = z.infer<typeof insertAuditScopeLineItemSchema>;
export type AuditScopeLineItem = typeof auditScopeLineItems.$inferSelect;

// Audit Sites (Locations being audited for multi-site audits)
export const auditSites = pgTable("audit_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  siteName: text("site_name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postcode: text("postcode"),
  isPrimarySite: boolean("is_primary_site").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditSiteSchema = createInsertSchema(auditSites).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditSite = z.infer<typeof insertAuditSiteSchema>;
export type AuditSite = typeof auditSites.$inferSelect;

// Audit Domains (Tenant-scoped domain definitions)
export const auditDomainCodeEnum = ["STAFF_PERSONNEL", "GOV_POLICY", "OPERATIONAL", "SITE_ENVIRONMENT"] as const;

// Standard Indicators Library (Global - not tenant-scoped)
export const standardIndicators = pgTable("standard_indicators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domainCode: text("domain_code", { enum: auditDomainCodeEnum }).notNull(),
  category: text("category").notNull(),
  indicatorText: text("indicator_text").notNull(),
  guidanceText: text("guidance_text"),
  evidenceRequirements: text("evidence_requirements"),
  riskLevel: text("risk_level", { enum: riskLevelEnum }).notNull().default("MEDIUM"),
  isCriticalControl: boolean("is_critical_control").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStandardIndicatorSchema = createInsertSchema(standardIndicators).omit({
  id: true,
  createdAt: true,
});

export type InsertStandardIndicator = z.infer<typeof insertStandardIndicatorSchema>;
export type StandardIndicator = typeof standardIndicators.$inferSelect;

export const auditDomains = pgTable("audit_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  code: text("code", { enum: auditDomainCodeEnum }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isEnabledByDefault: boolean("is_enabled_by_default").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertAuditDomainSchema = createInsertSchema(auditDomains).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditDomain = z.infer<typeof insertAuditDomainSchema>;
export type AuditDomain = typeof auditDomains.$inferSelect;

// Audit Scope Domains (Links audits to included domains)
export const auditScopeDomains = pgTable("audit_scope_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  domainId: varchar("domain_id").notNull().references(() => auditDomains.id, { onDelete: "cascade" }),
  isIncluded: boolean("is_included").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertAuditScopeDomainSchema = createInsertSchema(auditScopeDomains).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditScopeDomain = z.infer<typeof insertAuditScopeDomainSchema>;
export type AuditScopeDomain = typeof auditScopeDomains.$inferSelect;

// Audit Templates (Tenant-scoped)
export const auditTemplates = pgTable("audit_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditTemplateSchema = createInsertSchema(auditTemplates).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditTemplate = z.infer<typeof insertAuditTemplateSchema>;
export type AuditTemplate = typeof auditTemplates.$inferSelect;

// Audit Template Indicators
export const auditTemplateIndicators = pgTable("audit_template_indicators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => auditTemplates.id, { onDelete: "cascade" }),
  indicatorText: text("indicator_text").notNull(),
  guidanceText: text("guidance_text"),
  evidenceRequirements: text("evidence_requirements"),
  riskLevel: text("risk_level", { enum: riskLevelEnum }).notNull().default("MEDIUM"),
  isCriticalControl: boolean("is_critical_control").notNull().default(false),
  auditDomainCode: text("audit_domain_code", { enum: auditDomainCodeEnum }),
  // NDIS Practice Standards Division for report grouping
  ndisDivision: text("ndis_division", { enum: ndisDivisionEnum }),
  ndisStandardNumber: text("ndis_standard_number"),
  ndisStandardName: text("ndis_standard_name"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditTemplateIndicatorSchema = createInsertSchema(auditTemplateIndicators).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditTemplateIndicator = z.infer<typeof insertAuditTemplateIndicatorSchema>;
export type AuditTemplateIndicator = typeof auditTemplateIndicators.$inferSelect;

// Audit Runs (Links audit to selected template)
export const auditRuns = pgTable("audit_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }).unique(),
  templateId: varchar("template_id").notNull().references(() => auditTemplates.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditRunSchema = createInsertSchema(auditRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditRun = z.infer<typeof insertAuditRunSchema>;
export type AuditRun = typeof auditRuns.$inferSelect;

// Audit Indicator Responses
export const auditIndicatorResponses = pgTable("audit_indicator_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  templateIndicatorId: varchar("template_indicator_id").notNull().references(() => auditTemplateIndicators.id, { onDelete: "cascade" }),
  rating: text("rating", { enum: indicatorRatingEnum }).notNull(),
  comment: text("comment"),
  // Narrative findings for report (long-form observation details)
  narrativeFindings: text("narrative_findings"),
  scorePoints: integer("score_points").notNull().default(0),
  scoreVersion: varchar("score_version").notNull().default("v1"),
  status: text("status", { enum: responseStatusEnum }).notNull().default("OPEN"),
  createdByCompanyUserId: varchar("created_by_company_user_id").notNull().references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertAuditIndicatorResponseSchema = createInsertSchema(auditIndicatorResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditIndicatorResponse = z.infer<typeof insertAuditIndicatorResponseSchema>;
export type AuditIndicatorResponse = typeof auditIndicatorResponses.$inferSelect;

// Findings (Auto-generated from non-conformance responses)
export const findings = pgTable("findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  templateIndicatorId: varchar("template_indicator_id").notNull().references(() => auditTemplateIndicators.id, { onDelete: "cascade" }),
  severity: text("severity", { enum: ["MINOR_NC", "MAJOR_NC"] }).notNull(),
  findingText: text("finding_text").notNull(),
  status: text("status", { enum: findingStatusEnum }).notNull().default("OPEN"),
  ownerCompanyUserId: varchar("owner_company_user_id").references(() => companyUsers.id),
  dueDate: timestamp("due_date"),
  closureNote: text("closure_note"),
  closedAt: timestamp("closed_at"),
  closedByCompanyUserId: varchar("closed_by_company_user_id").references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertFindingSchema = createInsertSchema(findings).omit({
  id: true,
  createdAt: true,
});

export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findings.$inferSelect;

// Finding Activity Types for corrective action tracking
export const findingActivityTypeEnum = [
  "CREATED",
  "STATUS_CHANGED",
  "OWNER_ASSIGNED",
  "DUE_DATE_SET",
  "COMMENT_ADDED",
  "EVIDENCE_REQUESTED",
  "EVIDENCE_SUBMITTED",
  "EVIDENCE_REVIEWED",
  "CLOSURE_INITIATED",
  "CLOSED",
  "REOPENED",
] as const;

export type FindingActivityType = typeof findingActivityTypeEnum[number];

// Finding Activities (Audit trail for corrective action journey)
export const findingActivities = pgTable("finding_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  findingId: varchar("finding_id").notNull().references(() => findings.id, { onDelete: "cascade" }),
  activityType: text("activity_type", { enum: findingActivityTypeEnum }).notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  comment: text("comment"),
  performedByCompanyUserId: varchar("performed_by_company_user_id").references(() => companyUsers.id),
  evidenceRequestId: varchar("evidence_request_id"),
  evidenceItemId: varchar("evidence_item_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFindingActivitySchema = createInsertSchema(findingActivities).omit({
  id: true,
  createdAt: true,
});

export type InsertFindingActivity = z.infer<typeof insertFindingActivitySchema>;
export type FindingActivity = typeof findingActivities.$inferSelect;

// Finding Closure Evidence (Links evidence items to finding closures)
export const findingClosureEvidence = pgTable("finding_closure_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  findingId: varchar("finding_id").notNull().references(() => findings.id, { onDelete: "cascade" }),
  evidenceItemId: varchar("evidence_item_id").notNull(),
  addedByCompanyUserId: varchar("added_by_company_user_id").references(() => companyUsers.id),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFindingClosureEvidenceSchema = createInsertSchema(findingClosureEvidence).omit({
  id: true,
  createdAt: true,
});

export type InsertFindingClosureEvidence = z.infer<typeof insertFindingClosureEvidenceSchema>;
export type FindingClosureEvidence = typeof findingClosureEvidence.$inferSelect;

// Evidence Requests - flexible linking for different contexts:
// auditId + no findingId = audit-linked evidence request (pre-finding)
// auditId + findingId = finding remediation
// Neither = standalone document request
export const evidenceRequests = pgTable("evidence_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").references(() => audits.id, { onDelete: "cascade" }),
  findingId: varchar("finding_id").references(() => findings.id, { onDelete: "cascade" }),
  templateIndicatorId: varchar("template_indicator_id").references(() => auditTemplateIndicators.id),
  evidenceType: text("evidence_type", { enum: evidenceTypeEnum }).notNull(),
  requestNote: text("request_note").notNull(),
  status: text("status", { enum: evidenceStatusEnum }).notNull().default("REQUESTED"),
  dueDate: timestamp("due_date"),
  publicToken: varchar("public_token").unique(),
  requestedByCompanyUserId: varchar("requested_by_company_user_id").notNull().references(() => companyUsers.id),
  reviewedByCompanyUserId: varchar("reviewed_by_company_user_id").references(() => companyUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertEvidenceRequestSchema = createInsertSchema(evidenceRequests).omit({
  id: true,
  createdAt: true,
});

export type InsertEvidenceRequest = z.infer<typeof insertEvidenceRequestSchema>;
export type EvidenceRequest = typeof evidenceRequests.$inferSelect;

// Evidence Items (Submitted evidence for a request)
export const evidenceItems = pgTable("evidence_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  evidenceRequestId: varchar("evidence_request_id").notNull().references(() => evidenceRequests.id, { onDelete: "cascade" }),
  storageKind: text("storage_kind", { enum: storageKindEnum }).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path"),
  externalUrl: text("external_url"),
  mimeType: text("mime_type"),
  fileSizeBytes: integer("file_size_bytes"),
  documentType: text("document_type", { enum: documentTypeEnum }),
  note: text("note"),
  uploadedByCompanyUserId: varchar("uploaded_by_company_user_id").references(() => companyUsers.id),
  externalUploaderName: text("external_uploader_name"),
  externalUploaderEmail: text("external_uploader_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEvidenceItemSchema = createInsertSchema(evidenceItems).omit({
  id: true,
  createdAt: true,
});

export type InsertEvidenceItem = z.infer<typeof insertEvidenceItemSchema>;
export type EvidenceItem = typeof evidenceItems.$inferSelect;

// Document Checklist Templates (global templates per document type)
export const documentChecklistTemplates = pgTable("document_checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: text("document_type", { enum: documentTypeEnum }).notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDocumentChecklistTemplateSchema = createInsertSchema(documentChecklistTemplates).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumentChecklistTemplate = z.infer<typeof insertDocumentChecklistTemplateSchema>;
export type DocumentChecklistTemplate = typeof documentChecklistTemplates.$inferSelect;

// Document Checklist Items (items within a checklist template)
export const documentChecklistItems = pgTable("document_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => documentChecklistTemplates.id, { onDelete: "cascade" }),
  section: text("section", { enum: checklistSectionEnum }).notNull(),
  itemKey: text("item_key").notNull(),
  itemText: text("item_text").notNull(),
  isCritical: boolean("is_critical").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertDocumentChecklistItemSchema = createInsertSchema(documentChecklistItems).omit({
  id: true,
});

export type InsertDocumentChecklistItem = z.infer<typeof insertDocumentChecklistItemSchema>;
export type DocumentChecklistItem = typeof documentChecklistItems.$inferSelect;

// Document Reviews (auditor review of submitted evidence)
export const documentReviews = pgTable("document_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").references(() => audits.id, { onDelete: "cascade" }),
  evidenceRequestId: varchar("evidence_request_id").notNull().references(() => evidenceRequests.id, { onDelete: "cascade" }),
  evidenceItemId: varchar("evidence_item_id").notNull().references(() => evidenceItems.id, { onDelete: "cascade" }),
  checklistTemplateId: varchar("checklist_template_id").notNull().references(() => documentChecklistTemplates.id),
  reviewerCompanyUserId: varchar("reviewer_company_user_id").notNull().references(() => companyUsers.id),
  responses: json("responses").$type<{ itemId: string; response: "YES" | "NO" | "PARTLY" | "NA" }[]>().notNull(),
  dqsPercent: integer("dqs_percent").notNull(),
  criticalFailuresCount: integer("critical_failures_count").notNull().default(0),
  decision: text("decision", { enum: reviewDecisionEnum }).notNull(),
  justification: text("justification"),
  comments: text("comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDocumentReviewSchema = createInsertSchema(documentReviews).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumentReview = z.infer<typeof insertDocumentReviewSchema>;
export type DocumentReview = typeof documentReviews.$inferSelect;

// Suggested Findings (non-binding suggestions based on document review)
const suggestedFindingTypeEnum = ["MINOR_NC", "MAJOR_NC", "NONE"] as const;
const severityFlagEnum = ["LOW", "MEDIUM", "HIGH"] as const;
const suggestionStatusEnum = ["PENDING", "CONFIRMED", "DISMISSED"] as const;

export const suggestedFindings = pgTable("suggested_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  indicatorResponseId: varchar("indicator_response_id").references(() => auditIndicatorResponses.id, { onDelete: "cascade" }),
  evidenceRequestId: varchar("evidence_request_id").notNull().references(() => evidenceRequests.id, { onDelete: "cascade" }),
  documentReviewId: varchar("document_review_id").notNull().references(() => documentReviews.id, { onDelete: "cascade" }),
  suggestedType: text("suggested_type", { enum: suggestedFindingTypeEnum }).notNull(),
  severityFlag: text("severity_flag", { enum: severityFlagEnum }),
  rationaleText: text("rationale_text").notNull(),
  status: text("status", { enum: suggestionStatusEnum }).notNull().default("PENDING"),
  confirmedFindingId: varchar("confirmed_finding_id").references(() => findings.id, { onDelete: "set null" }),
  dismissedByUserId: varchar("dismissed_by_user_id").references(() => companyUsers.id),
  dismissedReason: text("dismissed_reason"),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSuggestedFindingSchema = createInsertSchema(suggestedFindings).omit({
  id: true,
  createdAt: true,
});

export type InsertSuggestedFinding = z.infer<typeof insertSuggestedFindingSchema>;
export type SuggestedFinding = typeof suggestedFindings.$inferSelect;

// Audit Interviews (tracking participant/staff interviews for reports)
export const auditInterviews = pgTable("audit_interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  interviewType: text("interview_type", { enum: interviewTypeEnum }).notNull(),
  interviewMethod: text("interview_method", { enum: interviewMethodEnum }).notNull(),
  intervieweeName: text("interviewee_name"),
  intervieweeRole: text("interviewee_role"),
  siteLocation: text("site_location"),
  interviewDate: timestamp("interview_date"),
  keyQuotes: text("key_quotes"),
  notes: text("notes"),
  feedbackPositive: text("feedback_positive"),
  feedbackConcerns: text("feedback_concerns"),
  // Participant Feedback Checklist (what was confirmed during interview)
  feedbackChecklist: json("feedback_checklist").$type<{ item: string; checked: boolean; partial?: boolean }[]>(),
  conductedByCompanyUserId: varchar("conducted_by_company_user_id").references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditInterviewSchema = createInsertSchema(auditInterviews).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditInterview = z.infer<typeof insertAuditInterviewSchema>;
export type AuditInterview = typeof auditInterviews.$inferSelect;

// Audit Site Visits (tracking site observations for reports)
export const auditSiteVisits = pgTable("audit_site_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  siteName: text("site_name").notNull(),
  siteAddress: text("site_address"),
  visitDate: timestamp("visit_date"),
  ndisGroupsWitnessed: text("ndis_groups_witnessed").array(),
  participantsAtSite: integer("participants_at_site"),
  filesReviewedCount: integer("files_reviewed_count"),
  observationsPositive: text("observations_positive"),
  observationsConcerns: text("observations_concerns"),
  safetyItemsChecked: json("safety_items_checked").$type<{ item: string; checked: boolean }[]>(),
  // Document Checklist (what documents were reviewed during visit)
  documentChecklist: json("document_checklist").$type<{ item: string; checked: boolean; partial?: boolean }[]>(),
  notes: text("notes"),
  conductedByCompanyUserId: varchar("conducted_by_company_user_id").references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditSiteVisitSchema = createInsertSchema(auditSiteVisits).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditSiteVisit = z.infer<typeof insertAuditSiteVisitSchema>;
export type AuditSiteVisit = typeof auditSiteVisits.$inferSelect;

// Chat schema (for AI integrations)
export * from "./models/chat";
