import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, json, integer } from "drizzle-orm/pg-core";
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
export const indicatorRatingEnum = ["CONFORMANCE", "OBSERVATION", "MINOR_NC", "MAJOR_NC"] as const;
export const findingStatusEnum = ["OPEN", "UNDER_REVIEW", "CLOSED"] as const;
export const serviceContextEnum = ["SIL", "COMMUNITY_ACCESS", "IN_HOME", "CENTRE_BASED", "OTHER"] as const;
export const riskLevelEnum = ["LOW", "MEDIUM", "HIGH"] as const;
export const responseStatusEnum = ["OPEN", "CLOSED"] as const;

// Sprint 4: Evidence enums
export const evidenceStatusEnum = ["REQUESTED", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"] as const;
export const evidenceTypeEnum = [
  "POLICY",
  "PROCEDURE", 
  "TRAINING_RECORD",
  "INCIDENT_REPORT",
  "CASE_NOTE",
  "MEDICATION_RECORD",
  "BSP",
  "RISK_ASSESSMENT",
  "ROSTER",
  "OTHER"
] as const;
export const storageKindEnum = ["UPLOAD", "LINK"] as const;

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

// Evidence Requests (One per finding)
export const evidenceRequests = pgTable("evidence_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  auditId: varchar("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  findingId: varchar("finding_id").notNull().references(() => findings.id, { onDelete: "cascade" }).unique(),
  indicatorId: varchar("indicator_id").notNull().references(() => auditTemplateIndicators.id, { onDelete: "cascade" }),
  requestedEvidenceTypes: json("requested_evidence_types").$type<(typeof evidenceTypeEnum)[number][]>().notNull(),
  requestNote: text("request_note"),
  status: text("status", { enum: evidenceStatusEnum }).notNull().default("REQUESTED"),
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
  evidenceType: text("evidence_type", { enum: evidenceTypeEnum }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  storageKind: text("storage_kind", { enum: storageKindEnum }).notNull(),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileMime: text("file_mime"),
  fileSize: integer("file_size"),
  externalLink: text("external_link"),
  submittedByCompanyUserId: varchar("submitted_by_company_user_id").notNull().references(() => companyUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEvidenceItemSchema = createInsertSchema(evidenceItems).omit({
  id: true,
  createdAt: true,
});

export type InsertEvidenceItem = z.infer<typeof insertEvidenceItemSchema>;
export type EvidenceItem = typeof evidenceItems.$inferSelect;
