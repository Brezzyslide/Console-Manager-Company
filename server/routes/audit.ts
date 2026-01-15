import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { requireCompanyAuth, requireRole, type AuthenticatedCompanyRequest } from "../lib/companyAuth";
import { storage } from "../storage";
import { 
  auditTypeEnum, 
  serviceContextEnum, 
  indicatorRatingEnum,
  riskLevelEnum,
  evidenceStatusEnum,
  evidenceTypeEnum,
  auditDomainCodeEnum,
} from "@shared/schema";

function generatePublicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const router = Router();

type IndicatorRating = typeof indicatorRatingEnum[number];

function scoreForRating(rating: IndicatorRating): number {
  switch (rating) {
    case "CONFORMITY_BEST_PRACTICE": return 3;
    case "CONFORMITY": return 2;
    case "MINOR_NC": return 1;
    case "MAJOR_NC": return 0;
    default: return 0;
  }
}

const DEFAULT_SERVICE_CONTEXTS = [
  { key: "SIL", label: "Supported Independent Living (SIL)" },
  { key: "COMMUNITY_ACCESS", label: "Community Access" },
  { key: "IN_HOME", label: "In-Home Support" },
  { key: "CENTRE_BASED", label: "Centre Based" },
] as const;

function mapLabelToEnumKey(label: string): typeof serviceContextEnum[number] {
  const match = DEFAULT_SERVICE_CONTEXTS.find(
    ctx => ctx.label.toLowerCase() === label.toLowerCase() || ctx.key.toLowerCase() === label.toLowerCase()
  );
  if (match) {
    return match.key as typeof serviceContextEnum[number];
  }
  return "OTHER";
}

router.get("/audits/options", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    
    const selections = await storage.getCompanyServiceSelections(companyId);
    const allLineItems = await storage.getSupportLineItems();
    const categories = await storage.getSupportCategories();
    
    const lineItemIds = selections.map(s => s.lineItemId);
    const availableLineItems = allLineItems.filter(li => lineItemIds.includes(li.id) && li.isActive);
    
    const lineItemsByCategory = categories
      .map(cat => ({
        categoryId: cat.id,
        categoryKey: cat.categoryKey,
        categoryLabel: cat.categoryLabel,
        items: allLineItems
          .filter(li => li.categoryId === cat.id && li.isActive)
          .map(li => ({
            lineItemId: li.id,
            code: li.itemCode,
            label: li.itemLabel,
            isSelected: lineItemIds.includes(li.id),
          })),
      }))
      .filter(g => g.items.length > 0);
    
    const serviceContexts = categories.map(cat => ({
      key: cat.categoryKey,
      label: cat.categoryLabel,
    }));
    
    return res.json({
      serviceContexts,
      lineItemsByCategory,
      selectedLineItemCount: availableLineItems.length,
    });
  } catch (error) {
    console.error("Get audit options error:", error);
    return res.status(500).json({ error: "Failed to fetch audit options" });
  }
});

const createAuditSchema = z.object({
  auditType: z.enum(auditTypeEnum),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  serviceContextKey: z.string().min(1, "Service context is required"),
  serviceContextLabel: z.string().min(1, "Service context label is required"),
  scopeTimeFrom: z.string().transform(s => new Date(s)),
  scopeTimeTo: z.string().transform(s => new Date(s)),
  externalAuditorName: z.string().optional(),
  externalAuditorOrg: z.string().optional(),
  externalAuditorEmail: z.string().email().optional(),
  entityName: z.string().optional(),
  entityAbn: z.string().optional(),
  entityAddress: z.string().optional(),
  auditPurpose: z.enum(["INITIAL_CERTIFICATION", "RECERTIFICATION", "SURVEILLANCE", "SCOPE_EXTENSION", "TRANSFER_AUDIT", "SPECIAL_AUDIT"]).optional(),
  selectedLineItemIds: z.array(z.string().uuid()).min(1, "At least one line item must be selected"),
  selectedDomainIds: z.array(z.string()).optional(),
}).refine(data => {
  if (data.auditType === "EXTERNAL") {
    return data.externalAuditorName && data.externalAuditorOrg && data.externalAuditorEmail;
  }
  return true;
}, { message: "External auditor details required for external audits" });

router.post("/audits", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const input = createAuditSchema.parse(req.body);
    
    const categories = await storage.getSupportCategories();
    const validContextLabels = categories.map(cat => cat.categoryLabel);
    
    const isValidContext = validContextLabels.some(
      ctx => ctx.toLowerCase() === input.serviceContextLabel.toLowerCase()
    );
    
    if (!isValidContext) {
      return res.status(400).json({ 
        error: "Invalid service context", 
        message: "The selected service context is not valid" 
      });
    }
    
    const allLineItems = await storage.getSupportLineItems();
    const validLineItemIds = allLineItems.filter(li => li.isActive).map(li => li.id);
    const invalidIds = input.selectedLineItemIds.filter(id => !validLineItemIds.includes(id));
    
    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: "Invalid line items",
        message: "Some selected line items are not valid",
      });
    }
    
    const serviceContextEnum = mapLabelToEnumKey(input.serviceContextLabel);
    
    const audit = await storage.createAudit({
      companyId,
      auditType: input.auditType,
      title: input.title,
      description: input.description || null,
      serviceContext: serviceContextEnum,
      serviceContextLabel: input.serviceContextLabel,
      scopeTimeFrom: input.scopeTimeFrom,
      scopeTimeTo: input.scopeTimeTo,
      createdByCompanyUserId: userId,
      externalAuditorName: input.externalAuditorName || null,
      externalAuditorOrg: input.externalAuditorOrg || null,
      externalAuditorEmail: input.externalAuditorEmail || null,
      entityName: input.entityName || null,
      entityAbn: input.entityAbn || null,
      entityAddress: input.entityAddress || null,
      auditPurpose: input.auditPurpose || null,
      scopeLocked: false,
    });
    
    await storage.setAuditScopeLineItems(audit.id, input.selectedLineItemIds);
    
    // Set audit domains - use provided IDs or default to all enabled domains
    const allDomains = await storage.ensureDefaultDomainsExist(companyId);
    let domainIdsToSet: string[];
    
    if (input.selectedDomainIds && input.selectedDomainIds.length > 0) {
      // User explicitly selected domains
      domainIdsToSet = input.selectedDomainIds;
    } else {
      // Use all domains that are enabled by default
      domainIdsToSet = allDomains.filter(d => d.isEnabledByDefault).map(d => d.id);
    }
    
    await storage.setAuditScopeDomains(audit.id, companyId, domainIdsToSet);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_CREATED",
      entityType: "audit",
      entityId: audit.id,
      afterJson: { 
        auditType: input.auditType, 
        title: input.title, 
        serviceContext: serviceContextEnum, 
        serviceContextLabel: input.serviceContextLabel,
        scopeLineItemCount: input.selectedLineItemIds.length,
        scopeDomainCount: domainIdsToSet.length,
      },
    });
    
    return res.status(201).json(audit);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Create audit error:", error);
    return res.status(500).json({ error: "Failed to create audit" });
  }
});

router.get("/audits", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { status, auditType } = req.query;
    
    const audits = await storage.getAudits(companyId, {
      status: status as string | undefined,
      auditType: auditType as string | undefined,
    });
    
    const auditsWithScores = await Promise.all(
      audits.map(async (audit) => {
        const auditRun = await storage.getAuditRun(audit.id);
        if (!auditRun) {
          return { ...audit, scorePercent: null, completedCount: 0, indicatorCount: 0 };
        }
        
        const indicators = await storage.getAuditTemplateIndicators(auditRun.templateId);
        const responses = await storage.getAuditIndicatorResponses(audit.id);
        
        const scorePointsTotal = responses.reduce((sum, r) => sum + r.scorePoints, 0);
        const maxPoints = indicators.length * 3;
        const scorePercent = maxPoints > 0 
          ? Math.round(Math.max(0, Math.min(100, (scorePointsTotal / maxPoints) * 100)))
          : null;
        
        return { 
          ...audit, 
          scorePercent, 
          completedCount: responses.length, 
          indicatorCount: indicators.length 
        };
      })
    );
    
    return res.json(auditsWithScores);
  } catch (error) {
    console.error("Get audits error:", error);
    return res.status(500).json({ error: "Failed to fetch audits" });
  }
});

router.get("/audits/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const scopeLineItems = await storage.getAuditScopeLineItems(auditId);
    const auditRun = await storage.getAuditRun(auditId);
    
    let template = null;
    if (auditRun) {
      template = await storage.getAuditTemplate(auditRun.templateId, companyId);
    }
    
    return res.json({
      ...audit,
      scopeLineItems,
      auditRun,
      template,
    });
  } catch (error) {
    console.error("Get audit error:", error);
    return res.status(500).json({ error: "Failed to fetch audit" });
  }
});

