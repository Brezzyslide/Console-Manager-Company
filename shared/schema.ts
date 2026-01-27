import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, json, jsonb, integer, uniqueIndex } from "drizzle-orm/pg-core";
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
  code: varchar("code", { length: 10 }).unique(),
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
  // Lead auditor approval workflow
  submittedForReviewAt: timestamp("submitted_for_review_at"),
  submittedForReviewByUserId: varchar("submitted_for_review_by_user_id").references(() => companyUsers.id),
  approvedAt: timestamp("approved_at"),
  approvedByUserId: varchar("approved_by_user_id").references(() => companyUsers.id),
  reviewNotes: text("review_notes"),
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
  // Lead auditor review comment (for non-conformances)
  leadAuditorReviewComment: text("lead_auditor_review_comment"),
  leadAuditorReviewedByUserId: varchar("lead_auditor_reviewed_by_user_id").references(() => companyUsers.id),
  leadAuditorReviewedAt: timestamp("lead_auditor_reviewed_at"),
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
  status: text("status", { enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] }).notNull().default("SCHEDULED"),
  completedAt: timestamp("completed_at"),
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
  status: text("status", { enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] }).notNull().default("SCHEDULED"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditSiteVisitSchema = createInsertSchema(auditSiteVisits).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditSiteVisit = z.infer<typeof insertAuditSiteVisitSchema>;
export type AuditSiteVisit = typeof auditSiteVisits.$inferSelect;

// Audit Evidence Portals (password-protected bulk upload links)
export const auditEvidencePortals = pgTable("audit_evidence_portals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdByCompanyUserId: varchar("created_by_company_user_id").notNull().references(() => companyUsers.id),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditEvidencePortalSchema = createInsertSchema(auditEvidencePortals).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditEvidencePortal = z.infer<typeof insertAuditEvidencePortalSchema>;
export type AuditEvidencePortal = typeof auditEvidencePortals.$inferSelect;

// General Evidence Submissions (unsolicited evidence uploaded via portal)
export const generalEvidenceSubmissions = pgTable("general_evidence_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  portalId: varchar("portal_id").notNull().references(() => auditEvidencePortals.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path"),
  mimeType: text("mime_type"),
  fileSizeBytes: integer("file_size_bytes"),
  uploaderName: text("uploader_name"),
  uploaderEmail: text("uploader_email"),
  status: text("status", { enum: ["PENDING_REVIEW", "ACCEPTED", "REJECTED"] }).notNull().default("PENDING_REVIEW"),
  reviewedByCompanyUserId: varchar("reviewed_by_company_user_id").references(() => companyUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGeneralEvidenceSubmissionSchema = createInsertSchema(generalEvidenceSubmissions).omit({
  id: true,
  createdAt: true,
});

export type InsertGeneralEvidenceSubmission = z.infer<typeof insertGeneralEvidenceSubmissionSchema>;
export type GeneralEvidenceSubmission = typeof generalEvidenceSubmissions.$inferSelect;

// Chat schema (for AI integrations)
export * from "./models/chat";

// ============================================================
// COMPLIANCE REVIEW SYSTEM (Phase 1)
// ============================================================

// Compliance Enums (defined as type literals for use in text() columns)
export const complianceScopeTypes = ["SITE", "PARTICIPANT"] as const;
export type ComplianceScopeType = typeof complianceScopeTypes[number];

export const complianceFrequencies = ["DAILY", "WEEKLY"] as const;
export type ComplianceFrequency = typeof complianceFrequencies[number];

export const complianceRunStatuses = ["OPEN", "SUBMITTED", "LOCKED"] as const;
export type ComplianceRunStatus = typeof complianceRunStatuses[number];

export const complianceResponseTypes = ["YES_NO_NA", "NUMBER", "TEXT", "PHOTO_REQUIRED"] as const;
export type ComplianceResponseType = typeof complianceResponseTypes[number];

export const evidenceSourceTypes = ["MANUAL", "EXTERNAL_SIGNAL"] as const;
export type EvidenceSourceType = typeof evidenceSourceTypes[number];

export const complianceActionSeverities = ["LOW", "MEDIUM", "HIGH"] as const;
export type ComplianceActionSeverity = typeof complianceActionSeverities[number];

export const complianceActionStatuses = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;
export type ComplianceActionStatus = typeof complianceActionStatuses[number];

// Work Sites (tenant-scoped locations)
export const workSites = pgTable("work_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  addressLine1: text("address_line_1"),
  suburb: text("suburb"),
  state: text("state"),
  postcode: text("postcode"),
  siteType: text("site_type"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertWorkSiteSchema = createInsertSchema(workSites).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkSite = z.infer<typeof insertWorkSiteSchema>;
export type WorkSite = typeof workSites.$inferSelect;

// Participants (tenant-scoped NDIS participants)
export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  displayName: text("display_name"),
  ndisNumber: text("ndis_number"),
  dob: timestamp("dob"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  primarySiteId: varchar("primary_site_id").references(() => workSites.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  createdAt: true,
});

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

// Participant Site Assignments (many-to-many relationship)
export const participantSiteAssignments = pgTable("participant_site_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").notNull().references(() => workSites.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertParticipantSiteAssignmentSchema = createInsertSchema(participantSiteAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertParticipantSiteAssignment = z.infer<typeof insertParticipantSiteAssignmentSchema>;
export type ParticipantSiteAssignment = typeof participantSiteAssignments.$inferSelect;

// Compliance Templates (tenant-scoped check templates)
export const complianceTemplates = pgTable("compliance_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  scopeType: text("scope_type", { enum: complianceScopeTypes }).notNull(),
  frequency: text("frequency", { enum: complianceFrequencies }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  appliesToSiteTypes: json("applies_to_site_types").$type<string[] | null>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertComplianceTemplateSchema = createInsertSchema(complianceTemplates).omit({
  id: true,
  createdAt: true,
});

export type InsertComplianceTemplate = z.infer<typeof insertComplianceTemplateSchema>;
export type ComplianceTemplate = typeof complianceTemplates.$inferSelect;

// Compliance Template Items (checklist items within a template)
export const complianceTemplateItems = pgTable("compliance_template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => complianceTemplates.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  title: text("title").notNull(),
  guidanceText: text("guidance_text"),
  responseType: text("response_type", { enum: complianceResponseTypes }).notNull().default("YES_NO_NA"),
  isCritical: boolean("is_critical").notNull().default(false),
  defaultEvidenceRequired: boolean("default_evidence_required").notNull().default(false),
  evidenceSourceType: text("evidence_source_type", { enum: evidenceSourceTypes }).notNull().default("MANUAL"),
  externalSignalKey: text("external_signal_key"),
  notesRequiredOnFail: boolean("notes_required_on_fail").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertComplianceTemplateItemSchema = createInsertSchema(complianceTemplateItems).omit({
  id: true,
  createdAt: true,
});

export type InsertComplianceTemplateItem = z.infer<typeof insertComplianceTemplateItemSchema>;
export type ComplianceTemplateItem = typeof complianceTemplateItems.$inferSelect;

// Compliance Runs (instances of running a compliance check)
export const complianceRuns = pgTable("compliance_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => complianceTemplates.id, { onDelete: "cascade" }),
  scopeType: text("scope_type", { enum: complianceScopeTypes }).notNull(),
  frequency: text("frequency", { enum: complianceFrequencies }).notNull(),
  siteId: varchar("site_id").references(() => workSites.id),
  participantId: varchar("participant_id").references(() => participants.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  status: text("status", { enum: complianceRunStatuses }).notNull().default("OPEN"),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => companyUsers.id),
  submittedByUserId: varchar("submitted_by_user_id").references(() => companyUsers.id),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertComplianceRunSchema = createInsertSchema(complianceRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertComplianceRun = z.infer<typeof insertComplianceRunSchema>;
export type ComplianceRun = typeof complianceRuns.$inferSelect;

// Compliance Responses (answers to template items within a run)
export const complianceResponses = pgTable("compliance_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  runId: varchar("run_id").notNull().references(() => complianceRuns.id, { onDelete: "cascade" }),
  templateItemId: varchar("template_item_id").notNull().references(() => complianceTemplateItems.id, { onDelete: "cascade" }),
  responseValue: text("response_value"),
  notes: text("notes"),
  attachmentPath: text("attachment_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertComplianceResponseSchema = createInsertSchema(complianceResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertComplianceResponse = z.infer<typeof insertComplianceResponseSchema>;
export type ComplianceResponse = typeof complianceResponses.$inferSelect;

// Compliance Actions (follow-up items from non-compliant responses)
export const complianceActions = pgTable("compliance_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  runId: varchar("run_id").notNull().references(() => complianceRuns.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").references(() => workSites.id),
  participantId: varchar("participant_id").references(() => participants.id),
  severity: text("severity", { enum: complianceActionSeverities }).notNull().default("MEDIUM"),
  status: text("status", { enum: complianceActionStatuses }).notNull().default("OPEN"),
  title: text("title").notNull(),
  description: text("description"),
  assignedToUserId: varchar("assigned_to_user_id").references(() => companyUsers.id),
  dueAt: timestamp("due_at"),
  closedAt: timestamp("closed_at"),
  closureNotes: text("closure_notes"),
  closureAttachmentPath: text("closure_attachment_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertComplianceActionSchema = createInsertSchema(complianceActions).omit({
  id: true,
  createdAt: true,
});

export type InsertComplianceAction = z.infer<typeof insertComplianceActionSchema>;
export type ComplianceAction = typeof complianceActions.$inferSelect;

// Staff Site Assignments (which staff can access which sites)
export const staffSiteAssignments = pgTable("staff_site_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => companyUsers.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").notNull().references(() => workSites.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("staff_site_assignments_unique").on(t.companyId, t.userId, t.siteId),
]);

export const insertStaffSiteAssignmentSchema = createInsertSchema(staffSiteAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffSiteAssignment = z.infer<typeof insertStaffSiteAssignmentSchema>;
export type StaffSiteAssignment = typeof staffSiteAssignments.$inferSelect;

// Staff Participant Assignments (which staff can access which participants)
export const staffParticipantAssignments = pgTable("staff_participant_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => companyUsers.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("staff_participant_assignments_unique").on(t.companyId, t.userId, t.participantId),
]);

export const insertStaffParticipantAssignmentSchema = createInsertSchema(staffParticipantAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffParticipantAssignment = z.infer<typeof insertStaffParticipantAssignmentSchema>;
export type StaffParticipantAssignment = typeof staffParticipantAssignments.$inferSelect;

// Weekly Compliance Reports (AI-generated or manual summaries)
export const weeklyReportStatuses = ["DRAFT", "FINAL"] as const;
export const weeklyReportGenerationSources = ["AI", "MANUAL"] as const;

export const weeklyComplianceReports = pgTable("weekly_compliance_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").references(() => workSites.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  generatedByUserId: varchar("generated_by_user_id").notNull().references(() => companyUsers.id),
  generationSource: text("generation_source", { enum: weeklyReportGenerationSources }).notNull().default("AI"),
  reportStatus: text("report_status", { enum: weeklyReportStatuses }).notNull().default("DRAFT"),
  reportText: text("report_text").notNull(),
  metricsJson: jsonb("metrics_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertWeeklyComplianceReportSchema = createInsertSchema(weeklyComplianceReports).omit({
  id: true,
  createdAt: true,
});

export type InsertWeeklyComplianceReport = z.infer<typeof insertWeeklyComplianceReportSchema>;
export type WeeklyComplianceReport = typeof weeklyComplianceReports.$inferSelect;

// AI Generation Logs (traceability for AI-generated content)
export const aiGenerationLogs = pgTable("ai_generation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  featureKey: text("feature_key").notNull(),
  userId: varchar("user_id").notNull().references(() => companyUsers.id),
  participantId: varchar("participant_id").references(() => participants.id),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  inputHash: text("input_hash").notNull(),
  modelName: text("model_name").notNull(),
  promptVersion: text("prompt_version").notNull(),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiGenerationLogSchema = createInsertSchema(aiGenerationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAiGenerationLog = z.infer<typeof insertAiGenerationLogSchema>;
export type AiGenerationLog = typeof aiGenerationLogs.$inferSelect;

// Restrictive Practice Types (catalog)
export const restrictivePracticeTypes = [
  "PHYSICAL_RESTRAINT",
  "MECHANICAL_RESTRAINT", 
  "CHEMICAL_RESTRAINT",
  "SECLUSION",
  "ENVIRONMENTAL_RESTRAINT",
] as const;

export const authorizationStatuses = ["PENDING", "APPROVED", "EXPIRED", "REVOKED"] as const;

// Restrictive Practice Authorizations (per participant)
export const restrictivePracticeAuthorizations = pgTable("restrictive_practice_authorizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  practiceType: text("practice_type", { enum: restrictivePracticeTypes }).notNull(),
  authorizationStatus: text("authorization_status", { enum: authorizationStatuses }).notNull().default("PENDING"),
  approvedByUserId: varchar("approved_by_user_id").references(() => companyUsers.id),
  approvalDate: timestamp("approval_date"),
  expiryDate: timestamp("expiry_date"),
  behaviorSupportPlanRef: text("behavior_support_plan_ref"),
  conditionsOfUse: text("conditions_of_use"),
  reviewFrequencyDays: integer("review_frequency_days").default(90),
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertRestrictivePracticeAuthorizationSchema = createInsertSchema(restrictivePracticeAuthorizations).omit({
  id: true,
  createdAt: true,
});

export type InsertRestrictivePracticeAuthorization = z.infer<typeof insertRestrictivePracticeAuthorizationSchema>;
export type RestrictivePracticeAuthorization = typeof restrictivePracticeAuthorizations.$inferSelect;

// Restrictive Practice Usage Logs (event-driven logging)
export const restrictivePracticeUsageLogs = pgTable("restrictive_practice_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  authorizationId: varchar("authorization_id").references(() => restrictivePracticeAuthorizations.id),
  practiceType: text("practice_type", { enum: restrictivePracticeTypes }).notNull(),
  isAuthorized: boolean("is_authorized").notNull().default(true),
  unauthorizedReason: text("unauthorized_reason"),
  usageDate: timestamp("usage_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  reason: text("reason").notNull(),
  deescalationAttempts: text("deescalation_attempts"),
  outcome: text("outcome"),
  witnessName: text("witness_name"),
  reportedByUserId: varchar("reported_by_user_id").notNull().references(() => companyUsers.id),
  incidentLinked: boolean("incident_linked").default(false),
  incidentReference: text("incident_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRestrictivePracticeUsageLogSchema = createInsertSchema(restrictivePracticeUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertRestrictivePracticeUsageLog = z.infer<typeof insertRestrictivePracticeUsageLogSchema>;
export type RestrictivePracticeUsageLog = typeof restrictivePracticeUsageLogs.$inferSelect;

// ============================================================================
// REGISTER MODULE
// ============================================================================

// Evacuation Drill Register
export const evacuationDrillTypes = ["FIRE", "BOMB_THREAT", "OTHER"] as const;
export type EvacuationDrillType = typeof evacuationDrillTypes[number];

export const participantNotInvolvedReasons = ["DYSREGULATED", "NOT_INTERESTED", "DISENGAGED_FROM_SUPPORT", "NOT_MOTIVATED", "OTHER"] as const;
export type ParticipantNotInvolvedReason = typeof participantNotInvolvedReasons[number];

export const involvementRatings = ["SATISFACTORY", "NOT_SATISFACTORY", "REFUSED_TO_PARTICIPATE"] as const;
export type InvolvementRating = typeof involvementRatings[number];

export const evacuationDrillRegister = pgTable("evacuation_drill_register", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  dateOfDrill: timestamp("date_of_drill").notNull(),
  siteId: varchar("site_id").notNull().references(() => workSites.id, { onDelete: "cascade" }),
  drillType: text("drill_type", { enum: evacuationDrillTypes }).notNull().default("FIRE"),
  assemblyPoint: text("assembly_point"),
  wardenFirstName: text("warden_first_name").notNull(),
  wardenLastName: text("warden_last_name").notNull(),
  totalPeoplePresent: integer("total_people_present").notNull(),
  staffInitialsPresent: text("staff_initials_present").notNull(),
  clientInitialsPresent: text("client_initials_present").notNull(),
  participantActivelyInvolved: boolean("participant_actively_involved").notNull(),
  ifNotInvolvedReason: text("if_not_involved_reason", { enum: participantNotInvolvedReasons }),
  ifNotInvolvedOtherText: text("if_not_involved_other_text"),
  involvementRating: text("involvement_rating", { enum: involvementRatings }).notNull(),
  improvementNotes: text("improvement_notes").notNull(),
  attachments: jsonb("attachments"),
  completedByUserId: varchar("completed_by_user_id").notNull().references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertEvacuationDrillRegisterSchema = createInsertSchema(evacuationDrillRegister).omit({
  id: true,
  createdAt: true,
});

export type InsertEvacuationDrillRegister = z.infer<typeof insertEvacuationDrillRegisterSchema>;
export type EvacuationDrillRegister = typeof evacuationDrillRegister.$inferSelect;

// Complaints Register
export const complainantTypes = ["PARTICIPANT", "FAMILY", "NOMINEE_GUARDIAN", "ADVOCATE", "STAFF", "COMMUNITY", "ANONYMOUS", "OTHER"] as const;
export type ComplainantType = typeof complainantTypes[number];

export const complaintCategories = [
  "SERVICE_DELIVERY", "STAFF_CONDUCT", "MEDICATION", "RESTRICTIVE_PRACTICE", "SAFETY_ENVIRONMENT",
  "PRIVACY_CONFIDENTIALITY", "FEES_BILLING", "COMMUNICATION", "RIGHTS_AND_DIGNITY", "OTHER"
] as const;
export type ComplaintCategory = typeof complaintCategories[number];

export const complaintStatuses = ["IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type ComplaintStatus = typeof complaintStatuses[number];

export const closureSatisfactions = ["SATISFIED", "DISSATISFIED"] as const;
export type ClosureSatisfaction = typeof closureSatisfactions[number];

export const externalNotificationBodies = [
  "POLICE", "NDIS_COMMISSION", "SENIOR_PRACTITIONER", "OPA_GUARDIANSHIP", "DHHS_CHILD_PROTECTION",
  "WORKSAFE", "OMBUDSMAN", "PUBLIC_HEALTH", "OTHER"
] as const;
export type ExternalNotificationBody = typeof externalNotificationBodies[number];

export const complaintsRegister = pgTable("complaints_register", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  receivedAt: timestamp("received_at").notNull(),
  siteId: varchar("site_id").references(() => workSites.id),
  participantId: varchar("participant_id").references(() => participants.id),
  complainantType: text("complainant_type", { enum: complainantTypes }).notNull(),
  complainantName: text("complainant_name"),
  complainantContact: text("complainant_contact"),
  relationshipToParticipant: text("relationship_to_participant"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  category: text("category", { enum: complaintCategories }).notNull(),
  description: text("description").notNull(),
  immediateRisk: boolean("immediate_risk").notNull().default(false),
  immediateActionsTaken: text("immediate_actions_taken"),
  status: text("status", { enum: complaintStatuses }).notNull().default("IN_PROGRESS"),
  acknowledgedAt: timestamp("acknowledged_at"),
  investigatorUserId: varchar("investigator_user_id").references(() => companyUsers.id),
  actionsSummary: text("actions_summary"),
  outcomeSummary: text("outcome_summary"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  closureSatisfaction: text("closure_satisfaction", { enum: closureSatisfactions }),
  closureNotes: text("closure_notes"),
  externalNotificationRequired: boolean("external_notification_required").notNull().default(false),
  externalBodies: jsonb("external_bodies"),
  externalOtherBodyText: text("external_other_body_text"),
  externalNotifiedAt: timestamp("external_notified_at"),
  externalReferenceNumber: text("external_reference_number"),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertComplaintsRegisterSchema = createInsertSchema(complaintsRegister).omit({
  id: true,
  createdAt: true,
});

export type InsertComplaintsRegister = z.infer<typeof insertComplaintsRegisterSchema>;
export type ComplaintsRegister = typeof complaintsRegister.$inferSelect;

// ============================================================================
// GOVERNANCE REGISTERS
// ============================================================================

// Risk Register
export const riskCategories = [
  "SAFETY", "CLINICAL", "MEDICATION", "BEHAVIOUR", "WORKFORCE", "GOVERNANCE",
  "INFORMATION_PRIVACY", "FINANCIAL", "ENVIRONMENTAL", "OTHER"
] as const;
export type RiskCategory = typeof riskCategories[number];

export const riskScopeTypes = ["ORGANISATIONAL", "SITE", "PARTICIPANT"] as const;
export type RiskScopeType = typeof riskScopeTypes[number];

export const riskLevels = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskLevel = typeof riskLevels[number];

export const riskRatings = ["LOW", "MEDIUM", "HIGH", "EXTREME"] as const;
export type RiskRating = typeof riskRatings[number];

export const riskReviewFrequencies = ["MONTHLY", "QUARTERLY", "ANNUAL"] as const;
export type RiskReviewFrequency = typeof riskReviewFrequencies[number];

export const riskStatuses = ["OPEN", "MITIGATING", "ACCEPTED", "CLOSED"] as const;
export type RiskStatus = typeof riskStatuses[number];

export const riskRegister = pgTable("risk_register", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  riskTitle: text("risk_title").notNull(),
  riskDescription: text("risk_description").notNull(),
  riskCategory: text("risk_category", { enum: riskCategories }).notNull(),
  scopeType: text("scope_type", { enum: riskScopeTypes }).notNull(),
  siteId: varchar("site_id").references(() => workSites.id),
  participantId: varchar("participant_id").references(() => participants.id),
  likelihood: text("likelihood", { enum: riskLevels }).notNull(),
  consequence: text("consequence", { enum: riskLevels }).notNull(),
  riskRating: text("risk_rating", { enum: riskRatings }).notNull(),
  existingControls: text("existing_controls").notNull(),
  additionalControlsRequired: text("additional_controls_required"),
  ownerUserId: varchar("owner_user_id").notNull().references(() => companyUsers.id),
  reviewFrequency: text("review_frequency", { enum: riskReviewFrequencies }).notNull(),
  nextReviewDate: timestamp("next_review_date").notNull(),
  status: text("status", { enum: riskStatuses }).notNull().default("OPEN"),
  closureNotes: text("closure_notes"),
  closedAt: timestamp("closed_at"),
  closedByUserId: varchar("closed_by_user_id").references(() => companyUsers.id),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertRiskRegisterSchema = createInsertSchema(riskRegister).omit({
  id: true,
  createdAt: true,
});

export type InsertRiskRegister = z.infer<typeof insertRiskRegisterSchema>;
export type RiskRegister = typeof riskRegister.$inferSelect;

// Continuous Improvement Register
export const improvementSources = [
  "INCIDENT", "COMPLAINT", "AUDIT", "SELF_ASSESSMENT", "STAFF_FEEDBACK",
  "PARTICIPANT_FEEDBACK", "FAMILY_FEEDBACK", "OTHER"
] as const;
export type ImprovementSource = typeof improvementSources[number];

export const relatedRegisterTypes = ["INCIDENT", "COMPLAINT", "RISK", "AUDIT", "POLICY"] as const;
export type RelatedRegisterType = typeof relatedRegisterTypes[number];

export const improvementStatuses = ["OPEN", "IN_PROGRESS", "COMPLETED"] as const;
export type ImprovementStatus = typeof improvementStatuses[number];

export const continuousImprovementRegister = pgTable("continuous_improvement_register", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  improvementTitle: text("improvement_title").notNull(),
  source: text("source", { enum: improvementSources }).notNull(),
  relatedRegisterType: text("related_register_type", { enum: relatedRegisterTypes }),
  relatedRecordId: varchar("related_record_id"),
  description: text("description").notNull(),
  improvementActions: text("improvement_actions").notNull(),
  responsibleUserId: varchar("responsible_user_id").notNull().references(() => companyUsers.id),
  targetCompletionDate: timestamp("target_completion_date").notNull(),
  status: text("status", { enum: improvementStatuses }).notNull().default("OPEN"),
  outcomeSummary: text("outcome_summary"),
  completedAt: timestamp("completed_at"),
  completedByUserId: varchar("completed_by_user_id").references(() => companyUsers.id),
  evidenceAttachmentIds: jsonb("evidence_attachment_ids"),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertContinuousImprovementRegisterSchema = createInsertSchema(continuousImprovementRegister).omit({
  id: true,
  createdAt: true,
});

export type InsertContinuousImprovementRegister = z.infer<typeof insertContinuousImprovementRegisterSchema>;
export type ContinuousImprovementRegister = typeof continuousImprovementRegister.$inferSelect;

// Policy Update Register
export const policyCategories = [
  "GOVERNANCE", "SAFEGUARDS", "INCIDENT_MANAGEMENT", "MEDICATION",
  "RESTRICTIVE_PRACTICE", "PRIVACY", "WORKFORCE", "EMERGENCY", "OTHER"
] as const;
export type PolicyCategory = typeof policyCategories[number];

export const policyUpdateReasons = [
  "LEGISLATIVE_CHANGE", "INCIDENT", "AUDIT_FINDING", "SCHEDULED_REVIEW", "OTHER"
] as const;
export type PolicyUpdateReason = typeof policyUpdateReasons[number];

export const policyStatuses = ["DRAFT", "APPROVED", "IMPLEMENTED", "ARCHIVED"] as const;
export type PolicyStatus = typeof policyStatuses[number];

export const policyUpdateRegister = pgTable("policy_update_register", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  policyName: text("policy_name").notNull(),
  policyCategory: text("policy_category", { enum: policyCategories }).notNull(),
  version: text("version").notNull(),
  changeSummary: text("change_summary").notNull(),
  reasonForUpdate: text("reason_for_update", { enum: policyUpdateReasons }).notNull(),
  approvalRequired: boolean("approval_required").notNull().default(true),
  approvedByUserId: varchar("approved_by_user_id").references(() => companyUsers.id),
  approvalDate: timestamp("approval_date"),
  effectiveDate: timestamp("effective_date"),
  reviewDueDate: timestamp("review_due_date").notNull(),
  staffNotified: boolean("staff_notified").notNull().default(false),
  implementationNotes: text("implementation_notes"),
  status: text("status", { enum: policyStatuses }).notNull().default("DRAFT"),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertPolicyUpdateRegisterSchema = createInsertSchema(policyUpdateRegister).omit({
  id: true,
  createdAt: true,
});

export type InsertPolicyUpdateRegister = z.infer<typeof insertPolicyUpdateRegisterSchema>;
export type PolicyUpdateRegister = typeof policyUpdateRegister.$inferSelect;

// Legislative Register
export const legislativeJurisdictions = ["FEDERAL", "STATE"] as const;
export type LegislativeJurisdiction = typeof legislativeJurisdictions[number];

export const legislativeApplicability = [
  "ALL_PROVIDERS", "SIL_ONLY", "BEHAVIOUR_SUPPORT", "MEDICATION", "WORKFORCE"
] as const;
export type LegislativeApplicability = typeof legislativeApplicability[number];

export const legislativeStatuses = ["CURRENT", "UNDER_REVIEW", "SUPERSEDED"] as const;
export type LegislativeStatus = typeof legislativeStatuses[number];

export const legislativeRegister = pgTable("legislative_register", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  legislationName: text("legislation_name").notNull(),
  jurisdiction: text("jurisdiction", { enum: legislativeJurisdictions }).notNull(),
  authority: text("authority").notNull(),
  description: text("description").notNull(),
  applicableTo: text("applicable_to", { enum: legislativeApplicability }).notNull(),
  lastReviewedDate: timestamp("last_reviewed_date"),
  reviewNotes: text("review_notes"),
  linkedPolicies: jsonb("linked_policies"),
  status: text("status", { enum: legislativeStatuses }).notNull().default("CURRENT"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertLegislativeRegisterSchema = createInsertSchema(legislativeRegister).omit({
  id: true,
  createdAt: true,
});

export type InsertLegislativeRegister = z.infer<typeof insertLegislativeRegisterSchema>;
export type LegislativeRegister = typeof legislativeRegister.$inferSelect;

// ============ BILLING TABLES ============

// Billing Plans (global, Console-managed)
export const billingPlans = pgTable("billing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  defaultSeatPriceCents: integer("default_seat_price_cents").notNull(),
  currency: text("currency").notNull().default("aud"),
  stripePriceId: text("stripe_price_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertBillingPlanSchema = createInsertSchema(billingPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertBillingPlan = z.infer<typeof insertBillingPlanSchema>;
export type BillingPlan = typeof billingPlans.$inferSelect;

// Billing Tenant (per-company billing profile)
export const billingStatuses = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "INACTIVE"] as const;
export type BillingStatus = typeof billingStatuses[number];

export const billingTenants = pgTable("billing_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().unique().references(() => companies.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  billingStatus: text("billing_status", { enum: billingStatuses }).notNull().default("INACTIVE"),
  currentSeatPriceCents: integer("current_seat_price_cents"),
  currency: text("currency").notNull().default("aud"),
  trialEndsAt: timestamp("trial_ends_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertBillingTenantSchema = createInsertSchema(billingTenants).omit({
  id: true,
  createdAt: true,
});

export type InsertBillingTenant = z.infer<typeof insertBillingTenantSchema>;
export type BillingTenant = typeof billingTenants.$inferSelect;

// Billing Seat Overrides (per-tenant price overrides)
export const billingSeatOverrides = pgTable("billing_seat_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  overrideSeatPriceCents: integer("override_seat_price_cents"),
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBillingSeatOverrideSchema = createInsertSchema(billingSeatOverrides).omit({
  id: true,
  createdAt: true,
});

export type InsertBillingSeatOverride = z.infer<typeof insertBillingSeatOverrideSchema>;
export type BillingSeatOverride = typeof billingSeatOverrides.$inferSelect;

// Billing One-Time Charges
export const oneTimeChargeStatuses = ["DRAFT", "INVOICED", "PAID", "VOID"] as const;
export type OneTimeChargeStatus = typeof oneTimeChargeStatuses[number];

export const billingOneTimeCharges = pgTable("billing_one_time_charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("aud"),
  status: text("status", { enum: oneTimeChargeStatuses }).notNull().default("DRAFT"),
  stripeInvoiceId: text("stripe_invoice_id"),
  stripeInvoiceItemId: text("stripe_invoice_item_id"),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => consoleUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertBillingOneTimeChargeSchema = createInsertSchema(billingOneTimeCharges).omit({
  id: true,
  createdAt: true,
});

export type InsertBillingOneTimeCharge = z.infer<typeof insertBillingOneTimeChargeSchema>;
export type BillingOneTimeCharge = typeof billingOneTimeCharges.$inferSelect;

// Billing Events (audit trail)
export const billingEventTypes = [
  "CUSTOMER_CREATED", "SUBSCRIPTION_CREATED", "SUBSCRIPTION_UPDATED", "SUBSCRIPTION_CANCELED",
  "SEAT_SYNCED", "INVOICE_CREATED", "INVOICE_PAID", "INVOICE_PAYMENT_FAILED",
  "ONE_TIME_CHARGE_CREATED", "SEAT_OVERRIDE_SET", "SEAT_OVERRIDE_REMOVED",
  "WEBHOOK_RECEIVED", "BILLING_STATUS_CHANGED"
] as const;
export type BillingEventType = typeof billingEventTypes[number];

export const billingEvents = pgTable("billing_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  eventType: text("event_type", { enum: billingEventTypes }).notNull(),
  payloadJson: jsonb("payload_json"),
  createdByUserId: varchar("created_by_user_id").references(() => consoleUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBillingEventSchema = createInsertSchema(billingEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertBillingEvent = z.infer<typeof insertBillingEventSchema>;
export type BillingEvent = typeof billingEvents.$inferSelect;

// Contact Enquiries (public landing page)
export const contactEnquiryStatuses = ["NEW", "RESPONDED", "CLOSED"] as const;
export type ContactEnquiryStatus = typeof contactEnquiryStatuses[number];

export const contactEnquiries = pgTable("contact_enquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  organisation: text("organisation").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  source: text("source").notNull().default("landing"),
  status: text("status", { enum: contactEnquiryStatuses }).notNull().default("NEW"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const insertContactEnquirySchema = createInsertSchema(contactEnquiries).omit({
  id: true,
  createdAt: true,
  status: true,
  respondedAt: true,
});

export type InsertContactEnquiry = z.infer<typeof insertContactEnquirySchema>;
export type ContactEnquiry = typeof contactEnquiries.$inferSelect;
