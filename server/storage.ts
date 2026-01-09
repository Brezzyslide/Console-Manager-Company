import { 
  consoleUsers, 
  companies, 
  companyUsers, 
  companyRoles,
  changeLog,
  supportCategories,
  supportLineItems,
  companyServiceSelections,
  companySettings,
  companyDocuments,
  audits,
  auditScopeLineItems,
  auditTemplates,
  auditTemplateIndicators,
  auditRuns,
  auditIndicatorResponses,
  findings,
  evidenceRequests,
  evidenceItems,
  type ConsoleUser, 
  type InsertConsoleUser,
  type Company,
  type InsertCompany,
  type CompanyUser,
  type InsertCompanyUser,
  type CompanyRole,
  type InsertCompanyRole,
  type InsertChangeLog,
  type SupportCategory,
  type InsertSupportCategory,
  type SupportLineItem,
  type InsertSupportLineItem,
  type CompanyServiceSelection,
  type InsertCompanyServiceSelection,
  type CompanySettings,
  type InsertCompanySettings,
  type CompanyDocument,
  type InsertCompanyDocument,
  type Audit,
  type InsertAudit,
  type AuditScopeLineItem,
  type InsertAuditScopeLineItem,
  type AuditTemplate,
  type InsertAuditTemplate,
  type AuditTemplateIndicator,
  type InsertAuditTemplateIndicator,
  type AuditRun,
  type InsertAuditRun,
  type AuditIndicatorResponse,
  type InsertAuditIndicatorResponse,
  type Finding,
  type InsertFinding,
  type EvidenceRequest,
  type InsertEvidenceRequest,
  type EvidenceItem,
  type InsertEvidenceItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, asc, desc, isNull } from "drizzle-orm";

export interface IStorage {
  // Console Users
  getConsoleUser(id: string): Promise<ConsoleUser | undefined>;
  getConsoleUserByEmail(email: string): Promise<ConsoleUser | undefined>;
  createConsoleUser(user: InsertConsoleUser): Promise<ConsoleUser>;
  
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined>;
  
  // Company Users
  createCompanyUser(user: InsertCompanyUser): Promise<CompanyUser>;
  getCompanyUser(id: string): Promise<CompanyUser | undefined>;
  getCompanyUserByEmail(companyId: string, email: string): Promise<CompanyUser | undefined>;
  getCompanyAdmin(companyId: string): Promise<{ email: string; fullName: string } | undefined>;
  getCompanyUsers(companyId: string): Promise<CompanyUser[]>;
  updateCompanyUserPassword(id: string, passwordHash: string): Promise<CompanyUser>;
  updateCompanyUser(id: string, companyId: string, updates: { fullName?: string; role?: "CompanyAdmin" | "Auditor" | "Reviewer" | "StaffReadOnly"; isActive?: boolean }): Promise<CompanyUser>;
  setTempPassword(id: string, companyId: string, tempPasswordHash: string): Promise<CompanyUser>;
  
  // Company Roles
  createCompanyRole(role: InsertCompanyRole): Promise<CompanyRole>;
  getCompanyRoles(companyId: string): Promise<CompanyRole[]>;
  
  // Support Catalogue
  getSupportCategories(): Promise<SupportCategory[]>;
  createSupportCategory(category: InsertSupportCategory): Promise<SupportCategory>;
  getSupportLineItems(): Promise<SupportLineItem[]>;
  getActiveLineItems(): Promise<SupportLineItem[]>;
  getLineItemsByCategory(categoryId: string): Promise<SupportLineItem[]>;
  getLineItemsByCategoryIds(categoryIds: string[]): Promise<SupportLineItem[]>;
  createSupportLineItem(item: InsertSupportLineItem): Promise<SupportLineItem>;
  
  // Company Service Selections
  createCompanyServiceSelections(selections: InsertCompanyServiceSelection[]): Promise<void>;
  getCompanyServiceSelections(companyId: string): Promise<CompanyServiceSelection[]>;
  deleteCompanyServiceSelections(companyId: string): Promise<void>;
  getCompanyServiceSelectionsCount(companyId: string): Promise<number>;
  