router.get("/audits/:id/scope-options", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    
    const selections = await storage.getCompanyServiceSelections(companyId);
    const lineItemIds = selections.map(s => s.lineItemId);
    
    if (lineItemIds.length === 0) {
      return res.json({ 
        lineItemsByCategory: [],
        selectedLineItemCount: 0,
      });
    }
    
    const allLineItems = await storage.getSupportLineItems();
    const categories = await storage.getSupportCategories();
    
    const availableLineItems = allLineItems.filter(li => lineItemIds.includes(li.id) && li.isActive);
    
    const lineItemsByCategory = categories
      .map(cat => ({
        categoryId: cat.id,
        categoryKey: cat.categoryKey,
        categoryLabel: cat.categoryLabel,
        items: availableLineItems
          .filter(li => li.categoryId === cat.id)
          .map(li => ({
            lineItemId: li.id,
            code: li.itemCode,
            label: li.itemLabel,
          })),
      }))
      .filter(g => g.items.length > 0);
    
    return res.json({ 
      lineItemsByCategory,
      selectedLineItemCount: availableLineItems.length,
    });
  } catch (error) {
    console.error("Get scope options error:", error);
    return res.status(500).json({ error: "Failed to fetch scope options" });
  }
});

const updateScopeSchema = z.object({
  lineItemIds: z.array(z.string().uuid()).min(1, "At least one line item is required"),
});

router.put("/audits/:id/scope", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    if (audit.scopeLocked) {
      return res.status(403).json({ error: "Audit scope is locked and cannot be modified" });
    }
    
    const input = updateScopeSchema.parse(req.body);
    
    const selections = await storage.getCompanyServiceSelections(companyId);
    const validLineItemIds = selections.map(s => s.lineItemId);
    const invalidIds = input.lineItemIds.filter(id => !validLineItemIds.includes(id));
    
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: "Some line items are not available for this company" });
    }
    
    await storage.setAuditScopeLineItems(auditId, input.lineItemIds);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_SCOPE_UPDATED",
      entityType: "audit",
      entityId: auditId,
      afterJson: { lineItemCount: input.lineItemIds.length },
    });
    
    return res.json({ success: true, lineItemCount: input.lineItemIds.length });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Update scope error:", error);
    return res.status(500).json({ error: "Failed to update scope" });
  }
});

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
});

router.post("/audit-templates", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const input = createTemplateSchema.parse(req.body);
    
    const template = await storage.createAuditTemplate({
      companyId,
      name: input.name,
      description: input.description || null,
    });
    
    return res.status(201).json(template);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Create template error:", error);
    return res.status(500).json({ error: "Failed to create template" });
  }
});

router.get("/audit-templates", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const templates = await storage.getAuditTemplates(companyId);
    
    const templatesWithCounts = await Promise.all(
      templates.map(async t => {
        const indicators = await storage.getAuditTemplateIndicators(t.id);
        return { ...t, indicatorCount: indicators.length };
      })
    );
    
    return res.json(templatesWithCounts);
  } catch (error) {
    console.error("Get templates error:", error);
    return res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.get("/audit-templates/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const templateId = req.params.id;
    
    const template = await storage.getAuditTemplate(templateId, companyId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const indicators = await storage.getAuditTemplateIndicators(templateId);
    
    return res.json({ ...template, indicators });
  } catch (error) {
    console.error("Get template error:", error);
    return res.status(500).json({ error: "Failed to fetch template" });
  }
});

const createIndicatorSchema = z.object({
  indicatorText: z.string().min(1, "Indicator text is required"),
  guidanceText: z.string().nullable().optional(),
  evidenceRequirements: z.string().nullable().optional(),
  riskLevel: z.enum(riskLevelEnum).optional().default("MEDIUM"),
  isCriticalControl: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
  auditDomainCode: z.enum(auditDomainCodeEnum).nullable().optional(),
});

router.post("/audit-templates/:id/indicators", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const templateId = req.params.id;
    
    const template = await storage.getAuditTemplate(templateId, companyId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const input = createIndicatorSchema.parse(req.body);
    
    const indicator = await storage.createAuditTemplateIndicator({
      templateId,
      indicatorText: input.indicatorText,
      guidanceText: input.guidanceText || null,
      evidenceRequirements: input.evidenceRequirements || null,
      riskLevel: input.riskLevel,
      isCriticalControl: input.isCriticalControl,
      sortOrder: input.sortOrder,
      auditDomainCode: input.auditDomainCode || null,
    });
    
    return res.status(201).json(indicator);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Create indicator error:", error);
    return res.status(500).json({ error: "Failed to create indicator" });
  }
});

const selectTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

router.put("/audits/:id/template", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    if (audit.scopeLocked && audit.status !== "DRAFT") {
      return res.status(403).json({ error: "Cannot change template after audit has started" });
    }
    
    const input = selectTemplateSchema.parse(req.body);
    
    const template = await storage.getAuditTemplate(input.templateId, companyId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const auditRun = await storage.upsertAuditRun({
      auditId,
      templateId: input.templateId,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_TEMPLATE_SELECTED",
      entityType: "audit",
      entityId: auditId,
      afterJson: { templateId: input.templateId, templateName: template.name },
    });
    
    return res.json(auditRun);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Select template error:", error);
    return res.status(500).json({ error: "Failed to select template" });
  }
});

router.post("/audits/:id/start", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    if (audit.status !== "DRAFT") {
      return res.status(400).json({ error: "Audit has already been started" });
    }
    
    const scopeItems = await storage.getAuditScopeLineItems(auditId);
    if (scopeItems.length === 0) {
      return res.status(400).json({ error: "At least one scope line item must be selected" });
    }
    
    const auditRun = await storage.getAuditRun(auditId);
    if (!auditRun) {
      return res.status(400).json({ error: "A template must be selected before starting" });
    }
    
    const updates: any = { status: "IN_PROGRESS" as const };
    if (audit.auditType === "EXTERNAL") {
      updates.scopeLocked = true;
    }
    
    await storage.updateAudit(auditId, companyId, updates);
    await storage.updateAuditRun(auditId, { startedAt: new Date() });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_STARTED",
      entityType: "audit",
      entityId: auditId,
      afterJson: { status: "IN_PROGRESS", scopeLocked: updates.scopeLocked || false },
    });
    
    return res.json({ success: true, status: "IN_PROGRESS" });
  } catch (error) {
    console.error("Start audit error:", error);
    return res.status(500).json({ error: "Failed to start audit" });
  }
});

router.get("/audits/:id/runner", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const auditRun = await storage.getAuditRun(auditId);
    if (!auditRun) {
      return res.status(400).json({ error: "No template selected for this audit" });
    }
    
    const template = await storage.getAuditTemplate(auditRun.templateId, companyId);
    const indicators = await storage.getAuditTemplateIndicators(auditRun.templateId);
    const responses = await storage.getAuditIndicatorResponses(auditId);
    const scopeItems = await storage.getAuditScopeLineItems(auditId);
    const scopeDomains = await storage.getAuditScopeDomains(auditId, companyId);
    
    return res.json({
      audit,
      template,
      indicators,
      responses,
      scopeItems,
      scopeDomains: scopeDomains.map(sd => ({
        id: sd.domain.id,
        code: sd.domain.code,
        name: sd.domain.name,
        isIncluded: sd.isIncluded,
      })),
      progress: {
        total: indicators.length,
        completed: responses.length,
      },
    });
  } catch (error) {
    console.error("Get runner error:", error);
    return res.status(500).json({ error: "Failed to fetch runner data" });
  }
});

