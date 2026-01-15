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
  auditDomains,
  auditScopeDomains,
  standardIndicators,
  auditTemplates,
  auditTemplateIndicators,
  auditRuns,
  auditIndicatorResponses,
  findings,
  evidenceRequests,
  evidenceItems,
  documentChecklistTemplates,
  documentChecklistItems,
  documentReviews,
  suggestedFindings,
  auditInterviews,
  auditSiteVisits,
  auditSites,
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
  type AuditDomain,
  type InsertAuditDomain,
  type AuditScopeDomain,
  type InsertAuditScopeDomain,
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
  type DocumentChecklistTemplate,
  type InsertDocumentChecklistTemplate,
  type DocumentChecklistItem,
  type InsertDocumentChecklistItem,
  type DocumentReview,
  type InsertDocumentReview,
  type SuggestedFinding,
  type InsertSuggestedFinding,
  type AuditInterview,
  type InsertAuditInterview,
  type AuditSiteVisit,
  type InsertAuditSiteVisit,
  type AuditSite,
  type InsertAuditSite,
  type StandardIndicator,
  type InsertStandardIndicator,
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
  
  // Standard Indicators Library (Global)
  getStandardIndicators(domainCodes?: string[]): Promise<StandardIndicator[]>;
  getStandardIndicatorsByDomain(domainCode: string): Promise<StandardIndicator[]>;
  ensureStandardIndicatorsSeeded(): Promise<void>;
  
  // Audit Domains
  getAuditDomains(companyId: string): Promise<AuditDomain[]>;
  getAuditDomain(id: string, companyId: string): Promise<AuditDomain | undefined>;
  createAuditDomain(domain: InsertAuditDomain): Promise<AuditDomain>;
  ensureDefaultDomainsExist(companyId: string): Promise<AuditDomain[]>;
  
  // Audit Scope Domains
  getAuditScopeDomains(auditId: string, companyId: string): Promise<(AuditScopeDomain & { domain: AuditDomain })[]>;
  setAuditScopeDomains(auditId: string, companyId: string, domainIds: string[]): Promise<void>;
  
  // Document Checklist Templates
  getDocumentChecklistTemplate(documentType: string): Promise<(DocumentChecklistTemplate & { items: DocumentChecklistItem[] }) | undefined>;
  getDocumentChecklistTemplates(): Promise<DocumentChecklistTemplate[]>;
  createDocumentChecklistTemplate(template: InsertDocumentChecklistTemplate): Promise<DocumentChecklistTemplate>;
  createDocumentChecklistItem(item: InsertDocumentChecklistItem): Promise<DocumentChecklistItem>;
  getDocumentChecklistItems(templateId: string): Promise<DocumentChecklistItem[]>;
  
  // Document Reviews
  createDocumentReview(review: InsertDocumentReview): Promise<DocumentReview>;
  getDocumentReview(id: string, companyId: string): Promise<DocumentReview | undefined>;
  getDocumentReviewByEvidenceItem(evidenceItemId: string, companyId: string): Promise<DocumentReview | undefined>;
  getDocumentReviews(companyId: string, filters?: { auditId?: string; evidenceRequestId?: string }): Promise<DocumentReview[]>;
  
  // Audit Interviews
  createAuditInterview(interview: InsertAuditInterview): Promise<AuditInterview>;
  getAuditInterviews(auditId: string, companyId: string): Promise<AuditInterview[]>;
  getAuditInterview(id: string, companyId: string): Promise<AuditInterview | undefined>;
  updateAuditInterview(id: string, companyId: string, updates: Partial<InsertAuditInterview>): Promise<AuditInterview | undefined>;
  deleteAuditInterview(id: string, companyId: string): Promise<boolean>;
  
  // Audit Site Visits
  createAuditSiteVisit(visit: InsertAuditSiteVisit): Promise<AuditSiteVisit>;
  getAuditSiteVisits(auditId: string, companyId: string): Promise<AuditSiteVisit[]>;
  getAuditSiteVisit(id: string, companyId: string): Promise<AuditSiteVisit | undefined>;
  updateAuditSiteVisit(id: string, companyId: string, updates: Partial<InsertAuditSiteVisit>): Promise<AuditSiteVisit | undefined>;
  deleteAuditSiteVisit(id: string, companyId: string): Promise<boolean>;
  
  // Audit Report Data
  updateAuditExecutiveSummary(auditId: string, companyId: string, summary: string, editedByUserId: string): Promise<Audit | undefined>;
  getAuditReportData(auditId: string, companyId: string): Promise<any>;
  
  // Audit Sites (for multi-location audits)
  getAuditSites(auditId: string): Promise<AuditSite[]>;
  createAuditSite(site: InsertAuditSite): Promise<AuditSite>;
  deleteAuditSite(id: string): Promise<boolean>;
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

  // Standard Indicators Library (Global)
  async getStandardIndicators(domainCodes?: string[]): Promise<StandardIndicator[]> {
    if (domainCodes && domainCodes.length > 0) {
      return await db
        .select()
        .from(standardIndicators)
        .where(inArray(standardIndicators.domainCode, domainCodes as ("STAFF_PERSONNEL" | "GOV_POLICY" | "OPERATIONAL" | "SITE_ENVIRONMENT")[]))
        .orderBy(asc(standardIndicators.domainCode), asc(standardIndicators.sortOrder));
    }
    return await db
      .select()
      .from(standardIndicators)
      .orderBy(asc(standardIndicators.domainCode), asc(standardIndicators.sortOrder));
  }

  async getStandardIndicatorsByDomain(domainCode: string): Promise<StandardIndicator[]> {
    return await db
      .select()
      .from(standardIndicators)
      .where(eq(standardIndicators.domainCode, domainCode as "STAFF_PERSONNEL" | "GOV_POLICY" | "OPERATIONAL" | "SITE_ENVIRONMENT"))
      .orderBy(asc(standardIndicators.category), asc(standardIndicators.sortOrder));
  }

  async ensureStandardIndicatorsSeeded(): Promise<void> {
    const existing = await db.select().from(standardIndicators).limit(1);
    if (existing.length > 0) return;

    const indicators: InsertStandardIndicator[] = [
      // GOV_POLICY - Governance & Policy
      { domainCode: "GOV_POLICY", category: "Core governance documents", indicatorText: "Governance framework or governance charter is documented and current", evidenceRequirements: "Governance framework document with review date", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 1 },
      { domainCode: "GOV_POLICY", category: "Core governance documents", indicatorText: "Organisational structure chart is documented and reflects current structure", evidenceRequirements: "Org chart with roles and reporting lines", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 2 },
      { domainCode: "GOV_POLICY", category: "Core governance documents", indicatorText: "Delegations of authority are documented and current", evidenceRequirements: "Delegations register or policy", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 3 },
      { domainCode: "GOV_POLICY", category: "Core governance documents", indicatorText: "Roles and responsibilities matrix is documented", evidenceRequirements: "RACI or responsibility matrix", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 4 },
      { domainCode: "GOV_POLICY", category: "Core governance documents", indicatorText: "Fit and Proper Person declarations are completed for directors and key management", evidenceRequirements: "Signed declarations on file", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 5 },
      { domainCode: "GOV_POLICY", category: "Core governance documents", indicatorText: "Conflict of interest register is maintained and current", evidenceRequirements: "COI register with dates", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 6 },
      { domainCode: "GOV_POLICY", category: "Core governance documents", indicatorText: "Board or management meeting minutes are documented", evidenceRequirements: "Meeting minutes samples", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 7 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Incident management policy is documented, current and approved", evidenceRequirements: "Policy with approval and review dates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 10 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Complaints management policy is documented, current and approved", evidenceRequirements: "Policy with approval and review dates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 11 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Risk management policy is documented, current and approved", evidenceRequirements: "Policy with approval and review dates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 12 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Continuous improvement policy is documented, current and approved", evidenceRequirements: "Policy with approval and review dates", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 13 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Feedback and feedback handling policy is documented, current and approved", evidenceRequirements: "Policy with approval and review dates", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 14 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Privacy and confidentiality policy is documented, current and approved", evidenceRequirements: "Policy with approval and review dates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 15 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Information management and record keeping policy is documented", evidenceRequirements: "Policy with approval and review dates", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 16 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Code of conduct is documented and staff have acknowledged", evidenceRequirements: "Code of conduct with staff acknowledgments", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 17 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Child safe standards policy is documented (where applicable)", evidenceRequirements: "Policy document", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 18 },
      { domainCode: "GOV_POLICY", category: "Policy suite", indicatorText: "Whistleblower or reportable conduct policy is documented (if applicable)", evidenceRequirements: "Policy document", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 19 },
      { domainCode: "GOV_POLICY", category: "Quality and risk", indicatorText: "Organisation-level risk register is maintained and current", evidenceRequirements: "Risk register with review dates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 20 },
      { domainCode: "GOV_POLICY", category: "Quality and risk", indicatorText: "Continuous improvement register or quality improvement plan is maintained", evidenceRequirements: "CI register or QIP with actions", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 21 },
      { domainCode: "GOV_POLICY", category: "Quality and risk", indicatorText: "Internal audit reports are documented", evidenceRequirements: "Internal audit reports", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 22 },
      { domainCode: "GOV_POLICY", category: "Quality and risk", indicatorText: "Previous external audit reports and responses are available", evidenceRequirements: "External audit reports with responses", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 23 },
      { domainCode: "GOV_POLICY", category: "Quality and risk", indicatorText: "Management review records are documented", evidenceRequirements: "Management review meeting records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 24 },
      { domainCode: "GOV_POLICY", category: "Governance implementation", indicatorText: "Policy register showing review dates is maintained", evidenceRequirements: "Policy register", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 25 },
      { domainCode: "GOV_POLICY", category: "Governance implementation", indicatorText: "Evidence that policies are communicated to staff", evidenceRequirements: "Communication records, emails, training", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 26 },
      { domainCode: "GOV_POLICY", category: "Governance implementation", indicatorText: "Training or induction records reference governance policies", evidenceRequirements: "Induction materials referencing policies", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 27 },

      // STAFF_PERSONNEL - Staff & Personnel Compliance
      { domainCode: "STAFF_PERSONNEL", category: "Pre-employment screening", indicatorText: "Police check records are current for all staff", evidenceRequirements: "Police check certificates within validity", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 1 },
      { domainCode: "STAFF_PERSONNEL", category: "Pre-employment screening", indicatorText: "Working With Children Check records are current (where required)", evidenceRequirements: "WWCC certificates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 2 },
      { domainCode: "STAFF_PERSONNEL", category: "Pre-employment screening", indicatorText: "NDIS Worker Screening clearance is current for all workers", evidenceRequirements: "NDIS Worker Screening clearance letters", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 3 },
      { domainCode: "STAFF_PERSONNEL", category: "Pre-employment screening", indicatorText: "Right to work documentation is verified and on file", evidenceRequirements: "Visa or citizenship evidence", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 4 },
      { domainCode: "STAFF_PERSONNEL", category: "Pre-employment screening", indicatorText: "Reference checks are completed (where applicable)", evidenceRequirements: "Reference check records", riskLevel: "LOW", isCriticalControl: false, sortOrder: 5 },
      { domainCode: "STAFF_PERSONNEL", category: "Qualifications and role suitability", indicatorText: "Qualification certificates relevant to role are on file", evidenceRequirements: "Certificates matching role requirements", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 10 },
      { domainCode: "STAFF_PERSONNEL", category: "Qualifications and role suitability", indicatorText: "Scope of practice or role descriptions are documented", evidenceRequirements: "Position descriptions", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 11 },
      { domainCode: "STAFF_PERSONNEL", category: "Qualifications and role suitability", indicatorText: "Evidence that qualifications are appropriate to supports delivered", evidenceRequirements: "Qualification-role mapping", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 12 },
      { domainCode: "STAFF_PERSONNEL", category: "Training and competency", indicatorText: "Training matrix or training register is maintained", evidenceRequirements: "Training matrix with dates", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 15 },
      { domainCode: "STAFF_PERSONNEL", category: "Training and competency", indicatorText: "Mandatory training records are current (incident management, medication, restrictive practices)", evidenceRequirements: "Training completion certificates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 16 },
      { domainCode: "STAFF_PERSONNEL", category: "Training and competency", indicatorText: "Induction records are documented for all staff", evidenceRequirements: "Signed induction checklists", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 17 },
      { domainCode: "STAFF_PERSONNEL", category: "Training and competency", indicatorText: "Ongoing professional development records are maintained", evidenceRequirements: "PD records and certificates", riskLevel: "LOW", isCriticalControl: false, sortOrder: 18 },
      { domainCode: "STAFF_PERSONNEL", category: "Supervision and performance", indicatorText: "Supervision schedules are documented", evidenceRequirements: "Supervision schedule or calendar", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 20 },
      { domainCode: "STAFF_PERSONNEL", category: "Supervision and performance", indicatorText: "Supervision session records are maintained", evidenceRequirements: "Supervision meeting notes", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 21 },
      { domainCode: "STAFF_PERSONNEL", category: "Supervision and performance", indicatorText: "Performance reviews or appraisals are completed", evidenceRequirements: "Performance review documents", riskLevel: "LOW", isCriticalControl: false, sortOrder: 22 },
      { domainCode: "STAFF_PERSONNEL", category: "Supervision and performance", indicatorText: "Corrective action or performance improvement plans are documented (if applicable)", evidenceRequirements: "PIPs or corrective action records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 23 },
      { domainCode: "STAFF_PERSONNEL", category: "Workforce governance", indicatorText: "Staff register with roles, employment type and start dates is maintained", evidenceRequirements: "Staff register", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 25 },
      { domainCode: "STAFF_PERSONNEL", category: "Workforce governance", indicatorText: "Contractor agreements are in place (if contractors used)", evidenceRequirements: "Contractor agreements", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 26 },
      { domainCode: "STAFF_PERSONNEL", category: "Workforce governance", indicatorText: "Rostering policies relating to skill mix and ratios are documented", evidenceRequirements: "Rostering policy or guidelines", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 27 },

      // OPERATIONAL - Service Delivery
      { domainCode: "OPERATIONAL", category: "Participant documentation", indicatorText: "Service agreements are in place for all participants", evidenceRequirements: "Signed service agreements", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 1 },
      { domainCode: "OPERATIONAL", category: "Participant documentation", indicatorText: "Participant consent forms are completed", evidenceRequirements: "Signed consent forms", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 2 },
      { domainCode: "OPERATIONAL", category: "Participant documentation", indicatorText: "Care plans or support plans are current and participant-centred", evidenceRequirements: "Current support plans", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 3 },
      { domainCode: "OPERATIONAL", category: "Participant documentation", indicatorText: "Behaviour support plans are current (if applicable)", evidenceRequirements: "BSP documents with review dates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 4 },
      { domainCode: "OPERATIONAL", category: "Participant documentation", indicatorText: "Mealtime management plans are current (if applicable)", evidenceRequirements: "MMP documents with review dates", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 5 },
      { domainCode: "OPERATIONAL", category: "Participant documentation", indicatorText: "Risk assessments specific to participants are documented", evidenceRequirements: "Individual risk assessments", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 6 },
      { domainCode: "OPERATIONAL", category: "Delivery evidence", indicatorText: "Rosters and shift allocations are documented", evidenceRequirements: "Roster records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 10 },
      { domainCode: "OPERATIONAL", category: "Delivery evidence", indicatorText: "Timesheets or shift completion records are maintained", evidenceRequirements: "Timesheet records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 11 },
      { domainCode: "OPERATIONAL", category: "Delivery evidence", indicatorText: "Case notes or progress notes are maintained", evidenceRequirements: "Progress notes with dates", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 12 },
      { domainCode: "OPERATIONAL", category: "Delivery evidence", indicatorText: "Daily logs or support records are documented", evidenceRequirements: "Daily log entries", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 13 },
      { domainCode: "OPERATIONAL", category: "Delivery evidence", indicatorText: "Activity participation records are maintained", evidenceRequirements: "Activity records", riskLevel: "LOW", isCriticalControl: false, sortOrder: 14 },
      { domainCode: "OPERATIONAL", category: "Clinical and support practice", indicatorText: "Medication management plans are documented (where applicable)", evidenceRequirements: "Medication management plans", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 15 },
      { domainCode: "OPERATIONAL", category: "Clinical and support practice", indicatorText: "Medication administration records (MARs) are maintained accurately", evidenceRequirements: "MAR charts with signatures", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 16 },
      { domainCode: "OPERATIONAL", category: "Clinical and support practice", indicatorText: "Incident reports linked to participants are documented", evidenceRequirements: "Incident reports", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 17 },
      { domainCode: "OPERATIONAL", category: "Clinical and support practice", indicatorText: "Restrictive practice records and reporting evidence are maintained (where applicable)", evidenceRequirements: "RP registers and reports", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 18 },
      { domainCode: "OPERATIONAL", category: "Funding and claiming", indicatorText: "Service bookings or funding approvals are documented", evidenceRequirements: "Service booking confirmations", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 20 },
      { domainCode: "OPERATIONAL", category: "Funding and claiming", indicatorText: "Invoices or claims evidence is maintained", evidenceRequirements: "Invoice records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 21 },
      { domainCode: "OPERATIONAL", category: "Funding and claiming", indicatorText: "Reconciliation between roster, delivery and claiming is evident", evidenceRequirements: "Reconciliation records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 22 },
      { domainCode: "OPERATIONAL", category: "Funding and claiming", indicatorText: "Evidence that rates align with pricing arrangements", evidenceRequirements: "Rate comparison records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 23 },

      // SITE_ENVIRONMENT - Site-Specific & Environment
      { domainCode: "SITE_ENVIRONMENT", category: "Site safety and readiness", indicatorText: "Site risk assessments are completed and current", evidenceRequirements: "Site risk assessment documents", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 1 },
      { domainCode: "SITE_ENVIRONMENT", category: "Site safety and readiness", indicatorText: "Emergency and evacuation plans are documented (site specific)", evidenceRequirements: "Emergency plans with site details", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 2 },
      { domainCode: "SITE_ENVIRONMENT", category: "Site safety and readiness", indicatorText: "Fire safety plans are documented", evidenceRequirements: "Fire safety plans", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 3 },
      { domainCode: "SITE_ENVIRONMENT", category: "Site safety and readiness", indicatorText: "Emergency drills or evacuation records are documented", evidenceRequirements: "Drill records with dates and attendees", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 4 },
      { domainCode: "SITE_ENVIRONMENT", category: "Site safety and readiness", indicatorText: "Maintenance logs are maintained", evidenceRequirements: "Maintenance log entries", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 5 },
      { domainCode: "SITE_ENVIRONMENT", category: "Environment controls", indicatorText: "Infection control procedures and cleaning schedules are documented", evidenceRequirements: "Cleaning schedules and IC procedures", riskLevel: "HIGH", isCriticalControl: true, sortOrder: 10 },
      { domainCode: "SITE_ENVIRONMENT", category: "Environment controls", indicatorText: "Food safety records are maintained (if meals provided)", evidenceRequirements: "Food safety records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 11 },
      { domainCode: "SITE_ENVIRONMENT", category: "Environment controls", indicatorText: "Equipment maintenance records are maintained", evidenceRequirements: "Equipment maintenance logs", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 12 },
      { domainCode: "SITE_ENVIRONMENT", category: "Environment controls", indicatorText: "Asset registers for assistive equipment are maintained", evidenceRequirements: "Asset register", riskLevel: "LOW", isCriticalControl: false, sortOrder: 13 },
      { domainCode: "SITE_ENVIRONMENT", category: "Local implementation evidence", indicatorText: "Site induction records for staff are documented", evidenceRequirements: "Site-specific induction records", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 15 },
      { domainCode: "SITE_ENVIRONMENT", category: "Local implementation evidence", indicatorText: "Staff access instructions (keys, alarms, exits) are documented", evidenceRequirements: "Access instructions document", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 16 },
      { domainCode: "SITE_ENVIRONMENT", category: "Local implementation evidence", indicatorText: "Incident logs linked to the site are maintained", evidenceRequirements: "Site-linked incident logs", riskLevel: "MEDIUM", isCriticalControl: false, sortOrder: 17 },
      { domainCode: "SITE_ENVIRONMENT", category: "Local implementation evidence", indicatorText: "Visitor or contractor sign-in records are maintained (if relevant)", evidenceRequirements: "Sign-in records", riskLevel: "LOW", isCriticalControl: false, sortOrder: 18 },
    ];

    await db.insert(standardIndicators).values(indicators);
  }

  // Audit Domains
  async getAuditDomains(companyId: string): Promise<AuditDomain[]> {
    return await db
      .select()
      .from(auditDomains)
      .where(eq(auditDomains.companyId, companyId))
      .orderBy(asc(auditDomains.code));
  }

  async getAuditDomain(id: string, companyId: string): Promise<AuditDomain | undefined> {
    const [domain] = await db
      .select()
      .from(auditDomains)
      .where(and(eq(auditDomains.id, id), eq(auditDomains.companyId, companyId)));
    return domain || undefined;
  }

  async createAuditDomain(domain: InsertAuditDomain): Promise<AuditDomain> {
    const [created] = await db.insert(auditDomains).values(domain).returning();
    return created;
  }

  async ensureDefaultDomainsExist(companyId: string): Promise<AuditDomain[]> {
    const existing = await this.getAuditDomains(companyId);
    const existingCodes = new Set(existing.map(d => d.code));
    
    const defaults = [
      { code: "GOV_POLICY" as const, name: "Governance & Policy", description: "How the organization is run, controlled, and held accountable", isEnabledByDefault: true },
      { code: "STAFF_PERSONNEL" as const, name: "Staff & Personnel Compliance", description: "Who is allowed to deliver care, and whether they are safe, qualified, and supervised", isEnabledByDefault: true },
      { code: "OPERATIONAL" as const, name: "Operational / Service Delivery", description: "Evidence that supports are delivered as agreed and funded", isEnabledByDefault: true },
      { code: "SITE_ENVIRONMENT" as const, name: "Site-Specific & Environment", description: "Whether the environment itself is safe and suitable for care", isEnabledByDefault: true },
    ];
    
    const toCreate = defaults.filter(d => !existingCodes.has(d.code));
    
    for (const def of toCreate) {
      await this.createAuditDomain({
        companyId,
        ...def,
      });
    }
    
    return await this.getAuditDomains(companyId);
  }

  // Audit Scope Domains
  async getAuditScopeDomains(auditId: string, companyId: string): Promise<(AuditScopeDomain & { domain: AuditDomain })[]> {
    const audit = await this.getAudit(auditId, companyId);
    if (!audit) return [];
    
    const results = await db
      .select({
        scopeDomain: auditScopeDomains,
        domain: auditDomains,
      })
      .from(auditScopeDomains)
      .innerJoin(auditDomains, eq(auditScopeDomains.domainId, auditDomains.id))
      .where(and(
        eq(auditScopeDomains.auditId, auditId),
        eq(auditDomains.companyId, companyId)
      ));
    
    return results.map(r => ({ ...r.scopeDomain, domain: r.domain }));
  }

  async setAuditScopeDomains(auditId: string, companyId: string, domainIds: string[]): Promise<void> {
    const audit = await this.getAudit(auditId, companyId);
    if (!audit) throw new Error("Audit not found");
    
    await db.delete(auditScopeDomains).where(eq(auditScopeDomains.auditId, auditId));
    
    if (domainIds.length > 0) {
      const domains = await this.getAuditDomains(companyId);
      const validDomainIds = domains.filter(d => domainIds.includes(d.id)).map(d => d.id);
      
      if (validDomainIds.length > 0) {
        await db.insert(auditScopeDomains).values(
          validDomainIds.map(domainId => ({
            auditId,
            domainId,
            isIncluded: true,
          }))
        );
      }
    }
  }

  // Document Checklist Templates
  async getDocumentChecklistTemplate(documentType: string): Promise<(DocumentChecklistTemplate & { items: DocumentChecklistItem[] }) | undefined> {
    const [template] = await db
      .select()
      .from(documentChecklistTemplates)
      .where(and(
        eq(documentChecklistTemplates.documentType, documentType as any),
        eq(documentChecklistTemplates.isActive, true)
      ))
      .orderBy(desc(documentChecklistTemplates.version))
      .limit(1);
    
    if (!template) return undefined;
    
    const items = await db
      .select()
      .from(documentChecklistItems)
      .where(eq(documentChecklistItems.templateId, template.id))
      .orderBy(asc(documentChecklistItems.sortOrder));
    
    return { ...template, items };
  }

  async getDocumentChecklistTemplates(): Promise<DocumentChecklistTemplate[]> {
    return await db
      .select()
      .from(documentChecklistTemplates)
      .where(eq(documentChecklistTemplates.isActive, true))
      .orderBy(asc(documentChecklistTemplates.documentType));
  }

  async createDocumentChecklistTemplate(template: InsertDocumentChecklistTemplate): Promise<DocumentChecklistTemplate> {
    const [created] = await db.insert(documentChecklistTemplates).values(template).returning();
    return created;
  }

  async createDocumentChecklistItem(item: InsertDocumentChecklistItem): Promise<DocumentChecklistItem> {
    const [created] = await db.insert(documentChecklistItems).values(item).returning();
    return created;
  }

  async getDocumentChecklistItems(templateId: string): Promise<DocumentChecklistItem[]> {
    return await db
      .select()
      .from(documentChecklistItems)
      .where(eq(documentChecklistItems.templateId, templateId))
      .orderBy(asc(documentChecklistItems.sortOrder));
  }

  // Document Reviews
  async createDocumentReview(review: InsertDocumentReview): Promise<DocumentReview> {
    const [created] = await db.insert(documentReviews).values(review).returning();
    return created;
  }

  async getDocumentReview(id: string, companyId: string): Promise<DocumentReview | undefined> {
    const [review] = await db
      .select()
      .from(documentReviews)
      .where(and(
        eq(documentReviews.id, id),
        eq(documentReviews.companyId, companyId)
      ));
    return review || undefined;
  }

  async getDocumentReviewByEvidenceItem(evidenceItemId: string, companyId: string): Promise<DocumentReview | undefined> {
    const [review] = await db
      .select()
      .from(documentReviews)
      .where(and(
        eq(documentReviews.evidenceItemId, evidenceItemId),
        eq(documentReviews.companyId, companyId)
      ));
    return review || undefined;
  }

  async getDocumentReviews(companyId: string, filters?: { auditId?: string; evidenceRequestId?: string }): Promise<DocumentReview[]> {
    const conditions = [eq(documentReviews.companyId, companyId)];
    
    if (filters?.auditId) {
      conditions.push(eq(documentReviews.auditId, filters.auditId));
    }
    if (filters?.evidenceRequestId) {
      conditions.push(eq(documentReviews.evidenceRequestId, filters.evidenceRequestId));
    }
    
    return await db
      .select()
      .from(documentReviews)
      .where(and(...conditions))
      .orderBy(desc(documentReviews.createdAt));
  }

  // Suggested Findings
  async createSuggestedFinding(suggestion: InsertSuggestedFinding): Promise<SuggestedFinding> {
    const [created] = await db.insert(suggestedFindings).values(suggestion).returning();
    return created;
  }

  async getSuggestedFinding(id: string, companyId: string): Promise<SuggestedFinding | undefined> {
    const [suggestion] = await db
      .select()
      .from(suggestedFindings)
      .where(and(
        eq(suggestedFindings.id, id),
        eq(suggestedFindings.companyId, companyId)
      ));
    return suggestion || undefined;
  }

  async getSuggestedFindingByDocumentReview(documentReviewId: string, companyId: string): Promise<SuggestedFinding | undefined> {
    const [suggestion] = await db
      .select()
      .from(suggestedFindings)
      .where(and(
        eq(suggestedFindings.documentReviewId, documentReviewId),
        eq(suggestedFindings.companyId, companyId)
      ));
    return suggestion || undefined;
  }

  async getSuggestedFindingsForIndicator(indicatorResponseId: string, companyId: string): Promise<SuggestedFinding[]> {
    return await db
      .select()
      .from(suggestedFindings)
      .where(and(
        eq(suggestedFindings.indicatorResponseId, indicatorResponseId),
        eq(suggestedFindings.companyId, companyId)
      ))
      .orderBy(desc(suggestedFindings.createdAt));
  }

  async getPendingSuggestedFindings(companyId: string, filters?: { auditId?: string }): Promise<SuggestedFinding[]> {
    const conditions = [
      eq(suggestedFindings.companyId, companyId),
      eq(suggestedFindings.status, "PENDING")
    ];
    
    if (filters?.auditId) {
      conditions.push(eq(suggestedFindings.auditId, filters.auditId));
    }
    
    return await db
      .select()
      .from(suggestedFindings)
      .where(and(...conditions))
      .orderBy(desc(suggestedFindings.createdAt));
  }

  async confirmSuggestedFinding(id: string, companyId: string, findingId: string): Promise<SuggestedFinding> {
    const [updated] = await db
      .update(suggestedFindings)
      .set({ 
        status: "CONFIRMED",
        confirmedFindingId: findingId
      })
      .where(and(
        eq(suggestedFindings.id, id),
        eq(suggestedFindings.companyId, companyId)
      ))
      .returning();
    return updated;
  }

  async dismissSuggestedFinding(
    id: string, 
    companyId: string, 
    dismissedByUserId: string, 
    dismissedReason?: string
  ): Promise<SuggestedFinding> {
    const [updated] = await db
      .update(suggestedFindings)
      .set({ 
        status: "DISMISSED",
        dismissedByUserId,
        dismissedReason: dismissedReason || null,
        dismissedAt: new Date()
      })
      .where(and(
        eq(suggestedFindings.id, id),
        eq(suggestedFindings.companyId, companyId)
      ))
      .returning();
    return updated;
  }

  // Audit Interviews
  async createAuditInterview(interview: InsertAuditInterview): Promise<AuditInterview> {
    const [created] = await db
      .insert(auditInterviews)
      .values(interview)
      .returning();
    return created;
  }

  async getAuditInterviews(auditId: string, companyId: string): Promise<AuditInterview[]> {
    return await db
      .select()
      .from(auditInterviews)
      .where(and(
        eq(auditInterviews.auditId, auditId),
        eq(auditInterviews.companyId, companyId)
      ))
      .orderBy(asc(auditInterviews.interviewDate));
  }

  async getAuditInterview(id: string, companyId: string): Promise<AuditInterview | undefined> {
    const [interview] = await db
      .select()
      .from(auditInterviews)
      .where(and(
        eq(auditInterviews.id, id),
        eq(auditInterviews.companyId, companyId)
      ));
    return interview || undefined;
  }

  async updateAuditInterview(id: string, companyId: string, updates: Partial<InsertAuditInterview>): Promise<AuditInterview | undefined> {
    const [updated] = await db
      .update(auditInterviews)
      .set(updates)
      .where(and(
        eq(auditInterviews.id, id),
        eq(auditInterviews.companyId, companyId)
      ))
      .returning();
    return updated || undefined;
  }

  async deleteAuditInterview(id: string, companyId: string): Promise<boolean> {
    const result = await db
      .delete(auditInterviews)
      .where(and(
        eq(auditInterviews.id, id),
        eq(auditInterviews.companyId, companyId)
      ));
    return true;
  }

  // Audit Site Visits
  async createAuditSiteVisit(visit: InsertAuditSiteVisit): Promise<AuditSiteVisit> {
    const [created] = await db
      .insert(auditSiteVisits)
      .values(visit)
      .returning();
    return created;
  }

  async getAuditSiteVisits(auditId: string, companyId: string): Promise<AuditSiteVisit[]> {
    return await db
      .select()
      .from(auditSiteVisits)
      .where(and(
        eq(auditSiteVisits.auditId, auditId),
        eq(auditSiteVisits.companyId, companyId)
      ))
      .orderBy(asc(auditSiteVisits.visitDate));
  }

  async getAuditSiteVisit(id: string, companyId: string): Promise<AuditSiteVisit | undefined> {
    const [visit] = await db
      .select()
      .from(auditSiteVisits)
      .where(and(
        eq(auditSiteVisits.id, id),
        eq(auditSiteVisits.companyId, companyId)
      ));
    return visit || undefined;
  }

  async updateAuditSiteVisit(id: string, companyId: string, updates: Partial<InsertAuditSiteVisit>): Promise<AuditSiteVisit | undefined> {
    const [updated] = await db
      .update(auditSiteVisits)
      .set(updates)
      .where(and(
        eq(auditSiteVisits.id, id),
        eq(auditSiteVisits.companyId, companyId)
      ))
      .returning();
    return updated || undefined;
  }

  async deleteAuditSiteVisit(id: string, companyId: string): Promise<boolean> {
    const result = await db
      .delete(auditSiteVisits)
      .where(and(
        eq(auditSiteVisits.id, id),
        eq(auditSiteVisits.companyId, companyId)
      ));
    return true;
  }

  // Audit Report Data
  async updateAuditExecutiveSummary(auditId: string, companyId: string, summary: string, editedByUserId: string): Promise<Audit | undefined> {
    const [updated] = await db
      .update(audits)
      .set({
        executiveSummary: summary,
        executiveSummaryEditedAt: new Date(),
        executiveSummaryEditedByUserId: editedByUserId,
        updatedAt: new Date()
      })
      .where(and(
        eq(audits.id, auditId),
        eq(audits.companyId, companyId)
      ))
      .returning();
    return updated || undefined;
  }

  async getAuditReportData(auditId: string, companyId: string): Promise<any> {
    const audit = await this.getAudit(auditId, companyId);
    if (!audit) return null;
    
    const [company, interviews, siteVisits, responses, findingsData, sites] = await Promise.all([
      this.getCompany(companyId),
      this.getAuditInterviews(auditId, companyId),
      this.getAuditSiteVisits(auditId, companyId),
      this.getAuditIndicatorResponses(auditId),
      this.getFindings(companyId, { auditId }),
      this.getAuditSites(auditId)
    ]);
    
    return {
      audit,
      company,
      interviews,
      siteVisits,
      indicatorResponses: responses,
      findings: findingsData,
      sites
    };
  }
  
  // Audit Sites (for multi-location audits)
  async getAuditSites(auditId: string): Promise<AuditSite[]> {
    return await db
      .select()
      .from(auditSites)
      .where(eq(auditSites.auditId, auditId))
      .orderBy(desc(auditSites.isPrimarySite), asc(auditSites.siteName));
  }
  
  async createAuditSite(site: InsertAuditSite): Promise<AuditSite> {
    const [created] = await db
      .insert(auditSites)
      .values(site)
      .returning();
    return created;
  }
  
  async deleteAuditSite(id: string): Promise<boolean> {
    const result = await db
      .delete(auditSites)
      .where(eq(auditSites.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