  // Company Settings
  getCompanySettings(companyId: string): Promise<CompanySettings | undefined>;
  upsertCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  
  // Company Documents
  getCompanyDocuments(companyId: string): Promise<CompanyDocument[]>;
  getCompanyDocument(id: string, companyId: string): Promise<CompanyDocument | undefined>;
  createCompanyDocument(document: InsertCompanyDocument): Promise<CompanyDocument>;
  updateCompanyDocument(id: string, companyId: string, updates: Partial<InsertCompanyDocument>): Promise<CompanyDocument | undefined>;
  getCompanyDocumentsCount(companyId: string): Promise<number>;
  
  // Onboarding
  updateCompanyOnboardingStatus(companyId: string, status: "not_started" | "in_progress" | "completed", completedAt?: Date): Promise<Company | undefined>;
  
  // Change Log
  logChange(change: InsertChangeLog): Promise<void>;
  getRecentChangeLogs(limit?: number): Promise<any[]>;
  
  // Audits
  createAudit(audit: InsertAudit): Promise<Audit>;
  getAudit(id: string, companyId: string): Promise<Audit | undefined>;
  getAudits(companyId: string, filters?: { status?: string; auditType?: string }): Promise<Audit[]>;
  updateAudit(id: string, companyId: string, updates: Partial<InsertAudit>): Promise<Audit | undefined>;
  
  // Audit Scope Line Items
  getAuditScopeLineItems(auditId: string): Promise<AuditScopeLineItem[]>;
  setAuditScopeLineItems(auditId: string, lineItemIds: string[]): Promise<void>;
  
  // Audit Templates
  createAuditTemplate(template: InsertAuditTemplate): Promise<AuditTemplate>;
  getAuditTemplate(id: string, companyId: string): Promise<AuditTemplate | undefined>;
  getAuditTemplates(companyId: string): Promise<AuditTemplate[]>;
  
  // Audit Template Indicators
  createAuditTemplateIndicator(indicator: InsertAuditTemplateIndicator): Promise<AuditTemplateIndicator>;
  getAuditTemplateIndicators(templateId: string): Promise<AuditTemplateIndicator[]>;
  getAuditTemplateIndicator(id: string): Promise<AuditTemplateIndicator | undefined>;
  
  // Audit Runs
  getAuditRun(auditId: string): Promise<AuditRun | undefined>;
  upsertAuditRun(run: InsertAuditRun): Promise<AuditRun>;
  updateAuditRun(auditId: string, updates: Partial<InsertAuditRun>): Promise<AuditRun | undefined>;
  
  // Audit Indicator Responses
  getAuditIndicatorResponses(auditId: string): Promise<AuditIndicatorResponse[]>;
  getAuditIndicatorResponse(auditId: string, indicatorId: string): Promise<AuditIndicatorResponse | undefined>;
  upsertAuditIndicatorResponse(response: InsertAuditIndicatorResponse): Promise<AuditIndicatorResponse>;
  getAuditOutcomes(companyId: string, filters?: { rating?: string; auditId?: string }): Promise<any[]>;
  
  // Findings
  createFinding(finding: InsertFinding): Promise<Finding>;
  getFinding(id: string, companyId: string): Promise<Finding | undefined>;
  getFindings(companyId: string, filters?: { status?: string; severity?: string; auditId?: string }): Promise<Finding[]>;
  getFindingByAuditAndIndicator(auditId: string, indicatorId: string, companyId: string): Promise<Finding | undefined>;
  updateFinding(id: string, companyId: string, updates: Partial<InsertFinding>): Promise<Finding | undefined>;
  