router.get("/audits/:id/summary", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const auditRun = await storage.getAuditRun(auditId);
    if (!auditRun) {
      return res.json({
        indicatorCount: 0,
        conformityBestPracticeCount: 0,
        conformityCount: 0,
        minorNcCount: 0,
        majorNcCount: 0,
        scorePointsTotal: 0,
        scorePercent: 0,
        completedCount: 0,
      });
    }
    
    const indicators = await storage.getAuditTemplateIndicators(auditRun.templateId);
    const responses = await storage.getAuditIndicatorResponses(auditId);
    
    const counts = {
      CONFORMITY_BEST_PRACTICE: 0,
      CONFORMITY: 0,
      MINOR_NC: 0,
      MAJOR_NC: 0,
    };
    
    let scorePointsTotal = 0;
    responses.forEach(r => {
      if (counts.hasOwnProperty(r.rating)) {
        counts[r.rating as keyof typeof counts]++;
      }
      scorePointsTotal += r.scorePoints;
    });
    
    const indicatorCount = indicators.length;
    const maxPoints = indicatorCount * 3;
    const scorePercent = maxPoints > 0 
      ? Math.round(Math.max(0, Math.min(100, (scorePointsTotal / maxPoints) * 100)))
      : 0;
    
    return res.json({
      indicatorCount,
      conformityBestPracticeCount: counts.CONFORMITY_BEST_PRACTICE,
      conformityCount: counts.CONFORMITY,
      minorNcCount: counts.MINOR_NC,
      majorNcCount: counts.MAJOR_NC,
      scorePointsTotal,
      scorePercent,
      completedCount: responses.length,
    });
  } catch (error) {
    console.error("Get summary error:", error);
    return res.status(500).json({ error: "Failed to fetch summary" });
  }
});

const saveResponseSchema = z.object({
  rating: z.enum(indicatorRatingEnum),
  comment: z.string().nullable().optional(),
}).refine(data => {
  if (data.rating === "MINOR_NC" || data.rating === "MAJOR_NC") {
    if (!data.comment || data.comment.length < 10) {
      return false;
    }
  }
  return true;
}, { message: "Comment is required (minimum 10 characters) for Minor NC and Major NC ratings" });

router.put("/audits/:id/responses/:indicatorId", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const auditId = req.params.id;
    const indicatorId = req.params.indicatorId;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    if (audit.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Audit must be in progress to save responses" });
    }
    
    const indicator = await storage.getAuditTemplateIndicator(indicatorId);
    if (!indicator) {
      return res.status(404).json({ error: "Indicator not found" });
    }
    
    const input = saveResponseSchema.parse(req.body);
    const points = scoreForRating(input.rating);
    
    const response = await storage.upsertAuditIndicatorResponse({
      auditId,
      templateIndicatorId: indicatorId,
      rating: input.rating,
      comment: input.comment || null,
      scorePoints: points,
      scoreVersion: "v1",
      createdByCompanyUserId: userId,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_RESPONSE_SAVED",
      entityType: "audit_response",
      entityId: response.id,
      afterJson: { rating: input.rating, indicatorId },
    });
    
    if (input.rating === "MINOR_NC" || input.rating === "MAJOR_NC") {
      const existingFinding = await storage.getFindingByAuditAndIndicator(auditId, indicatorId, companyId);
      
      if (!existingFinding) {
        const findingText = `Indicator: ${indicator.indicatorText}. Auditor comment: ${input.comment}.`;
        
        const finding = await storage.createFinding({
          companyId,
          auditId,
          templateIndicatorId: indicatorId,
          severity: input.rating as "MINOR_NC" | "MAJOR_NC",
          findingText,
        });
        
        await storage.logChange({
          actorType: "company_user",
          actorId: userId,
          companyId,
          action: "FINDING_CREATED",
          entityType: "finding",
          entityId: finding.id,
          afterJson: { severity: input.rating, auditId },
        });
      }
    }
    
    return res.json(response);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Save response error:", error);
    return res.status(500).json({ error: "Failed to save response" });
  }
});

router.post("/audits/:id/in-review/responses", requireCompanyAuth, requireRole(["CompanyAdmin", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    if (audit.status !== "IN_REVIEW") {
      return res.status(400).json({ error: "Audit must be in review to add responses" });
    }
    
    const addResponseSchema = z.object({
      indicatorId: z.string().uuid(),
      rating: z.enum(indicatorRatingEnum),
      comment: z.string().nullable().optional(),
    }).refine(data => {
      if (data.rating === "MINOR_NC" || data.rating === "MAJOR_NC") {
        if (!data.comment || data.comment.length < 10) {
          return false;
        }
      }
      return true;
    }, { message: "Comment is required (minimum 10 characters) for non-conformance ratings" });
    
    const input = addResponseSchema.parse(req.body);
    
    const auditRun = await storage.getAuditRun(auditId);
    if (!auditRun) {
      return res.status(400).json({ error: "No template associated with this audit" });
    }
    
    const templateIndicators = await storage.getAuditTemplateIndicators(auditRun.templateId);
    const indicator = templateIndicators.find(i => i.id === input.indicatorId);
    if (!indicator) {
      return res.status(400).json({ error: "Indicator does not belong to this audit's template" });
    }
    
    const existingResponse = await storage.getAuditIndicatorResponse(auditId, input.indicatorId);
    if (existingResponse) {
      return res.status(400).json({ error: "This indicator already has a response. Cannot modify responses in review." });
    }
    
    const points = scoreForRating(input.rating);
    
    const response = await storage.upsertAuditIndicatorResponse({
      auditId,
      templateIndicatorId: input.indicatorId,
      rating: input.rating,
      comment: input.comment || null,
      scorePoints: points,
      scoreVersion: "v1",
      createdByCompanyUserId: userId,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_RESPONSE_ADDED_IN_REVIEW",
      entityType: "audit_response",
      entityId: response.id,
      afterJson: { rating: input.rating, indicatorId: input.indicatorId, auditId },
    });
    
    if (input.rating === "MINOR_NC" || input.rating === "MAJOR_NC") {
      const existingFinding = await storage.getFindingByAuditAndIndicator(auditId, input.indicatorId, companyId);
      
      if (!existingFinding) {
        const findingText = `Indicator: ${indicator.indicatorText}. Auditor comment: ${input.comment}.`;
        
        const finding = await storage.createFinding({
          companyId,
          auditId,
          templateIndicatorId: input.indicatorId,
          severity: input.rating as "MINOR_NC" | "MAJOR_NC",
          findingText,
        });
        
        await storage.logChange({
          actorType: "company_user",
          actorId: userId,
          companyId,
          action: "FINDING_CREATED",
          entityType: "finding",
          entityId: finding.id,
          afterJson: { severity: input.rating, auditId, addedInReview: true },
        });
      }
    }
    
    return res.json(response);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Add in-review response error:", error);
    return res.status(500).json({ error: "Failed to add response" });
  }
});

router.post("/audits/:id/submit", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    if (audit.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Audit must be in progress to submit" });
    }
    
    const auditRun = await storage.getAuditRun(auditId);
    if (!auditRun) {
      return res.status(400).json({ error: "No template selected for this audit" });
    }
    
    const indicators = await storage.getAuditTemplateIndicators(auditRun.templateId);
    const responses = await storage.getAuditIndicatorResponses(auditId);
    
    if (responses.length < indicators.length) {
      return res.status(400).json({ 
        error: "All indicators must have responses before submitting",
        missing: indicators.length - responses.length,
      });
    }
    
    await storage.updateAudit(auditId, companyId, { status: "IN_REVIEW" as const });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_SUBMITTED_FOR_REVIEW",
      entityType: "audit",
      entityId: auditId,
      afterJson: { status: "IN_REVIEW" },
    });
    
    return res.json({ success: true, status: "IN_REVIEW" });
  } catch (error) {
    console.error("Submit audit error:", error);
    return res.status(500).json({ error: "Failed to submit audit" });
  }
});

const closeAuditSchema = z.object({
  closeReason: z.string().optional(),
});

router.post("/audits/:id/close", requireCompanyAuth, requireRole(["CompanyAdmin", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const findings = await storage.getFindings(companyId, { auditId, status: "OPEN" });
    const openMajorFindings = findings.filter(f => f.severity === "MAJOR_NC");
    
    const input = closeAuditSchema.parse(req.body);
    
    if (openMajorFindings.length > 0 && !input.closeReason) {
      return res.status(400).json({ 
        error: "Cannot close audit with open major findings without providing a reason",
        openMajorFindings: openMajorFindings.length,
      });
    }
    
    await storage.updateAudit(auditId, companyId, { 
      status: "CLOSED" as const, 
      closeReason: input.closeReason || null,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_CLOSED",
      entityType: "audit",
      entityId: auditId,
      afterJson: { status: "CLOSED", closeReason: input.closeReason || null },
    });
    
    return res.json({ success: true, status: "CLOSED" });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Close audit error:", error);
    return res.status(500).json({ error: "Failed to close audit" });
  }
});

router.get("/audit-outcomes", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { rating, auditId } = req.query;
    
    if (auditId) {
      const audit = await storage.getAudit(auditId as string, companyId);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
    }
    
    const outcomes = await storage.getAuditOutcomes(companyId, {
      rating: rating as string | undefined,
      auditId: auditId as string | undefined,
    });
    
    return res.json(outcomes);
  } catch (error) {
    console.error("Get audit outcomes error:", error);
    return res.status(500).json({ error: "Failed to fetch audit outcomes" });
  }
});

