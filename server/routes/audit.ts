import { Router } from "express";
import { z } from "zod";
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

const router = Router();

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
    
    return res.json(audits);
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
    
    return res.json({
      audit,
      template,
      indicators,
      responses,
      scopeItems,
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

const saveResponseSchema = z.object({
  rating: z.enum(indicatorRatingEnum),
  comment: z.string().nullable().optional(),
}).refine(data => {
  if (data.rating !== "CONFORMANCE" && !data.comment) {
    return false;
  }
  return true;
}, { message: "Comment is required for non-conformance ratings" });

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
    
    const response = await storage.upsertAuditIndicatorResponse({
      auditId,
      templateIndicatorId: indicatorId,
      rating: input.rating,
      comment: input.comment || null,
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
    return res.json(requests);
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
    
    const finding = await storage.getFinding(evidenceRequest.findingId, companyId);
    const items = await storage.getEvidenceItems(requestId, companyId);
    
    return res.json({ ...evidenceRequest, finding, items });
  } catch (error) {
    console.error("Get evidence request error:", error);
    return res.status(500).json({ error: "Failed to fetch evidence request" });
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
    
    if (evidenceRequest.status !== "SUBMITTED") {
      return res.status(400).json({ error: "Only submitted evidence can be reviewed" });
    }
    
    const input = reviewEvidenceSchema.parse(req.body);
    
    const newStatus = input.decision === "ACCEPTED" ? "ACCEPTED" : "REJECTED";
    
    const updated = await storage.updateEvidenceRequest(requestId, companyId, {
      status: newStatus,
      reviewedByCompanyUserId: userId,
      reviewedAt: new Date(),
      reviewNote: input.reviewNote || null,
    });
    
    if (input.decision === "ACCEPTED") {
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

export default router;