  // Evidence Requests
  createEvidenceRequest(request: InsertEvidenceRequest): Promise<EvidenceRequest>;
  getEvidenceRequest(id: string, companyId: string): Promise<EvidenceRequest | undefined>;
  getEvidenceRequestByFindingId(findingId: string, companyId: string): Promise<EvidenceRequest | undefined>;
  getEvidenceRequestByPublicToken(token: string): Promise<EvidenceRequest | undefined>;
  getEvidenceRequests(companyId: string, filters?: { status?: string; auditId?: string; standalone?: boolean; findingId?: string }): Promise<EvidenceRequest[]>;
  getEvidenceRequestsByAuditId(auditId: string, companyId: string): Promise<EvidenceRequest[]>;
  updateEvidenceRequest(id: string, companyId: string, updates: Partial<InsertEvidenceRequest>): Promise<EvidenceRequest | undefined>;
  updateEvidenceRequestByToken(token: string, updates: Partial<InsertEvidenceRequest>): Promise<EvidenceRequest | undefined>;
  
  // Evidence Items
  createEvidenceItem(item: InsertEvidenceItem): Promise<EvidenceItem>;
  createEvidenceItemPublic(evidenceRequestId: string, item: Omit<InsertEvidenceItem, 'companyId' | 'evidenceRequestId'>): Promise<EvidenceItem>;
  getEvidenceItems(evidenceRequestId: string, companyId: string): Promise<EvidenceItem[]>;
  getEvidenceItem(id: string, companyId: string): Promise<EvidenceItem | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Console Users
  async getConsoleUser(id: string): Promise<ConsoleUser | undefined> {
    const [user] = await db.select().from(consoleUsers).where(eq(consoleUsers.id, id));
    return user || undefined;
  }

  async getConsoleUserByEmail(email: string): Promise<ConsoleUser | undefined> {
    const [user] = await db.select().from(consoleUsers).where(eq(consoleUsers.email, email.toLowerCase()));
    return user || undefined;
  }