router.get("/findings", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { status, severity, auditId } = req.query;
    
    const findingsList = await storage.getFindings(companyId, {
      status: status as string | undefined,
      severity: severity as string | undefined,
      auditId: auditId as string | undefined,
    });
    
    return res.json(findingsList);
  } catch (error) {
    console.error("Get findings error:", error);
    return res.status(500).json({ error: "Failed to fetch findings" });
  }
});

router.get("/findings/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const findingId = req.params.id;
    
    const finding = await storage.getFinding(findingId, companyId);
    if (!finding) {
      return res.status(404).json({ error: "Finding not found" });
    }
    
    const audit = await storage.getAudit(finding.auditId, companyId);
    const indicator = await storage.getAuditTemplateIndicator(finding.templateIndicatorId);
    
    return res.json({ ...finding, audit, indicator });
  } catch (error) {
    console.error("Get finding error:", error);
    return res.status(500).json({ error: "Failed to fetch finding" });
  }
});

const updateFindingSchema = z.object({
  ownerCompanyUserId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional().transform(s => s ? new Date(s) : null),
  status: z.enum(["OPEN", "UNDER_REVIEW", "CLOSED"]).optional(),
});

router.patch("/findings/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const userRole = req.companyUser!.role;
    const findingId = req.params.id;
    
    const finding = await storage.getFinding(findingId, companyId);
    if (!finding) {
      return res.status(404).json({ error: "Finding not found" });
    }
    
    const input = updateFindingSchema.parse(req.body);
    
    if (input.status === "CLOSED" && !["CompanyAdmin", "Reviewer"].includes(userRole)) {
      return res.status(403).json({ error: "Only CompanyAdmin or Reviewer can close findings" });
    }
    
    const updates: any = {};
    if (input.ownerCompanyUserId !== undefined) updates.ownerCompanyUserId = input.ownerCompanyUserId;
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
    if (input.status !== undefined) updates.status = input.status;
    
    const updated = await storage.updateFinding(findingId, companyId, updates);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "FINDING_UPDATED",
      entityType: "finding",
      entityId: findingId,
      beforeJson: { status: finding.status },
      afterJson: updates,
    });
    
    return res.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Update finding error:", error);
    return res.status(500).json({ error: "Failed to update finding" });
  }
});

// ===== EVIDENCE REQUEST ROUTES =====

const createEvidenceRequestSchema = z.object({
  evidenceType: z.enum(evidenceTypeEnum),
  requestNote: z.string().min(1, "Request note is required"),
  dueDate: z.string().nullable().optional().transform(s => s ? new Date(s) : null),
});

router.post("/findings/:id/request-evidence", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const findingId = req.params.id;
    
    const finding = await storage.getFinding(findingId, companyId);
    if (!finding) {
      return res.status(404).json({ error: "Finding not found" });
    }
    
    const existingRequest = await storage.getEvidenceRequestByFindingId(findingId, companyId);
    if (existingRequest) {
      return res.status(400).json({ error: "Evidence request already exists for this finding" });
    }
    
    const input = createEvidenceRequestSchema.parse(req.body);
    
    const evidenceRequest = await storage.createEvidenceRequest({
      findingId,
      auditId: finding.auditId,
      companyId,
      evidenceType: input.evidenceType,
      requestNote: input.requestNote,
      status: "REQUESTED",
      requestedByCompanyUserId: userId,
      dueDate: input.dueDate,
      publicToken: generatePublicToken(),
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "EVIDENCE_REQUESTED",
      entityType: "evidence_request",
      entityId: evidenceRequest.id,
      afterJson: { findingId, evidenceType: input.evidenceType },
    });
    
    return res.status(201).json(evidenceRequest);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Create evidence request error:", error);
    return res.status(500).json({ error: "Failed to create evidence request" });
  }
});

router.get("/evidence/requests", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { status, auditId } = req.query;
    
    const filters: { status?: string; auditId?: string } = {};
    if (status && typeof status === "string") filters.status = status;
    if (auditId && typeof auditId === "string") filters.auditId = auditId;
    
    const requests = await storage.getEvidenceRequests(companyId, filters);
    
    const requestsWithDetails = await Promise.all(requests.map(async (request) => {
      let indicator = null;
      let audit = null;
      
      if (request.auditId) {
        audit = await storage.getAudit(request.auditId, companyId);
      }
      
      if (request.templateIndicatorId && audit) {
        const indicatorData = await storage.getAuditTemplateIndicator(request.templateIndicatorId);
        if (indicatorData) {
          const template = await storage.getAuditTemplate(indicatorData.templateId, companyId);
          if (template) {
            indicator = indicatorData;
          }
        }
      }
      
      return {
        ...request,
        indicator: indicator ? { id: indicator.id, indicatorText: indicator.indicatorText } : null,
        audit: audit ? { id: audit.id, title: audit.title, serviceContextLabel: audit.serviceContextLabel } : null,
      };
    }));
    
    return res.json(requestsWithDetails);
  } catch (error) {
    console.error("Get evidence requests error:", error);
    return res.status(500).json({ error: "Failed to fetch evidence requests" });
  }
});

router.get("/evidence/requests/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const requestId = req.params.id;
    
    const evidenceRequest = await storage.getEvidenceRequest(requestId, companyId);
    if (!evidenceRequest) {
      return res.status(404).json({ error: "Evidence request not found" });
    }
    
    const finding = evidenceRequest.findingId 
      ? await storage.getFinding(evidenceRequest.findingId, companyId)
      : null;
    const audit = evidenceRequest.auditId
      ? await storage.getAudit(evidenceRequest.auditId, companyId)
      : null;
    const items = await storage.getEvidenceItems(requestId, companyId);
    
    return res.json({ ...evidenceRequest, finding, audit, items });
  } catch (error) {
    console.error("Get evidence request error:", error);
    return res.status(500).json({ error: "Failed to fetch evidence request" });
  }
});

// Standalone evidence request (not linked to audit or finding)
const standaloneEvidenceRequestSchema = z.object({
  evidenceType: z.enum(evidenceTypeEnum),
  requestNote: z.string().min(1, "Request note is required"),
  dueDate: z.string().nullable().optional().transform(s => s ? new Date(s) : null),
});

router.post("/evidence/requests", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const input = standaloneEvidenceRequestSchema.parse(req.body);
    
    const evidenceRequest = await storage.createEvidenceRequest({
      companyId,
      evidenceType: input.evidenceType,
      requestNote: input.requestNote,
      status: "REQUESTED",
      requestedByCompanyUserId: userId,
      dueDate: input.dueDate,
      publicToken: generatePublicToken(),
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "EVIDENCE_REQUESTED",
      entityType: "evidence_request",
      entityId: evidenceRequest.id,
      afterJson: { evidenceType: input.evidenceType, standalone: true },
    });
    
    return res.status(201).json(evidenceRequest);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Create standalone evidence request error:", error);
    return res.status(500).json({ error: "Failed to create evidence request" });
  }
});

// Audit-linked evidence request (pre-finding)
const auditEvidenceRequestSchema = z.object({
  evidenceType: z.enum(evidenceTypeEnum),
  requestNote: z.string().min(1, "Request note is required"),
  templateIndicatorId: z.string().optional(),
  dueDate: z.string().nullable().optional().transform(s => s ? new Date(s) : null),
});

router.post("/audits/:id/request-evidence", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const input = auditEvidenceRequestSchema.parse(req.body);
    
    const evidenceRequest = await storage.createEvidenceRequest({
      companyId,
      auditId,
      templateIndicatorId: input.templateIndicatorId || null,
      evidenceType: input.evidenceType,
      requestNote: input.requestNote,
      status: "REQUESTED",
      requestedByCompanyUserId: userId,
      dueDate: input.dueDate,
      publicToken: generatePublicToken(),
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "EVIDENCE_REQUESTED",
      entityType: "evidence_request",
      entityId: evidenceRequest.id,
      afterJson: { auditId, evidenceType: input.evidenceType, templateIndicatorId: input.templateIndicatorId },
    });
    
    return res.status(201).json(evidenceRequest);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Create audit evidence request error:", error);
    return res.status(500).json({ error: "Failed to create evidence request" });
  }
});

// Get all evidence requests for an audit
router.get("/audits/:id/evidence-requests", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const auditId = req.params.id;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const requests = await storage.getEvidenceRequestsByAuditId(auditId, companyId);
    return res.json(requests);
  } catch (error) {
    console.error("Get audit evidence requests error:", error);
    return res.status(500).json({ error: "Failed to fetch evidence requests" });
  }
});

