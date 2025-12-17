import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, json } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