  async createConsoleUser(insertUser: InsertConsoleUser): Promise<ConsoleUser> {
    const [user] = await db
      .insert(consoleUsers)
      .values({
        ...insertUser,
        email: insertUser.email.toLowerCase(),
      })
      .returning();
    return user;
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(companies.createdAt);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({
        ...insertCompany,
        primaryContactEmail: insertCompany.primaryContactEmail.toLowerCase(),
      })
      .returning();
    return company;
  }

  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.primaryContactEmail) {
      updateData.primaryContactEmail = updates.primaryContactEmail.toLowerCase();
    }
    const [company] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  // Company Users
  async createCompanyUser(insertUser: InsertCompanyUser): Promise<CompanyUser> {
    const [user] = await db
      .insert(companyUsers)
      .values({
        ...insertUser,
        email: insertUser.email.toLowerCase(),
      })
      .returning();
    return user;
  }

  async getCompanyUser(id: string): Promise<CompanyUser | undefined> {
    const [user] = await db.select().from(companyUsers).where(eq(companyUsers.id, id));
    return user || undefined;
  }

  async getCompanyUserByEmail(companyId: string, email: string): Promise<CompanyUser | undefined> {
    const [user] = await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.email, email.toLowerCase())
        )
      );
    return user || undefined;
  }

  async getCompanyAdmin(companyId: string): Promise<{ email: string; fullName: string } | undefined> {
    const [admin] = await db
      .select({ email: companyUsers.email, fullName: companyUsers.fullName })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.role, "CompanyAdmin")
        )
      )
      .limit(1);
    return admin || undefined;
  }

  async getCompanyUsers(companyId: string): Promise<CompanyUser[]> {
    return await db
      .select()
      .from(companyUsers)
      .where(eq(companyUsers.companyId, companyId))
      .orderBy(companyUsers.createdAt);
  }

  async updateCompanyUserPassword(id: string, passwordHash: string): Promise<CompanyUser> {
    const [user] = await db
      .update(companyUsers)
      .set({
        passwordHash,
        tempPasswordHash: null,
        mustResetPassword: false,
      })
      .where(eq(companyUsers.id, id))
      .returning();
    return user;
  }

  async updateCompanyUser(id: string, companyId: string, updates: { fullName?: string; role?: "CompanyAdmin" | "Auditor" | "Reviewer" | "StaffReadOnly"; isActive?: boolean }): Promise<CompanyUser> {
    const [user] = await db
      .update(companyUsers)
      .set(updates)
      .where(and(eq(companyUsers.id, id), eq(companyUsers.companyId, companyId)))
      .returning();
    return user;
  }

  async setTempPassword(id: string, companyId: string, tempPasswordHash: string): Promise<CompanyUser> {
    const [user] = await db
      .update(companyUsers)
      .set({
        tempPasswordHash,
        mustResetPassword: true,
        passwordHash: null,
      })
      .where(and(eq(companyUsers.id, id), eq(companyUsers.companyId, companyId)))
      .returning();
    return user;
  }

  // Company Roles
  async createCompanyRole(insertRole: InsertCompanyRole): Promise<CompanyRole> {
    const [role] = await db
      .insert(companyRoles)
      .values(insertRole)
      .returning();
    return role;
  }

  async getCompanyRoles(companyId: string): Promise<CompanyRole[]> {
    return await db.select().from(companyRoles).where(eq(companyRoles.companyId, companyId));
  }

  // Support Catalogue
  async getSupportCategories(): Promise<SupportCategory[]> {
    return await db.select().from(supportCategories).orderBy(asc(supportCategories.sortOrder));
  }

  async createSupportCategory(category: InsertSupportCategory): Promise<SupportCategory> {
    const [created] = await db.insert(supportCategories).values(category).returning();
    return created;
  }

  async getSupportLineItems(): Promise<SupportLineItem[]> {
    return await db.select().from(supportLineItems).orderBy(asc(supportLineItems.sortOrder));
  }

  async getActiveLineItems(): Promise<SupportLineItem[]> {
    return await db
      .select()
      .from(supportLineItems)
      .where(eq(supportLineItems.isActive, true))
      .orderBy(asc(supportLineItems.sortOrder));
  }

  async getLineItemsByCategory(categoryId: string): Promise<SupportLineItem[]> {
    return await db
      .select()
      .from(supportLineItems)
      .where(and(eq(supportLineItems.categoryId, categoryId), eq(supportLineItems.isActive, true)))
      .orderBy(asc(supportLineItems.sortOrder));
  }

  async getLineItemsByCategoryIds(categoryIds: string[]): Promise<SupportLineItem[]> {
    if (categoryIds.length === 0) return [];
    return await db
      .select()
      .from(supportLineItems)
      .where(and(inArray(supportLineItems.categoryId, categoryIds), eq(supportLineItems.isActive, true)))
      .orderBy(asc(supportLineItems.sortOrder));
  }

  async createSupportLineItem(item: InsertSupportLineItem): Promise<SupportLineItem> {
    const [created] = await db.insert(supportLineItems).values(item).returning();
    return created;
  }

  // Company Service Selections
  async createCompanyServiceSelections(selections: InsertCompanyServiceSelection[]): Promise<void> {
    if (selections.length === 0) return;
    await db.insert(companyServiceSelections).values(selections);
  }

  async getCompanyServiceSelections(companyId: string): Promise<CompanyServiceSelection[]> {
    return await db
      .select()
      .from(companyServiceSelections)
      .where(eq(companyServiceSelections.companyId, companyId));
  }

  async deleteCompanyServiceSelections(companyId: string): Promise<void> {
    await db.delete(companyServiceSelections).where(eq(companyServiceSelections.companyId, companyId));
  }

  async getCompanyServiceSelectionsCount(companyId: string): Promise<number> {
    const selections = await db
      .select()
      .from(companyServiceSelections)
      .where(eq(companyServiceSelections.companyId, companyId));
    return selections.length;
  }

  // Company Settings
  async getCompanySettings(companyId: string): Promise<CompanySettings | undefined> {
    const [settings] = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.companyId, companyId));
    return settings || undefined;
  }

  async upsertCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    const existing = await this.getCompanySettings(settings.companyId);
    if (existing) {
      const { companyId, ...updateFields } = settings;
      const [updated] = await db
        .update(companySettings)
        .set({ ...updateFields, updatedAt: new Date() })
        .where(eq(companySettings.companyId, companyId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(companySettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  // Company Documents
  async getCompanyDocuments(companyId: string): Promise<CompanyDocument[]> {
    return await db
      .select()
      .from(companyDocuments)
      .where(eq(companyDocuments.companyId, companyId))
      .orderBy(desc(companyDocuments.createdAt));
  }

  async getCompanyDocument(id: string, companyId: string): Promise<CompanyDocument | undefined> {
    const [doc] = await db
      .select()
      .from(companyDocuments)
      .where(and(eq(companyDocuments.id, id), eq(companyDocuments.companyId, companyId)));
    return doc || undefined;
  }

  async createCompanyDocument(document: InsertCompanyDocument): Promise<CompanyDocument> {
    const [created] = await db
      .insert(companyDocuments)
      .values(document)
      .returning();
    return created;
  }

  async updateCompanyDocument(id: string, companyId: string, updates: Partial<InsertCompanyDocument>): Promise<CompanyDocument | undefined> {
    const [updated] = await db
      .update(companyDocuments)
      .set(updates)
      .where(and(eq(companyDocuments.id, id), eq(companyDocuments.companyId, companyId)))
      .returning();
    return updated || undefined;
  }

  async getCompanyDocumentsCount(companyId: string): Promise<number> {
    const docs = await db
      .select()
      .from(companyDocuments)
      .where(eq(companyDocuments.companyId, companyId));
    return docs.length;
  }

  // Onboarding
  async updateCompanyOnboardingStatus(companyId: string, status: "not_started" | "in_progress" | "completed", completedAt?: Date): Promise<Company | undefined> {
    const updateData: any = { onboardingStatus: status, updatedAt: new Date() };
    if (completedAt) {
      updateData.onboardingCompletedAt = completedAt;
    }
    if (status === "completed") {
      updateData.status = "active";
    }
    const [company] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId))
      .returning();
    return company || undefined;
  }

  // Change Log
  async logChange(insertChange: InsertChangeLog): Promise<void> {
    await db.insert(changeLog).values(insertChange);
  }

  async getRecentChangeLogs(limit: number = 100): Promise<any[]> {
    return await db
      .select()
      .from(changeLog)
      .orderBy(desc(changeLog.createdAt))
      .limit(limit);
  }

  // Audits
  async createAudit(audit: InsertAudit): Promise<Audit> {
    const [created] = await db.insert(audits).values(audit).returning();
    return created;
  }

  async getAudit(id: string, companyId: string): Promise<Audit | undefined> {
    const [audit] = await db
      .select()
      .from(audits)
      .where(and(eq(audits.id, id), eq(audits.companyId, companyId)));
    return audit || undefined;
  }

  async getAudits(companyId: string, filters?: { status?: string; auditType?: string }): Promise<Audit[]> {
    let query = db.select().from(audits).where(eq(audits.companyId, companyId));
    
    const conditions: any[] = [eq(audits.companyId, companyId)];
    if (filters?.status) {
      conditions.push(eq(audits.status, filters.status as any));
    }
    if (filters?.auditType) {
      conditions.push(eq(audits.auditType, filters.auditType as any));
    }
    
    return await db
      .select()
      .from(audits)
      .where(and(...conditions))
      .orderBy(desc(audits.createdAt));
  }

  async updateAudit(id: string, companyId: string, updates: Partial<InsertAudit>): Promise<Audit | undefined> {
    const [updated] = await db
      .update(audits)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(audits.id, id), eq(audits.companyId, companyId)))
      .returning();
    return updated || undefined;
  }

  // Audit Scope Line Items
  async getAuditScopeLineItems(auditId: string): Promise<AuditScopeLineItem[]> {
    return await db
      .select()
      .from(auditScopeLineItems)
      .where(eq(auditScopeLineItems.auditId, auditId));
  }

  async setAuditScopeLineItems(auditId: string, lineItemIds: string[]): Promise<void> {
    await db.delete(auditScopeLineItems).where(eq(auditScopeLineItems.auditId, auditId));
    if (lineItemIds.length > 0) {
      await db.insert(auditScopeLineItems).values(
        lineItemIds.map(lineItemId => ({ auditId, lineItemId }))
      );
    }
  }

  // Audit Templates
  async createAuditTemplate(template: InsertAuditTemplate): Promise<AuditTemplate> {
    const [created] = await db.insert(auditTemplates).values(template).returning();
    return created;
  }

  async getAuditTemplate(id: string, companyId: string): Promise<AuditTemplate | undefined> {
    const [template] = await db
      .select()
      .from(auditTemplates)
      .where(and(eq(auditTemplates.id, id), eq(auditTemplates.companyId, companyId)));
    return template || undefined;
  }

  async getAuditTemplates(companyId: string): Promise<AuditTemplate[]> {
    return await db
      .select()
      .from(auditTemplates)
      .where(and(eq(auditTemplates.companyId, companyId), eq(auditTemplates.isActive, true)))
      .orderBy(desc(auditTemplates.createdAt));
  }

  // Audit Template Indicators
  async createAuditTemplateIndicator(indicator: InsertAuditTemplateIndicator): Promise<AuditTemplateIndicator> {
    const [created] = await db.insert(auditTemplateIndicators).values(indicator).returning();
    return created;
  }

  async getAuditTemplateIndicators(templateId: string): Promise<AuditTemplateIndicator[]> {
    return await db
      .select()
      .from(auditTemplateIndicators)
      .where(eq(auditTemplateIndicators.templateId, templateId))
      .orderBy(asc(auditTemplateIndicators.sortOrder));
  }

  async getAuditTemplateIndicator(id: string): Promise<AuditTemplateIndicator | undefined> {
    const [indicator] = await db
      .select()
      .from(auditTemplateIndicators)
      .where(eq(auditTemplateIndicators.id, id));
    return indicator || undefined;
  }

  // Audit Runs
  async getAuditRun(auditId: string): Promise<AuditRun | undefined> {
    const [run] = await db
      .select()
      .from(auditRuns)
      .where(eq(auditRuns.auditId, auditId));
    return run || undefined;
  }

  async upsertAuditRun(run: InsertAuditRun): Promise<AuditRun> {
    const existing = await this.getAuditRun(run.auditId);
    if (existing) {
      const [updated] = await db
        .update(auditRuns)
        .set({ templateId: run.templateId })
        .where(eq(auditRuns.auditId, run.auditId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(auditRuns).values(run).returning();
      return created;
    }
  }

  async updateAuditRun(auditId: string, updates: Partial<InsertAuditRun>): Promise<AuditRun | undefined> {
    const [updated] = await db
      .update(auditRuns)
      .set(updates)
      .where(eq(auditRuns.auditId, auditId))
      .returning();
    return updated || undefined;
  }

  // Audit Indicator Responses
  async getAuditIndicatorResponses(auditId: string): Promise<AuditIndicatorResponse[]> {
    return await db
      .select()
      .from(auditIndicatorResponses)
      .where(eq(auditIndicatorResponses.auditId, auditId));
  }

  async getAuditIndicatorResponse(auditId: string, indicatorId: string): Promise<AuditIndicatorResponse | undefined> {
    const [response] = await db
      .select()
      .from(auditIndicatorResponses)
      .where(and(
        eq(auditIndicatorResponses.auditId, auditId),
        eq(auditIndicatorResponses.templateIndicatorId, indicatorId)
      ));
    return response || undefined;
  }

  async upsertAuditIndicatorResponse(response: InsertAuditIndicatorResponse): Promise<AuditIndicatorResponse> {
    const existing = await this.getAuditIndicatorResponse(response.auditId, response.templateIndicatorId);
    if (existing) {
      const [updated] = await db
        .update(auditIndicatorResponses)
        .set({ rating: response.rating, comment: response.comment, updatedAt: new Date() })
        .where(eq(auditIndicatorResponses.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(auditIndicatorResponses).values(response).returning();
      return created;
    }
  }

  async getAuditOutcomes(companyId: string, filters?: { rating?: string; auditId?: string }): Promise<any[]> {
    const conditions: any[] = [eq(audits.companyId, companyId)];
    
    if (filters?.rating) {
      conditions.push(eq(auditIndicatorResponses.rating, filters.rating as any));
    }
    if (filters?.auditId) {
      conditions.push(eq(auditIndicatorResponses.auditId, filters.auditId));
    }
    
    const results = await db
      .select({
        id: auditIndicatorResponses.id,
        auditId: auditIndicatorResponses.auditId,
        templateIndicatorId: auditIndicatorResponses.templateIndicatorId,
        rating: auditIndicatorResponses.rating,
        comment: auditIndicatorResponses.comment,
        scorePoints: auditIndicatorResponses.scorePoints,
        scoreVersion: auditIndicatorResponses.scoreVersion,
        status: auditIndicatorResponses.status,
        createdByCompanyUserId: auditIndicatorResponses.createdByCompanyUserId,
        createdAt: auditIndicatorResponses.createdAt,
        auditTitle: audits.title,
        auditStatus: audits.status,
        indicatorText: auditTemplateIndicators.indicatorText,
        sortOrder: auditTemplateIndicators.sortOrder,
      })
      .from(auditIndicatorResponses)
      .innerJoin(audits, eq(auditIndicatorResponses.auditId, audits.id))
      .innerJoin(auditTemplateIndicators, eq(auditIndicatorResponses.templateIndicatorId, auditTemplateIndicators.id))
      .where(and(...conditions))
      .orderBy(desc(auditIndicatorResponses.createdAt));
    
    return results;
  }

  // Findings
  async createFinding(finding: InsertFinding): Promise<Finding> {
    const [created] = await db.insert(findings).values(finding).returning();
    return created;
  }

  async getFinding(id: string, companyId: string): Promise<Finding | undefined> {
    const [finding] = await db
      .select()
      .from(findings)
      .where(and(eq(findings.id, id), eq(findings.companyId, companyId)));
    return finding || undefined;
  }

  async getFindings(companyId: string, filters?: { status?: string; severity?: string; auditId?: string }): Promise<Finding[]> {
    const conditions: any[] = [eq(findings.companyId, companyId)];
    if (filters?.status) {
      conditions.push(eq(findings.status, filters.status as any));
    }
    if (filters?.severity) {
      conditions.push(eq(findings.severity, filters.severity as any));
    }
    if (filters?.auditId) {
      conditions.push(eq(findings.auditId, filters.auditId));
    }
    
    return await db
      .select()
      .from(findings)
      .where(and(...conditions))
      .orderBy(desc(findings.createdAt));
  }

  async getFindingByAuditAndIndicator(auditId: string, indicatorId: string, companyId: string): Promise<Finding | undefined> {
    const [finding] = await db
      .select()
      .from(findings)
      .where(and(
        eq(findings.auditId, auditId),
        eq(findings.templateIndicatorId, indicatorId),
        eq(findings.companyId, companyId)
      ));
    return finding || undefined;
  }

  async updateFinding(id: string, companyId: string, updates: Partial<InsertFinding>): Promise<Finding | undefined> {
    const [updated] = await db
      .update(findings)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(findings.id, id), eq(findings.companyId, companyId)))
      .returning();
    return updated || undefined;
  }

  // Evidence Requests
  async createEvidenceRequest(request: InsertEvidenceRequest): Promise<EvidenceRequest> {
    const [created] = await db.insert(evidenceRequests).values(request).returning();
    return created;
  }

  async getEvidenceRequest(id: string, companyId: string): Promise<EvidenceRequest | undefined> {
    const [request] = await db
      .select()
      .from(evidenceRequests)
      .where(and(eq(evidenceRequests.id, id), eq(evidenceRequests.companyId, companyId)));
    return request || undefined;
  }

  async getEvidenceRequestByFindingId(findingId: string, companyId: string): Promise<EvidenceRequest | undefined> {
    const [request] = await db
      .select()
      .from(evidenceRequests)
      .where(and(eq(evidenceRequests.findingId, findingId), eq(evidenceRequests.companyId, companyId)));
    return request || undefined;
  }

  async getEvidenceRequestByPublicToken(token: string): Promise<EvidenceRequest | undefined> {
    const [request] = await db
      .select()
      .from(evidenceRequests)
      .where(eq(evidenceRequests.publicToken, token));
    return request || undefined;
  }

  async getEvidenceRequests(companyId: string, filters?: { status?: string; auditId?: string; standalone?: boolean; findingId?: string }): Promise<EvidenceRequest[]> {
    const conditions: any[] = [eq(evidenceRequests.companyId, companyId)];
    if (filters?.status) {
      conditions.push(eq(evidenceRequests.status, filters.status as any));
    }
    if (filters?.auditId) {
      conditions.push(eq(evidenceRequests.auditId, filters.auditId));
    }
    if (filters?.standalone) {
      conditions.push(isNull(evidenceRequests.auditId));
    }
    if (filters?.findingId) {
      conditions.push(eq(evidenceRequests.findingId, filters.findingId));
    }
    
    return await db
      .select()
      .from(evidenceRequests)
      .where(and(...conditions))
      .orderBy(desc(evidenceRequests.createdAt));
  }

  async getEvidenceRequestsByAuditId(auditId: string, companyId: string): Promise<EvidenceRequest[]> {
    return await db
      .select()
      .from(evidenceRequests)
      .where(and(eq(evidenceRequests.auditId, auditId), eq(evidenceRequests.companyId, companyId)))
      .orderBy(desc(evidenceRequests.createdAt));
  }

  async updateEvidenceRequest(id: string, companyId: string, updates: Partial<InsertEvidenceRequest>): Promise<EvidenceRequest | undefined> {
    const [updated] = await db
      .update(evidenceRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(evidenceRequests.id, id), eq(evidenceRequests.companyId, companyId)))
      .returning();
    return updated || undefined;
  }

  async updateEvidenceRequestByToken(token: string, updates: Partial<InsertEvidenceRequest>): Promise<EvidenceRequest | undefined> {
    const [updated] = await db
      .update(evidenceRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(evidenceRequests.publicToken, token))
      .returning();
    return updated || undefined;
  }

  // Evidence Items
  async createEvidenceItem(item: InsertEvidenceItem): Promise<EvidenceItem> {
    const [created] = await db.insert(evidenceItems).values(item).returning();
    return created;
  }

  async createEvidenceItemPublic(evidenceRequestId: string, item: Omit<InsertEvidenceItem, 'companyId' | 'evidenceRequestId'>): Promise<EvidenceItem> {
    const request = await db.select().from(evidenceRequests).where(eq(evidenceRequests.id, evidenceRequestId)).then(r => r[0]);
    if (!request) throw new Error("Evidence request not found");
    const [created] = await db.insert(evidenceItems).values({
      ...item,
      companyId: request.companyId,
      evidenceRequestId,
    }).returning();
    return created;
  }

  async getEvidenceItems(evidenceRequestId: string, companyId: string): Promise<EvidenceItem[]> {
    return await db
      .select()
      .from(evidenceItems)
      .where(and(eq(evidenceItems.evidenceRequestId, evidenceRequestId), eq(evidenceItems.companyId, companyId)))
      .orderBy(desc(evidenceItems.createdAt));
  }

  async getEvidenceItem(id: string, companyId: string): Promise<EvidenceItem | undefined> {
    const [item] = await db
      .select()
      .from(evidenceItems)
      .where(and(eq(evidenceItems.id, id), eq(evidenceItems.companyId, companyId)));
    return item || undefined;
  }
}

export const storage = new DatabaseStorage();