const submitEvidenceSchema = z.object({
  storageKind: z.enum(["UPLOAD", "LINK"]),
  fileName: z.string().min(1),
  filePath: z.string().optional(),
  externalUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  fileSizeBytes: z.number().int().positive().optional(),
  note: z.string().optional(),
}).refine(data => {
  if (data.storageKind === "UPLOAD") {
    return data.filePath && data.mimeType;
  }
  if (data.storageKind === "LINK") {
    return data.externalUrl;
  }
  return false;
}, { message: "Upload requires filePath and mimeType; Link requires externalUrl" });

router.post("/evidence/requests/:id/submit", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const requestId = req.params.id;
    
    const evidenceRequest = await storage.getEvidenceRequest(requestId, companyId);
    if (!evidenceRequest) {
      return res.status(404).json({ error: "Evidence request not found" });
    }
    
    if (!["REQUESTED", "REJECTED"].includes(evidenceRequest.status)) {
      return res.status(400).json({ error: "Evidence cannot be submitted in current status" });
    }
    
    const input = submitEvidenceSchema.parse(req.body);
    
    const evidenceItem = await storage.createEvidenceItem({
      evidenceRequestId: requestId,
      companyId,
      storageKind: input.storageKind,
      fileName: input.fileName,
      filePath: input.filePath || null,
      externalUrl: input.externalUrl || null,
      mimeType: input.mimeType || null,
      fileSizeBytes: input.fileSizeBytes || null,
      note: input.note || null,
      uploadedByCompanyUserId: userId,
    });
    
    await storage.updateEvidenceRequest(requestId, companyId, {
      status: "SUBMITTED",
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "EVIDENCE_SUBMITTED",
      entityType: "evidence_item",
      entityId: evidenceItem.id,
      afterJson: { evidenceRequestId: requestId, fileName: input.fileName, storageKind: input.storageKind },
    });
    
    return res.status(201).json(evidenceItem);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Submit evidence error:", error);
    return res.status(500).json({ error: "Failed to submit evidence" });
  }
});

router.get("/evidence/items/:itemId/download", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const itemId = req.params.itemId;
    
    const item = await storage.getEvidenceItem(itemId, companyId);
    if (!item) {
      return res.status(404).json({ error: "Evidence item not found" });
    }
    
    if (item.storageKind !== "UPLOAD" || !item.filePath) {
      return res.status(400).json({ error: "This item is not a downloadable file" });
    }
    
    const fs = await import("fs");
    const path = await import("path");
    
    if (!fs.existsSync(item.filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }
    
    res.setHeader("Content-Disposition", `attachment; filename="${item.fileName}"`);
    res.setHeader("Content-Type", item.mimeType || "application/octet-stream");
    
    const fileStream = fs.createReadStream(item.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Download evidence error:", error);
    return res.status(500).json({ error: "Failed to download file" });
  }
});

router.post("/evidence/requests/:id/start-review", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const requestId = req.params.id;
    
    const evidenceRequest = await storage.getEvidenceRequest(requestId, companyId);
    if (!evidenceRequest) {
      return res.status(404).json({ error: "Evidence request not found" });
    }
    
    if (evidenceRequest.status !== "SUBMITTED") {
      return res.status(400).json({ error: "Only submitted evidence can be put under review" });
    }
    
    const updated = await storage.updateEvidenceRequest(requestId, companyId, {
      status: "UNDER_REVIEW",
      reviewedByCompanyUserId: userId,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "EVIDENCE_REVIEW_STARTED",
      entityType: "evidence_request",
      entityId: requestId,
      beforeJson: { status: evidenceRequest.status },
      afterJson: { status: "UNDER_REVIEW" },
    });
    
    return res.json(updated);
  } catch (error) {
    console.error("Start review error:", error);
    return res.status(500).json({ error: "Failed to start review" });
  }
});

const reviewEvidenceSchema = z.object({
  decision: z.enum(["ACCEPTED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

router.post("/evidence/requests/:id/review", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const requestId = req.params.id;
    
    const evidenceRequest = await storage.getEvidenceRequest(requestId, companyId);
    if (!evidenceRequest) {
      return res.status(404).json({ error: "Evidence request not found" });
    }
    
    if (evidenceRequest.status !== "UNDER_REVIEW") {
      return res.status(400).json({ error: "Evidence must be under review before final decision" });
    }
    
    const input = reviewEvidenceSchema.parse(req.body);
    
    const newStatus = input.decision === "ACCEPTED" ? "ACCEPTED" : "REJECTED";
    
    const updated = await storage.updateEvidenceRequest(requestId, companyId, {
      status: newStatus,
      reviewedByCompanyUserId: userId,
      reviewedAt: new Date(),
      reviewNote: input.reviewNote || null,
    });
    
    if (input.decision === "ACCEPTED" && evidenceRequest.findingId) {
      const finding = await storage.getFinding(evidenceRequest.findingId, companyId);
      if (finding) {
        await storage.updateFinding(finding.id, companyId, {
          status: "CLOSED",
          closureNote: input.reviewNote || "Evidence accepted",
          closedAt: new Date(),
          closedByCompanyUserId: userId,
        });
      }
    }
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: input.decision === "ACCEPTED" ? "EVIDENCE_ACCEPTED" : "EVIDENCE_REJECTED",
      entityType: "evidence_request",
      entityId: requestId,
      beforeJson: { status: evidenceRequest.status },
      afterJson: { status: newStatus, reviewNote: input.reviewNote },
    });
    
    return res.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Review evidence error:", error);
    return res.status(500).json({ error: "Failed to review evidence" });
  }
});

router.get("/findings/:id/evidence", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const findingId = req.params.id;
    
    const finding = await storage.getFinding(findingId, companyId);
    if (!finding) {
      return res.status(404).json({ error: "Finding not found" });
    }
    
    const evidenceRequest = await storage.getEvidenceRequestByFindingId(findingId, companyId);
    if (!evidenceRequest) {
      return res.json({ evidenceRequest: null, items: [] });
    }
    
    const items = await storage.getEvidenceItems(evidenceRequest.id, companyId);
    return res.json({ evidenceRequest, items });
  } catch (error) {
    console.error("Get finding evidence error:", error);
    return res.status(500).json({ error: "Failed to fetch evidence" });
  }
});

// ============ AUDIT DOMAINS ============

router.get("/audit-domains", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const domains = await storage.ensureDefaultDomainsExist(companyId);
    return res.json(domains);
  } catch (error) {
    console.error("Get audit domains error:", error);
    return res.status(500).json({ error: "Failed to fetch audit domains" });
  }
});

router.get("/audits/:auditId/domains", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const scopeDomains = await storage.getAuditScopeDomains(auditId, companyId);
    return res.json(scopeDomains);
  } catch (error) {
    console.error("Get audit scope domains error:", error);
    return res.status(500).json({ error: "Failed to fetch audit domains" });
  }
});

const updateAuditDomainsSchema = z.object({
  domainIds: z.array(z.string()),
});

router.put("/audits/:auditId/domains", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    if (audit.scopeLocked) {
      return res.status(400).json({ error: "Audit scope is locked" });
    }
    
    const parsed = updateAuditDomainsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    await storage.setAuditScopeDomains(auditId, companyId, parsed.data.domainIds);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "AUDIT_DOMAINS_UPDATED",
      entityType: "audit",
      entityId: auditId,
      afterJson: { domainIds: parsed.data.domainIds },
    });
    
    const updated = await storage.getAuditScopeDomains(auditId, companyId);
    return res.json(updated);
  } catch (error) {
    console.error("Update audit domains error:", error);
    return res.status(500).json({ error: "Failed to update audit domains" });
  }
});

// ============ STANDARD INDICATORS LIBRARY ============

router.get("/standard-indicators", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    await storage.ensureStandardIndicatorsSeeded();
    
    const domainCodes = req.query.domains 
      ? (req.query.domains as string).split(',').filter(Boolean)
      : undefined;
    
    const indicators = await storage.getStandardIndicators(domainCodes);
    return res.json(indicators);
  } catch (error) {
    console.error("Get standard indicators error:", error);
    return res.status(500).json({ error: "Failed to fetch standard indicators" });
  }
});

router.get("/standard-indicators/:domainCode", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    await storage.ensureStandardIndicatorsSeeded();
    
    const { domainCode } = req.params;
    const indicators = await storage.getStandardIndicatorsByDomain(domainCode);
    return res.json(indicators);
  } catch (error) {
    console.error("Get standard indicators by domain error:", error);
    return res.status(500).json({ error: "Failed to fetch standard indicators" });
  }
});

