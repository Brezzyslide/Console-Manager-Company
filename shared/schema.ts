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
