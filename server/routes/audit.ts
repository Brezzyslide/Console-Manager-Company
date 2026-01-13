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
} from "@shared/schema";

function generatePublicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const router = Router();

type IndicatorRating = typeof indicatorRatingEnum[number];

function scoreForRating(rating: IndicatorRating): number {
  switch (rating) {
    case "CONFORMANCE": return 2;
    case "OBSERVATION": return 1;
    case "MINOR_NC": return 0;
    case "MAJOR_NC": return -2;
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
        const maxPoints = indicators.length * 2;
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
        conformanceCount: 0,
        observationCount: 0,
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
      CONFORMANCE: 0,
      OBSERVATION: 0,
      MINOR_NC: 0,
      MAJOR_NC: 0,
    };
    
    let scorePointsTotal = 0;
    responses.forEach(r => {
      counts[r.rating as keyof typeof counts]++;
      scorePointsTotal += r.scorePoints;
    });
    
    const indicatorCount = indicators.length;
    const maxPoints = indicatorCount * 2;
    const scorePercent = maxPoints > 0 
      ? Math.round(Math.max(0, Math.min(100, (scorePointsTotal / maxPoints) * 100)))
      : 0;
    
    return res.json({
      indicatorCount,
      conformanceCount: counts.CONFORMANCE,
      observationCount: counts.OBSERVATION,
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
  if (data.rating !== "CONFORMANCE") {
    if (!data.comment || data.comment.length < 10) {
      return false;
    }
  }
  return true;
}, { message: "Comment is required (minimum 10 characters) for Observation, Minor NC, and Major NC ratings" });

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
      if (data.rating !== "CONFORMANCE") {
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
    
    return res.status(201).json(review);
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

export default router;