router.get("/document-checklists/templates", requireCompanyAuth, async (_req: AuthenticatedCompanyRequest, res) => {
  try {
    const templates = await storage.getDocumentChecklistTemplates();
    return res.json(templates);
  } catch (error) {
    console.error("Get document checklist templates error:", error);
    return res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.get("/document-checklists/templates/:documentType", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const { documentType } = req.params;
    const template = await storage.getDocumentChecklistTemplate(documentType);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found for document type" });
    }
    
    return res.json(template);
  } catch (error) {
    console.error("Get document checklist template error:", error);
    return res.status(500).json({ error: "Failed to fetch template" });
  }
});

const documentReviewSchema = z.object({
  evidenceRequestId: z.string(),
  evidenceItemId: z.string(),
  auditId: z.string().optional(),
  responses: z.array(z.object({
    itemId: z.string(),
    response: z.enum(["YES", "NO", "PARTLY", "NA"]),
  })),
  decision: z.enum(["ACCEPT", "REJECT"]),
  comments: z.string().optional(),
});

router.post("/document-reviews", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const reviewerId = req.companyUser!.companyUserId;
    
    const parsed = documentReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const { evidenceRequestId, evidenceItemId, auditId, responses, decision, comments } = parsed.data;
    
    const evidenceRequest = await storage.getEvidenceRequest(evidenceRequestId, companyId);
    if (!evidenceRequest) {
      return res.status(404).json({ error: "Evidence request not found" });
    }
    
    const evidenceItem = await storage.getEvidenceItem(evidenceItemId, companyId);
    if (!evidenceItem) {
      return res.status(404).json({ error: "Evidence item not found" });
    }
    
    if (!evidenceItem.documentType) {
      return res.status(400).json({ error: "Evidence item has no document type assigned" });
    }
    
    const template = await storage.getDocumentChecklistTemplate(evidenceItem.documentType);
    if (!template) {
      return res.status(400).json({ error: "No checklist template found for document type" });
    }
    
    const templateItems = template.items;
    const criticalItems = templateItems.filter(item => item.isCritical);
    
    let yesCount = 0;
    let partlyCount = 0;
    let criticalFailures = 0;
    
    for (const response of responses) {
      const templateItem = templateItems.find(ti => ti.id === response.itemId);
      if (!templateItem) continue;
      
      if (response.response === "YES") {
        yesCount++;
      } else if (response.response === "PARTLY") {
        partlyCount++;
      }
      
      if (templateItem.isCritical && (response.response === "NO")) {
        criticalFailures++;
      }
    }
    
    const applicableItemCount = responses.filter(r => r.response !== "NA").length;
    const dqsScore = applicableItemCount > 0 
      ? Math.round(((yesCount + (partlyCount * 0.5)) / applicableItemCount) * 100)
      : 0;
    
    const review = await storage.createDocumentReview({
      companyId,
      evidenceRequestId,
      evidenceItemId,
      checklistTemplateId: template.id,
      reviewerCompanyUserId: reviewerId,
      responses: responses as any,
      decision,
      dqsPercent: dqsScore,
      criticalFailuresCount: criticalFailures,
      auditId: auditId || null,
      comments: comments || null,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: reviewerId,
      companyId,
      action: "DOCUMENT_REVIEWED",
      entityType: "evidence_item",
      entityId: evidenceItemId,
      afterJson: { reviewId: review.id, decision, dqsScore, criticalFailures },
    });
    
    // Generate suggested finding based on DQS score and critical failures
    // This is a non-binding suggestion - auditor must take action to create actual finding
    let suggestedType: "OBSERVATION" | "MINOR_NC" | "MAJOR_NC" | "NONE" = "NONE";
    let severityFlag: "LOW" | "MEDIUM" | "HIGH" | null = null;
    let rationaleText = "";
    
    if (criticalFailures > 0) {
      // Any critical failure suggests Major NC
      suggestedType = "MAJOR_NC";
      severityFlag = "HIGH";
      rationaleText = `Document review identified ${criticalFailures} critical checklist failure(s). Critical items indicate fundamental compliance issues that typically warrant a Major Non-Conformance.`;
    } else if (dqsScore < 50) {
      // Very low DQS suggests Minor NC
      suggestedType = "MINOR_NC";
      severityFlag = "MEDIUM";
      rationaleText = `Document Quality Score of ${dqsScore}% is below the 50% threshold. This indicates multiple checklist items were not satisfied and may warrant a Minor Non-Conformance.`;
    }
    // DQS >= 50 with no critical failures = no suggestion needed (observations removed from rating system)
    
    let suggestedFinding = null;
    if (suggestedType !== "NONE" && auditId) {
      // Only create suggestion if linked to an audit
      // Look up indicator response by template indicator if available
      let indicatorResponseId: string | null = null;
      if (evidenceRequest.templateIndicatorId) {
        const responses = await storage.getAuditIndicatorResponses(auditId);
        const matchingResponse = responses.find((r: { templateIndicatorId: string; id: string }) => r.templateIndicatorId === evidenceRequest.templateIndicatorId);
        indicatorResponseId = matchingResponse?.id || null;
      }
      
      suggestedFinding = await storage.createSuggestedFinding({
        companyId,
        auditId,
        indicatorResponseId,
        evidenceRequestId,
        documentReviewId: review.id,
        suggestedType,
        severityFlag,
        rationaleText,
        status: "PENDING",
      });
      
      await storage.logChange({
        actorType: "system",
        actorId: "system",
        companyId,
        action: "SUGGESTED_FINDING_GENERATED",
        entityType: "suggested_finding",
        entityId: suggestedFinding.id,
        afterJson: { suggestedType, severityFlag, dqsScore, criticalFailures },
      });
    }
    
    return res.status(201).json({ review, suggestedFinding });
  } catch (error) {
    console.error("Create document review error:", error);
    return res.status(500).json({ error: "Failed to create document review" });
  }
});

router.get("/document-reviews/:evidenceItemId", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { evidenceItemId } = req.params;
    
    const review = await storage.getDocumentReviewByEvidenceItem(evidenceItemId, companyId);
    if (!review) {
      return res.status(404).json({ error: "No review found for this evidence item" });
    }
    
    return res.json(review);
  } catch (error) {
    console.error("Get document review error:", error);
    return res.status(500).json({ error: "Failed to fetch document review" });
  }
});

// Suggested Findings endpoints
router.get("/suggested-findings", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { auditId } = req.query;
    
    const suggestions = await storage.getPendingSuggestedFindings(companyId, { 
      auditId: auditId as string | undefined 
    });
    
    return res.json(suggestions);
  } catch (error) {
    console.error("Get suggested findings error:", error);
    return res.status(500).json({ error: "Failed to fetch suggested findings" });
  }
});

router.get("/suggested-findings/indicator/:indicatorResponseId", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { indicatorResponseId } = req.params;
    
    const suggestions = await storage.getSuggestedFindingsForIndicator(indicatorResponseId, companyId);
    
    return res.json(suggestions);
  } catch (error) {
    console.error("Get suggested findings for indicator error:", error);
    return res.status(500).json({ error: "Failed to fetch suggested findings" });
  }
});

router.get("/suggested-findings/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const suggestion = await storage.getSuggestedFinding(id, companyId);
    if (!suggestion) {
      return res.status(404).json({ error: "Suggested finding not found" });
    }
    
    return res.json(suggestion);
  } catch (error) {
    console.error("Get suggested finding error:", error);
    return res.status(500).json({ error: "Failed to fetch suggested finding" });
  }
});

const confirmSuggestionSchema = z.object({
  findingType: z.enum(["OBSERVATION", "MINOR_NC", "MAJOR_NC"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

router.post("/suggested-findings/:id/confirm", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { id } = req.params;
    
    const parsed = confirmSuggestionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const { findingType, description } = parsed.data;
    
    const suggestion = await storage.getSuggestedFinding(id, companyId);
    if (!suggestion) {
      return res.status(404).json({ error: "Suggested finding not found" });
    }
    
    if (suggestion.status !== "PENDING") {
      return res.status(400).json({ error: "Suggestion has already been processed" });
    }
    
    // Get audit to ensure it's valid and in correct state
    const audit = await storage.getAudit(suggestion.auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Associated audit not found" });
    }
    
    // Get the evidence request to find the template indicator
    const evidenceRequest = await storage.getEvidenceRequest(suggestion.evidenceRequestId, companyId);
    if (!evidenceRequest) {
      return res.status(404).json({ error: "Associated evidence request not found" });
    }
    
    let finding = null;
    
    // Validate that evidence request has a template indicator
    if (!evidenceRequest.templateIndicatorId) {
      return res.status(400).json({ error: "Cannot process: evidence request has no template indicator" });
    }
    
    // Create or update the indicator response with the confirmed rating
    // This ensures the finding appears in the Audit Results page
    await storage.upsertAuditIndicatorResponse({
      auditId: suggestion.auditId,
      templateIndicatorId: evidenceRequest.templateIndicatorId,
      rating: findingType as IndicatorRating,
      comment: description,
      status: "OPEN",
      createdByCompanyUserId: userId,
      scorePoints: scoreForRating(findingType as IndicatorRating),
      scoreVersion: "v1",
    });
    
    // Only create finding for non-conformances (not observations)
    // Findings table only supports MINOR_NC and MAJOR_NC severities
    if (findingType === "MINOR_NC" || findingType === "MAJOR_NC") {
      finding = await storage.createFinding({
        companyId,
        auditId: suggestion.auditId,
        templateIndicatorId: evidenceRequest.templateIndicatorId,
        severity: findingType,
        findingText: description,
        status: "OPEN",
      });
    }
    // For OBSERVATION type, we create indicator response but not a finding
    // Observations are tracked as indicator ratings, not as findings
    
    // Update suggestion to confirmed status
    const updatedSuggestion = await storage.confirmSuggestedFinding(id, companyId, finding?.id || "observation-noted");
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "SUGGESTED_FINDING_CONFIRMED",
      entityType: "suggested_finding",
      entityId: id,
      afterJson: { findingId: finding?.id || null, confirmedType: findingType },
    });
    
    return res.json({ suggestion: updatedSuggestion, finding });
  } catch (error) {
    console.error("Confirm suggested finding error:", error);
    return res.status(500).json({ error: "Failed to confirm suggested finding" });
  }
});

const dismissSuggestionSchema = z.object({
  reason: z.string().optional(),
});

router.post("/suggested-findings/:id/dismiss", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { id } = req.params;
    
    const parsed = dismissSuggestionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const { reason } = parsed.data;
    
    const suggestion = await storage.getSuggestedFinding(id, companyId);
    if (!suggestion) {
      return res.status(404).json({ error: "Suggested finding not found" });
    }
    
    if (suggestion.status !== "PENDING") {
      return res.status(400).json({ error: "Suggestion has already been processed" });
    }
    
    const updatedSuggestion = await storage.dismissSuggestedFinding(id, companyId, userId, reason);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "SUGGESTED_FINDING_DISMISSED",
      entityType: "suggested_finding",
      entityId: id,
      afterJson: { reason: reason || "No reason provided" },
    });
    
    return res.json(updatedSuggestion);
  } catch (error) {
    console.error("Dismiss suggested finding error:", error);
    return res.status(500).json({ error: "Failed to dismiss suggested finding" });
  }
});

// =====================
// INTERVIEW TRACKING
// =====================

const createInterviewSchema = z.object({
  interviewType: z.enum(["PARTICIPANT", "STAFF", "STAKEHOLDER"]),
  interviewMethod: z.enum(["FACE_TO_FACE", "PHONE", "VIDEO", "FOCUS_GROUP"]),
  intervieweeName: z.string().optional(),
  intervieweeRole: z.string().optional(),
  interviewDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
  topicsCovered: z.array(z.string()).optional(),
  keyObservations: z.string().optional(),
  notes: z.string().optional(),
});

router.get("/audits/:auditId/interviews", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const interviews = await storage.getAuditInterviews(auditId, companyId);
    return res.json(interviews);
  } catch (error) {
    console.error("Get interviews error:", error);
    return res.status(500).json({ error: "Failed to fetch interviews" });
  }
});

router.post("/audits/:auditId/interviews", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const parsed = createInterviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const interview = await storage.createAuditInterview({
      companyId,
      auditId,
      ...parsed.data,
      conductedByCompanyUserId: userId,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "INTERVIEW_CREATED",
      entityType: "audit_interview",
      entityId: interview.id,
      afterJson: { interviewType: interview.interviewType, interviewMethod: interview.interviewMethod },
    });
    
    return res.status(201).json(interview);
  } catch (error) {
    console.error("Create interview error:", error);
    return res.status(500).json({ error: "Failed to create interview" });
  }
});

router.delete("/audits/:auditId/interviews/:interviewId", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId, interviewId } = req.params;
    
    // Verify audit ownership
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    await storage.deleteAuditInterview(interviewId, companyId);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "INTERVIEW_DELETED",
      entityType: "audit_interview",
      entityId: interviewId,
    });
    
    return res.status(204).send();
  } catch (error) {
    console.error("Delete interview error:", error);
    return res.status(500).json({ error: "Failed to delete interview" });
  }
});

// =====================
// SITE VISIT TRACKING
// =====================

const createSiteVisitSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteAddress: z.string().optional(),
  visitDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
  ndisGroupsWitnessed: z.array(z.string()).optional(),
  participantsAtSite: z.number().optional(),
  filesReviewedCount: z.number().optional(),
  observationsPositive: z.string().optional(),
  observationsConcerns: z.string().optional(),
  safetyItemsChecked: z.array(z.object({ item: z.string(), checked: z.boolean() })).optional(),
  notes: z.string().optional(),
});

router.get("/audits/:auditId/site-visits", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const siteVisits = await storage.getAuditSiteVisits(auditId, companyId);
    return res.json(siteVisits);
  } catch (error) {
    console.error("Get site visits error:", error);
    return res.status(500).json({ error: "Failed to fetch site visits" });
  }
});

router.post("/audits/:auditId/site-visits", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const parsed = createSiteVisitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const siteVisit = await storage.createAuditSiteVisit({
      companyId,
      auditId,
      ...parsed.data,
      conductedByCompanyUserId: userId,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "SITE_VISIT_CREATED",
      entityType: "audit_site_visit",
      entityId: siteVisit.id,
      afterJson: { siteName: siteVisit.siteName },
    });
    
    return res.status(201).json(siteVisit);
  } catch (error) {
    console.error("Create site visit error:", error);
    return res.status(500).json({ error: "Failed to create site visit" });
  }
});

router.delete("/audits/:auditId/site-visits/:visitId", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId, visitId } = req.params;
    
    // Verify audit ownership
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    await storage.deleteAuditSiteVisit(visitId, companyId);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "SITE_VISIT_DELETED",
      entityType: "audit_site_visit",
      entityId: visitId,
    });
    
    return res.status(204).send();
  } catch (error) {
    console.error("Delete site visit error:", error);
    return res.status(500).json({ error: "Failed to delete site visit" });
  }
});

// =====================
// AUDIT REPORT DATA
// =====================

router.get("/audits/:auditId/report-data", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { auditId } = req.params;
    
    const reportData = await storage.getAuditReportData(auditId, companyId);
    if (!reportData) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    return res.json(reportData);
  } catch (error) {
    console.error("Get report data error:", error);
    return res.status(500).json({ error: "Failed to fetch report data" });
  }
});

// PDF Report Download
import { generateAuditReportPDF } from "../services/pdf-report";

router.get("/audits/:auditId/download-pdf", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { auditId } = req.params;
    
    const reportData = await storage.getAuditReportData(auditId, companyId);
    if (!reportData) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const doc = generateAuditReportPDF(reportData);
    
    const sanitizedTitle = reportData.audit.title.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `Audit_Report_${sanitizedTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    return res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

// =====================
// AI EXECUTIVE SUMMARY
// =====================

import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const generateSummarySchema = z.object({
  regenerate: z.boolean().optional(),
});

router.post("/audits/:auditId/generate-executive-summary", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId } = req.params;
    
    const reportData = await storage.getAuditReportData(auditId, companyId);
    if (!reportData) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    // Check if already has summary and not regenerating
    const parsed = generateSummarySchema.safeParse(req.body);
    if (reportData.audit.executiveSummary && !parsed.data?.regenerate) {
      return res.json({ summary: reportData.audit.executiveSummary, cached: true });
    }
    
    // Build context for AI
    const { audit, company, interviews, siteVisits, indicatorResponses, findings } = reportData;
    
    const conformityBestPracticeCount = indicatorResponses.filter((r: any) => r.rating === "CONFORMITY_BEST_PRACTICE").length;
    const conformityCount = indicatorResponses.filter((r: any) => r.rating === "CONFORMITY").length;
    const minorNcCount = indicatorResponses.filter((r: any) => r.rating === "MINOR_NC").length;
    const majorNcCount = indicatorResponses.filter((r: any) => r.rating === "MAJOR_NC").length;
    const totalIndicators = indicatorResponses.length;
    
    const scorePoints = indicatorResponses.reduce((sum: number, r: any) => sum + (r.scorePoints || 0), 0);
    const maxPoints = totalIndicators * 3;
    const scorePercent = maxPoints > 0 ? Math.round((scorePoints / maxPoints) * 100) : 0;
    
    const prompt = `You are writing an executive summary for an NDIS (National Disability Insurance Scheme) provider audit report. Write in a professional, objective third-person tone suitable for regulatory review.

AUDIT DETAILS:
- Provider: ${company?.name || 'Unknown Provider'}
- Audit Type: ${audit.auditType}
- Service Context: ${audit.serviceContextLabel}
- Audit Period: ${new Date(audit.scopeTimeFrom).toLocaleDateString()} to ${new Date(audit.scopeTimeTo).toLocaleDateString()}

AUDIT RESULTS:
- Total Indicators Assessed: ${totalIndicators}
- Conformity with Best Practice: ${conformityBestPracticeCount} (exceeds requirements with exemplary practice)
- Conformity: ${conformityCount} (meets requirements)
- Minor Non-Conformances: ${minorNcCount} (requires corrective action)
- Major Non-Conformances: ${majorNcCount} (critical issues requiring immediate attention)
- Overall Score: ${scorePercent}% (${scorePoints}/${maxPoints} points)

INTERVIEWS CONDUCTED: ${interviews.length}
${interviews.map((i: any) => `- ${i.interviewType} (${i.method})${i.keyObservations ? ': ' + i.keyObservations.substring(0, 100) : ''}`).join('\n')}

SITE VISITS: ${siteVisits.length}
${siteVisits.map((s: any) => `- ${s.siteName}${s.observationsPositive ? ': ' + s.observationsPositive.substring(0, 100) : ''}`).join('\n')}

${findings.length > 0 ? `KEY FINDINGS (${findings.length} total):
${findings.slice(0, 5).map((f: any) => `- [${f.severity}] ${f.findingText?.substring(0, 150) || 'No description'}`).join('\n')}` : ''}

Write a 2-3 paragraph executive summary that:
1. Opens with the audit purpose and methodology used
2. Summarizes key strengths observed during the audit
3. Highlights areas requiring improvement and any non-conformances identified
4. Concludes with overall assessment and recommendation (e.g., continued certification, conditional certification with remediation, etc.)

Keep the tone professional and balanced. Focus on facts rather than opinions. Limit to approximately 250-350 words.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert NDIS compliance auditor writing professional audit reports." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });
    
    const summary = completion.choices[0]?.message?.content || "";
    
    // Save the generated summary
    await storage.updateAuditExecutiveSummary(auditId, companyId, summary, userId);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "EXECUTIVE_SUMMARY_GENERATED",
      entityType: "audit",
      entityId: auditId,
      afterJson: { wordCount: summary.split(/\s+/).length },
    });
    
    return res.json({ summary, cached: false });
  } catch (error) {
    console.error("Generate executive summary error:", error);
    return res.status(500).json({ error: "Failed to generate executive summary" });
  }
});

const updateSummarySchema = z.object({
  summary: z.string().min(50, "Summary must be at least 50 characters"),
});

router.put("/audits/:auditId/executive-summary", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId } = req.params;
    
    const parsed = updateSummarySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const updated = await storage.updateAuditExecutiveSummary(auditId, companyId, parsed.data.summary, userId);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "EXECUTIVE_SUMMARY_UPDATED",
      entityType: "audit",
      entityId: auditId,
      afterJson: { wordCount: parsed.data.summary.split(/\s+/).length },
    });
    
    return res.json(updated);
  } catch (error) {
    console.error("Update executive summary error:", error);
    return res.status(500).json({ error: "Failed to update executive summary" });
  }
});

// =====================
// AI FINDING DRAFT GENERATION
// =====================

const generateFindingDraftSchema = z.object({
  indicatorText: z.string().min(1, "Indicator text is required"),
  rating: z.enum(["MINOR_NC", "MAJOR_NC"] as const),
  comment: z.string().optional(),
  domainCode: z.string().optional(),
  evidenceRequirements: z.string().optional(),
});

router.post("/audits/:auditId/generate-finding-draft", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const parsed = generateFindingDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const { indicatorText, rating, comment, domainCode, evidenceRequirements } = parsed.data;
    
    const severityLabel = rating === "MAJOR_NC" ? "Major Non-Conformance" : "Minor Non-Conformance";
    const domainLabels: Record<string, string> = {
      GOV_POLICY: "Governance & Policy",
      STAFF_PERSONNEL: "Staff & Personnel",
      OPERATIONAL: "Operational / Client Specific",
      SITE_ENVIRONMENT: "Site-Specific & Environment",
    };
    const domainLabel = domainCode ? domainLabels[domainCode] || domainCode : "General";
    
    const prompt = `You are an expert NDIS compliance auditor drafting a professional finding for an audit report. Write in a clear, objective, factual tone suitable for regulatory review.

CONTEXT:
- Service Provider: ${audit.entityName || 'NDIS Provider'}
- Service Type: ${audit.serviceContextLabel || 'NDIS Service'}
- Compliance Domain: ${domainLabel}

INDICATOR ASSESSED:
"${indicatorText}"

${evidenceRequirements ? `EXPECTED EVIDENCE:
${evidenceRequirements}

` : ''}AUDITOR RATING: ${severityLabel}

${comment ? `AUDITOR OBSERVATIONS:
${comment}

` : ''}Generate a professional finding draft that includes:

1. **Finding Statement** (1-2 sentences): A clear, factual statement of what was observed that led to the non-conformance. Use objective language - "The organization did not..." or "Evidence reviewed did not demonstrate..."

2. **Reference** (brief): Mention the relevant NDIS Practice Standard or requirement that was not met.

3. **Evidence Gap** (1-2 sentences): Describe what evidence was missing, incomplete, or inadequate.

4. **Risk/Impact** (1 sentence): Explain the potential impact on participant safety, rights, or service quality.

5. **Corrective Action Required** (1-2 sentences): State what the provider needs to do to address this finding. Be specific but not prescriptive.

Format the response as a cohesive paragraph or short paragraphs that can be used directly in an audit report. Keep the total length to approximately 150-200 words. Do not use bullet points or numbered lists in the output.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert NDIS compliance auditor writing professional audit findings. Your findings are factual, balanced, and actionable. You reference NDIS Practice Standards appropriately." },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 500,
    });
    
    const findingDraft = completion.choices[0]?.message?.content || "";
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "FINDING_DRAFT_GENERATED",
      entityType: "audit",
      entityId: auditId,
      afterJson: { indicatorText: indicatorText.substring(0, 100), rating, wordCount: findingDraft.split(/\s+/).length },
    });
    
    return res.json({ 
      findingDraft,
      metadata: {
        severity: rating,
        domain: domainLabel,
        indicatorPreview: indicatorText.substring(0, 80),
      }
    });
  } catch (error) {
    console.error("Generate finding draft error:", error);
    return res.status(500).json({ error: "Failed to generate finding draft" });
  }
});

// Audit Sites CRUD (for multi-location audits)
const createAuditSiteSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  isPrimarySite: z.boolean().optional(),
  notes: z.string().optional(),
});

router.get("/audits/:auditId/sites", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const sites = await storage.getAuditSites(auditId);
    return res.json(sites);
  } catch (error) {
    console.error("Get audit sites error:", error);
    return res.status(500).json({ error: "Failed to fetch audit sites" });
  }
});

router.post("/audits/:auditId/sites", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    const parsed = createAuditSiteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }
    
    const site = await storage.createAuditSite({
      auditId,
      siteName: parsed.data.siteName,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      postcode: parsed.data.postcode || null,
      isPrimarySite: parsed.data.isPrimarySite || false,
      notes: parsed.data.notes || null,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_SITE_ADDED",
      entityType: "audit_site",
      entityId: site.id,
      afterJson: { auditId, siteName: site.siteName },
    });
    
    return res.status(201).json(site);
  } catch (error) {
    console.error("Create audit site error:", error);
    return res.status(500).json({ error: "Failed to create audit site" });
  }
});

router.delete("/audits/:auditId/sites/:siteId", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { auditId, siteId } = req.params;
    
    const audit = await storage.getAudit(auditId, companyId);
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    
    await storage.deleteAuditSite(siteId);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: userId,
      companyId,
      action: "AUDIT_SITE_DELETED",
      entityType: "audit_site",
      entityId: siteId,
      afterJson: { auditId },
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete audit site error:", error);
    return res.status(500).json({ error: "Failed to delete audit site" });
  }
});

export default router;
