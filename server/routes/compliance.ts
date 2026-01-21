import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import OpenAI from "openai";
import { TextDocument } from "simple-odf";
import { storage } from "../storage";
import { requireCompanyAuth, requireRole, type AuthenticatedCompanyRequest } from "../lib/companyAuth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const WEEKLY_REPORT_PROMPT_VERSION = "1.0.0";

const router = Router();

// ============================================================
// WORK SITES
// ============================================================

router.get("/work-sites", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const userRole = req.companyUser!.role;
    
    let sites = await storage.getWorkSites(companyId);
    
    // Staff can only see assigned sites
    if (userRole === "StaffReadOnly") {
      const assignedSiteIds = await storage.getAssignedSiteIds(companyId, userId);
      sites = sites.filter(s => assignedSiteIds.includes(s.id));
    }
    
    res.json(sites);
  } catch (error: any) {
    console.error("Error fetching work sites:", error);
    res.status(500).json({ error: "Failed to fetch work sites" });
  }
});

router.post("/work-sites", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const schema = z.object({
      name: z.string().min(1),
      addressLine1: z.string().optional(),
      suburb: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      siteType: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const site = await storage.createWorkSite({ ...data, companyId });
    res.status(201).json(site);
  } catch (error: any) {
    console.error("Error creating work site:", error);
    res.status(400).json({ error: error.message || "Failed to create work site" });
  }
});

router.patch("/work-sites/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const schema = z.object({
      name: z.string().min(1).optional(),
      addressLine1: z.string().optional(),
      suburb: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      siteType: z.string().optional(),
      status: z.enum(["active", "inactive"]).optional(),
    });
    const updates = schema.parse(req.body);
    const site = await storage.updateWorkSite(id, companyId, updates);
    if (!site) {
      return res.status(404).json({ error: "Work site not found" });
    }
    res.json(site);
  } catch (error: any) {
    console.error("Error updating work site:", error);
    res.status(400).json({ error: error.message || "Failed to update work site" });
  }
});

router.delete("/work-sites/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const success = await storage.deleteWorkSite(id, companyId);
    if (!success) {
      return res.status(404).json({ error: "Work site not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting work site:", error);
    res.status(500).json({ error: "Failed to delete work site" });
  }
});

// ============================================================
// PARTICIPANTS
// ============================================================

router.get("/participants", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const userRole = req.companyUser!.role;
    
    let allParticipants = await storage.getParticipants(companyId);
    
    // Staff can only see assigned participants
    if (userRole === "StaffReadOnly") {
      const assignedParticipantIds = await storage.getAssignedParticipantIds(companyId, userId);
      allParticipants = allParticipants.filter(p => assignedParticipantIds.includes(p.id));
    }
    
    res.json(allParticipants);
  } catch (error: any) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

router.post("/participants", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      displayName: z.string().optional(),
      ndisNumber: z.string().optional(),
      dob: z.string().optional().transform(val => val ? new Date(val) : undefined),
      primarySiteId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const participant = await storage.createParticipant({ ...data, companyId } as any);
    res.status(201).json(participant);
  } catch (error: any) {
    console.error("Error creating participant:", error);
    res.status(400).json({ error: error.message || "Failed to create participant" });
  }
});

router.patch("/participants/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      displayName: z.string().optional(),
      ndisNumber: z.string().optional(),
      dob: z.string().optional().transform(val => val ? new Date(val) : undefined),
      primarySiteId: z.string().optional().nullable(),
      status: z.enum(["active", "inactive"]).optional(),
    });
    const updates = schema.parse(req.body);
    const participant = await storage.updateParticipant(id, companyId, updates as any);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.json(participant);
  } catch (error: any) {
    console.error("Error updating participant:", error);
    res.status(400).json({ error: error.message || "Failed to update participant" });
  }
});

router.delete("/participants/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const success = await storage.deleteParticipant(id, companyId);
    if (!success) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting participant:", error);
    res.status(500).json({ error: "Failed to delete participant" });
  }
});

// ============================================================
// PARTICIPANT SITE ASSIGNMENTS
// ============================================================

router.get("/participant-site-assignments", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { participantId, siteId } = req.query;
    const assignments = await storage.getParticipantSiteAssignments(companyId, {
      participantId: participantId as string | undefined,
      siteId: siteId as string | undefined,
    });
    res.json(assignments);
  } catch (error: any) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.post("/participant-site-assignments", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const schema = z.object({
      participantId: z.string(),
      siteId: z.string(),
      startDate: z.string().transform(val => new Date(val)),
      endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
      isPrimary: z.boolean().optional().default(false),
    });
    const data = schema.parse(req.body);
    const assignment = await storage.createParticipantSiteAssignment({ ...data, companyId } as any);
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error creating assignment:", error);
    res.status(400).json({ error: error.message || "Failed to create assignment" });
  }
});

router.delete("/participant-site-assignments/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const success = await storage.deleteParticipantSiteAssignment(id, companyId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting assignment:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// ============================================================
// COMPLIANCE TEMPLATES
// ============================================================

router.get("/compliance-templates", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { scopeType, frequency } = req.query;
    
    let templates;
    if (scopeType && frequency) {
      templates = await storage.getComplianceTemplatesByScope(companyId, scopeType as string, frequency as string);
    } else {
      templates = await storage.getComplianceTemplates(companyId);
    }
    res.json(templates);
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.post("/compliance-templates", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      scopeType: z.enum(["SITE", "PARTICIPANT"]),
      frequency: z.enum(["DAILY", "WEEKLY"]),
      appliesToSiteTypes: z.array(z.string()).optional(),
      isActive: z.boolean().optional().default(true),
    });
    const data = schema.parse(req.body);
    const template = await storage.createComplianceTemplate({ ...data, companyId });
    res.status(201).json(template);
  } catch (error: any) {
    console.error("Error creating template:", error);
    res.status(400).json({ error: error.message || "Failed to create template" });
  }
});

router.patch("/compliance-templates/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      appliesToSiteTypes: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    });
    const updates = schema.parse(req.body);
    const template = await storage.updateComplianceTemplate(id, companyId, updates);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error: any) {
    console.error("Error updating template:", error);
    res.status(400).json({ error: error.message || "Failed to update template" });
  }
});

router.delete("/compliance-templates/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const template = await storage.updateComplianceTemplate(id, companyId, { isActive: false });
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deactivating template:", error);
    res.status(500).json({ error: "Failed to deactivate template" });
  }
});

// ============================================================
// COMPLIANCE TEMPLATE ITEMS
// ============================================================

router.get("/compliance-templates/:id/items", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const items = await storage.getComplianceTemplateItems(id, companyId);
    res.json(items);
  } catch (error: any) {
    console.error("Error fetching template items:", error);
    res.status(500).json({ error: "Failed to fetch template items" });
  }
});

router.post("/compliance-templates/:id/items", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id: templateId } = req.params;
    
    const template = await storage.getComplianceTemplate(templateId, companyId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const schema = z.object({
      title: z.string().min(1),
      guidanceText: z.string().optional(),
      responseType: z.enum(["YES_NO_NA", "NUMBER", "TEXT", "PHOTO_REQUIRED"]).optional().default("YES_NO_NA"),
      isCritical: z.boolean().optional().default(false),
      defaultEvidenceRequired: z.boolean().optional().default(false),
      evidenceSourceType: z.enum(["MANUAL", "EXTERNAL_SIGNAL"]).optional().default("MANUAL"),
      sortOrder: z.number().optional(),
    });
    const data = schema.parse(req.body);
    const item = await storage.createComplianceTemplateItem({ ...data, companyId, templateId } as any);
    res.status(201).json(item);
  } catch (error: any) {
    console.error("Error creating template item:", error);
    res.status(400).json({ error: error.message || "Failed to create template item" });
  }
});

router.patch("/compliance-template-items/:itemId", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { itemId } = req.params;
    const schema = z.object({
      title: z.string().min(1).optional(),
      guidanceText: z.string().optional(),
      responseType: z.enum(["YES_NO_NA", "NUMBER", "TEXT", "PHOTO_REQUIRED"]).optional(),
      isCritical: z.boolean().optional(),
      defaultEvidenceRequired: z.boolean().optional(),
      sortOrder: z.number().optional(),
    });
    const updates = schema.parse(req.body);
    const item = await storage.updateComplianceTemplateItem(itemId, companyId, updates);
    if (!item) {
      return res.status(404).json({ error: "Template item not found" });
    }
    res.json(item);
  } catch (error: any) {
    console.error("Error updating template item:", error);
    res.status(400).json({ error: error.message || "Failed to update template item" });
  }
});

router.delete("/compliance-template-items/:itemId", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { itemId } = req.params;
    const success = await storage.deleteComplianceTemplateItem(itemId, companyId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting template item:", error);
    res.status(500).json({ error: "Failed to delete template item" });
  }
});

// ============================================================
// COMPLIANCE RUNS
// ============================================================

router.get("/compliance-runs", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { siteId, participantId, templateId, status } = req.query;
    const runs = await storage.getComplianceRuns(companyId, {
      siteId: siteId as string | undefined,
      participantId: participantId as string | undefined,
      templateId: templateId as string | undefined,
      status: status as string | undefined,
    });
    res.json(runs);
  } catch (error: any) {
    console.error("Error fetching compliance runs:", error);
    res.status(500).json({ error: "Failed to fetch compliance runs" });
  }
});

router.get("/compliance-runs/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const run = await storage.getComplianceRun(id, companyId);
    if (!run) {
      return res.status(404).json({ error: "Compliance run not found" });
    }
    
    const template = await storage.getComplianceTemplate(run.templateId, companyId);
    const items = await storage.getComplianceTemplateItems(run.templateId, companyId);
    const responses = await storage.getComplianceResponses(id, companyId);
    
    res.json({
      run,
      template,
      items,
      responses,
    });
  } catch (error: any) {
    console.error("Error fetching compliance run:", error);
    res.status(500).json({ error: "Failed to fetch compliance run" });
  }
});

router.post("/compliance-runs", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const userRole = req.companyUser!.role;
    
    const schema = z.object({
      templateId: z.string(),
      siteId: z.string().optional(),
      participantId: z.string().optional(),
      date: z.string().optional(),
      periodStart: z.string().optional(),
      periodEnd: z.string().optional(),
    });
    const data = schema.parse(req.body);
    
    const template = await storage.getComplianceTemplate(data.templateId, companyId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const scopeEntityId = template.scopeType === "SITE" ? data.siteId : data.participantId;
    if (!scopeEntityId) {
      return res.status(400).json({ error: `${template.scopeType.toLowerCase()}Id is required for this template` });
    }
    
    // Staff can only create runs for assigned sites/participants
    if (userRole === "StaffReadOnly") {
      if (template.scopeType === "SITE") {
        const assignedSiteIds = await storage.getAssignedSiteIds(companyId, userId);
        if (!assignedSiteIds.includes(scopeEntityId)) {
          return res.status(403).json({ error: "You are not assigned to this site" });
        }
      } else {
        const assignedParticipantIds = await storage.getAssignedParticipantIds(companyId, userId);
        if (!assignedParticipantIds.includes(scopeEntityId)) {
          return res.status(403).json({ error: "You are not assigned to this participant" });
        }
      }
    }
    
    let periodStart: Date;
    let periodEnd: Date;
    
    if (template.frequency === "DAILY") {
      const date = data.date ? new Date(data.date) : new Date();
      periodStart = new Date(date);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(date);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      if (!data.periodStart || !data.periodEnd) {
        return res.status(400).json({ error: "periodStart and periodEnd are required for weekly templates" });
      }
      periodStart = new Date(data.periodStart);
      periodEnd = new Date(data.periodEnd);
    }
    
    const existing = await storage.checkDuplicateRun(companyId, data.templateId, scopeEntityId, periodStart, template.scopeType);
    if (existing) {
      return res.status(409).json({ error: "A compliance run already exists for this scope and period", existingRunId: existing.id });
    }
    
    const run = await storage.createComplianceRun({
      companyId,
      templateId: data.templateId,
      scopeType: template.scopeType,
      frequency: template.frequency,
      siteId: template.scopeType === "SITE" ? data.siteId : undefined,
      participantId: template.scopeType === "PARTICIPANT" ? data.participantId : undefined,
      periodStart,
      periodEnd,
      status: "OPEN",
      createdByUserId: userId,
    });
    
    res.status(201).json(run);
  } catch (error: any) {
    console.error("Error creating compliance run:", error);
    res.status(400).json({ error: error.message || "Failed to create compliance run" });
  }
});

// ============================================================
// COMPLIANCE RESPONSES
// ============================================================

router.post("/compliance-runs/:id/respond", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id: runId } = req.params;
    
    const run = await storage.getComplianceRun(runId, companyId);
    if (!run) {
      return res.status(404).json({ error: "Compliance run not found" });
    }
    if (run.status !== "OPEN") {
      return res.status(400).json({ error: "Cannot respond to a submitted or locked run" });
    }
    
    const schema = z.object({
      templateItemId: z.string(),
      responseValue: z.string().optional(),
      notes: z.string().optional(),
      attachmentPath: z.string().optional(),
    });
    const data = schema.parse(req.body);
    
    const templateItem = await storage.getComplianceTemplateItem(data.templateItemId, companyId);
    if (!templateItem || templateItem.templateId !== run.templateId) {
      return res.status(400).json({ error: "Invalid template item" });
    }
    
    if (templateItem.responseType === "YES_NO_NA" && data.responseValue) {
      if (!["YES", "NO", "NA"].includes(data.responseValue)) {
        return res.status(400).json({ error: "Response must be YES, NO, or NA" });
      }
    }
    if (templateItem.responseType === "NUMBER" && data.responseValue) {
      if (isNaN(Number(data.responseValue))) {
        return res.status(400).json({ error: "Response must be a number" });
      }
    }
    if (templateItem.responseType === "PHOTO_REQUIRED" && !data.attachmentPath) {
      return res.status(400).json({ error: "Photo attachment is required" });
    }
    
    const response = await storage.upsertComplianceResponse({
      companyId,
      runId,
      templateItemId: data.templateItemId,
      responseValue: data.responseValue,
      notes: data.notes,
      attachmentPath: data.attachmentPath,
    });
    
    res.json(response);
  } catch (error: any) {
    console.error("Error saving response:", error);
    res.status(400).json({ error: error.message || "Failed to save response" });
  }
});

// ============================================================
// SUBMIT RUN
// ============================================================

router.post("/compliance-runs/:id/submit", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { id: runId } = req.params;
    
    const run = await storage.getComplianceRun(runId, companyId);
    if (!run) {
      return res.status(404).json({ error: "Compliance run not found" });
    }
    if (run.status !== "OPEN") {
      return res.status(400).json({ error: "Run has already been submitted" });
    }
    
    const items = await storage.getComplianceTemplateItems(run.templateId, companyId);
    const responses = await storage.getComplianceResponses(runId, companyId);
    const responseMap = new Map(responses.map(r => [r.templateItemId, r]));
    
    const criticalItems = items.filter(i => i.isCritical);
    for (const item of criticalItems) {
      const response = responseMap.get(item.id);
      if (!response || !response.responseValue) {
        return res.status(400).json({ error: `Critical item "${item.title}" requires a response` });
      }
    }
    
    let hasAnyCriticalNo = false;
    let hasAnyNonCriticalNo = false;
    
    for (const item of items) {
      const response = responseMap.get(item.id);
      if (response?.responseValue === "NO") {
        if (item.isCritical) {
          hasAnyCriticalNo = true;
        } else {
          hasAnyNonCriticalNo = true;
        }
      }
    }
    
    let statusColor: "green" | "amber" | "red";
    if (hasAnyCriticalNo) {
      statusColor = "red";
    } else if (hasAnyNonCriticalNo) {
      statusColor = "amber";
    } else {
      statusColor = "green";
    }
    
    if (run.siteId) {
      const site = await storage.getWorkSite(run.siteId, companyId);
      if (!site) {
        return res.status(400).json({ error: "Invalid site reference in run" });
      }
    }
    if (run.participantId) {
      const participant = await storage.getParticipant(run.participantId, companyId);
      if (!participant) {
        return res.status(400).json({ error: "Invalid participant reference in run" });
      }
    }
    
    const actionsCreated: any[] = [];
    for (const item of items) {
      const response = responseMap.get(item.id);
      
      // Create action for NO responses
      if (response?.responseValue === "NO") {
        const severity = item.isCritical ? "HIGH" : "MEDIUM";
        const action = await storage.createComplianceAction({
          companyId,
          runId,
          siteId: run.siteId || undefined,
          participantId: run.participantId || undefined,
          severity,
          status: "OPEN",
          title: item.title,
          description: response.notes || `Non-compliant response for: ${item.title}`,
        });
        actionsCreated.push(action);
      }
      
      // Create action for YES responses on incident/concern items that require notes but have none
      const incidentKeywords = ["incident", "concern", "restrictive practice"];
      const isIncidentItem = incidentKeywords.some(kw => item.title.toLowerCase().includes(kw));
      if (response?.responseValue === "YES" && isIncidentItem && item.notesRequiredOnFail && !response.notes?.trim()) {
        const severity = item.isCritical ? "HIGH" : "MEDIUM";
        const action = await storage.createComplianceAction({
          companyId,
          runId,
          siteId: run.siteId || undefined,
          participantId: run.participantId || undefined,
          severity,
          status: "OPEN",
          title: `${item.title} - Missing Details`,
          description: `Incident/concern flagged but no notes provided for: ${item.title}`,
        });
        actionsCreated.push(action);
      }
    }
    
    const updatedRun = await storage.updateComplianceRun(runId, companyId, {
      status: "SUBMITTED",
      submittedByUserId: userId,
      submittedAt: new Date(),
    });
    
    res.json({
      run: updatedRun,
      statusColor,
      actionsCreated: actionsCreated.length,
    });
  } catch (error: any) {
    console.error("Error submitting run:", error);
    res.status(500).json({ error: "Failed to submit run" });
  }
});

// ============================================================
// COMPLIANCE ACTIONS
// ============================================================

router.get("/compliance-actions", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { siteId, participantId, status } = req.query;
    const actions = await storage.getComplianceActions(companyId, {
      siteId: siteId as string | undefined,
      participantId: participantId as string | undefined,
      status: status as string | undefined,
    });
    res.json(actions);
  } catch (error: any) {
    console.error("Error fetching actions:", error);
    res.status(500).json({ error: "Failed to fetch actions" });
  }
});

router.patch("/compliance-actions/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const schema = z.object({
      assignedToUserId: z.string().optional().nullable(),
      status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).optional(),
      dueAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
    });
    const updates = schema.parse(req.body);
    const action = await storage.updateComplianceAction(id, companyId, updates as any);
    if (!action) {
      return res.status(404).json({ error: "Action not found" });
    }
    res.json(action);
  } catch (error: any) {
    console.error("Error updating action:", error);
    res.status(400).json({ error: error.message || "Failed to update action" });
  }
});

router.post("/compliance-actions/:id/close", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const userRole = req.companyUser!.role;
    const { id } = req.params;
    
    const existingAction = await storage.getComplianceAction(id, companyId);
    if (!existingAction) {
      return res.status(404).json({ error: "Action not found" });
    }
    
    // Staff can only close actions they are assigned to or actions for sites/participants they're assigned to
    if (userRole === "StaffReadOnly") {
      const assignedSiteIds = await storage.getAssignedSiteIds(companyId, userId);
      const assignedParticipantIds = await storage.getAssignedParticipantIds(companyId, userId);
      
      const isAssignedToAction = existingAction.assignedToUserId === userId;
      const isAssignedToScope = 
        (existingAction.siteId && assignedSiteIds.includes(existingAction.siteId)) ||
        (existingAction.participantId && assignedParticipantIds.includes(existingAction.participantId));
      
      if (!isAssignedToAction && !isAssignedToScope) {
        return res.status(403).json({ error: "You are not authorized to close this action" });
      }
    }
    
    const schema = z.object({
      closureNotes: z.string().min(1),
      closureAttachmentPath: z.string().optional(),
    });
    const data = schema.parse(req.body);
    
    const action = await storage.updateComplianceAction(id, companyId, {
      status: "CLOSED",
      closedAt: new Date(),
      closureNotes: data.closureNotes,
      closureAttachmentPath: data.closureAttachmentPath,
    });
    
    res.json(action);
  } catch (error: any) {
    console.error("Error closing action:", error);
    res.status(400).json({ error: error.message || "Failed to close action" });
  }
});

// ============================================================
// STAFF SITE ASSIGNMENTS
// ============================================================

router.get("/staff-site-assignments", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { userId, siteId } = req.query;
    const assignments = await storage.getStaffSiteAssignments(companyId, {
      userId: userId as string | undefined,
      siteId: siteId as string | undefined,
    });
    res.json(assignments);
  } catch (error: any) {
    console.error("Error fetching staff site assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.post("/staff-site-assignments", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const schema = z.object({
      userId: z.string(),
      siteId: z.string(),
    });
    const data = schema.parse(req.body);
    
    // Verify user and site exist in this company
    const user = await storage.getCompanyUser(data.userId);
    if (!user || user.companyId !== companyId) {
      return res.status(404).json({ error: "User not found" });
    }
    const site = await storage.getWorkSite(data.siteId, companyId);
    if (!site) {
      return res.status(404).json({ error: "Site not found" });
    }
    
    const assignment = await storage.createStaffSiteAssignment({ ...data, companyId });
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error creating staff site assignment:", error);
    if (error.message?.includes("unique")) {
      return res.status(409).json({ error: "Assignment already exists" });
    }
    res.status(400).json({ error: error.message || "Failed to create assignment" });
  }
});

router.delete("/staff-site-assignments/:id", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const success = await storage.deleteStaffSiteAssignment(id, companyId);
    if (!success) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting staff site assignment:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// ============================================================
// STAFF PARTICIPANT ASSIGNMENTS
// ============================================================

router.get("/staff-participant-assignments", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { userId, participantId } = req.query;
    const assignments = await storage.getStaffParticipantAssignments(companyId, {
      userId: userId as string | undefined,
      participantId: participantId as string | undefined,
    });
    res.json(assignments);
  } catch (error: any) {
    console.error("Error fetching staff participant assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.post("/staff-participant-assignments", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const schema = z.object({
      userId: z.string(),
      participantId: z.string(),
    });
    const data = schema.parse(req.body);
    
    // Verify user and participant exist in this company
    const user = await storage.getCompanyUser(data.userId);
    if (!user || user.companyId !== companyId) {
      return res.status(404).json({ error: "User not found" });
    }
    const participant = await storage.getParticipant(data.participantId, companyId);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }
    
    const assignment = await storage.createStaffParticipantAssignment({ ...data, companyId });
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error creating staff participant assignment:", error);
    if (error.message?.includes("unique")) {
      return res.status(409).json({ error: "Assignment already exists" });
    }
    res.status(400).json({ error: error.message || "Failed to create assignment" });
  }
});

router.delete("/staff-participant-assignments/:id", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const success = await storage.deleteStaffParticipantAssignment(id, companyId);
    if (!success) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting staff participant assignment:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// ============================================================
// COMPLIANCE ROLLUPS
// ============================================================

router.get("/compliance-rollups", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { frequency, siteId, participantId, periodStart, periodEnd } = req.query;
    
    const rollup = await storage.getComplianceRollup(companyId, {
      frequency: frequency as string | undefined,
      siteId: siteId as string | undefined,
      participantId: participantId as string | undefined,
      periodStart: periodStart ? new Date(periodStart as string) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd as string) : undefined,
    });
    
    res.json(rollup);
  } catch (error: any) {
    console.error("Error fetching compliance rollup:", error);
    res.status(500).json({ error: "Failed to fetch rollup" });
  }
});

// ============================================================
// WEEKLY COMPLIANCE REPORTS
// ============================================================

router.get("/weekly-reports", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { participantId, periodStart, periodEnd } = req.query;
    
    const reports = await storage.getWeeklyComplianceReports(companyId, {
      participantId: participantId as string | undefined,
      periodStart: periodStart ? new Date(periodStart as string) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd as string) : undefined,
    });
    
    res.json(reports);
  } catch (error: any) {
    console.error("Error fetching weekly reports:", error);
    res.status(500).json({ error: "Failed to fetch weekly reports" });
  }
});

router.get("/weekly-reports/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const report = await storage.getWeeklyComplianceReport(id, companyId);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    res.json(report);
  } catch (error: any) {
    console.error("Error fetching weekly report:", error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.patch("/weekly-reports/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const schema = z.object({
      reportText: z.string().optional(),
      reportStatus: z.enum(["DRAFT", "FINAL"]).optional(),
    });
    const data = schema.parse(req.body);
    
    const existing = await storage.getWeeklyComplianceReport(id, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    const updated = await storage.updateWeeklyComplianceReport(id, companyId, data);
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating weekly report:", error);
    res.status(400).json({ error: error.message || "Failed to update report" });
  }
});

router.get("/weekly-reports/:id/export-odf", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const report = await storage.getWeeklyComplianceReport(id, companyId);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    const participant = await storage.getParticipant(report.participantId, companyId);
    const participantName = participant?.displayName || `${participant?.firstName} ${participant?.lastName}` || "Unknown";
    
    const periodStart = new Date(report.periodStart).toLocaleDateString("en-AU");
    const periodEnd = new Date(report.periodEnd).toLocaleDateString("en-AU");
    
    const doc = new TextDocument();
    const body = doc.getBody();
    
    body.addHeading(`Weekly Compliance Report`, 1);
    body.addParagraph(`Participant: ${participantName}`);
    body.addParagraph(`Period: ${periodStart} to ${periodEnd}`);
    body.addParagraph(`Generated: ${new Date(report.createdAt).toLocaleDateString("en-AU")}`);
    body.addParagraph(`Status: ${report.reportStatus}`);
    body.addParagraph("");
    
    const metrics = report.metricsJson as any;
    if (metrics) {
      body.addHeading("Compliance Metrics", 2);
      body.addParagraph(`Overall Status: ${metrics.overallStatus || "N/A"}`);
      body.addParagraph(`Daily Checks Completed: ${metrics.dailyRunsCompletedCount || 0}`);
      body.addParagraph(`Weekly Checks Completed: ${metrics.weeklyRunsCompletedCount || 0}`);
      body.addParagraph(`Critical Failures: ${metrics.dailyCriticalFailuresCount || 0}`);
      body.addParagraph(`Incident Days: ${metrics.incidentDaysCount || 0}`);
      body.addParagraph(`Medication Non-Compliance Days: ${metrics.medicationNonComplianceDaysCount || 0}`);
      body.addParagraph(`PRN Usage: ${metrics.prnFlag ? "Yes" : "No"}`);
      body.addParagraph(`Restrictive Practices Used: ${metrics.restrictivePracticesUsed ? "Yes" : "No"}`);
      body.addParagraph("");
    }
    
    body.addHeading("AI-Generated Summary", 2);
    if (report.reportText) {
      const lines = report.reportText.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          body.addParagraph(line);
        }
      }
    } else {
      body.addParagraph("No summary generated.");
    }
    
    const tmpPath = `/tmp/report_${id}.fodt`;
    await doc.saveFlat(tmpPath);
    const buffer = await require("fs").promises.readFile(tmpPath);
    await require("fs").promises.unlink(tmpPath);
    
    const filename = `Weekly_Report_${participantName.replace(/[^a-zA-Z0-9]/g, "_")}_${periodStart.replace(/\//g, "-")}.odt`;
    
    res.setHeader("Content-Type", "application/vnd.oasis.opendocument.text");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error("Error exporting weekly report to ODF:", error);
    res.status(500).json({ error: "Failed to export report" });
  }
});

router.post("/weekly-reports/generate", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      participantId: z.string().uuid(),
      periodStart: z.string(),
      periodEnd: z.string(),
    });
    const data = schema.parse(req.body);
    
    const periodStart = new Date(data.periodStart);
    const periodEnd = new Date(data.periodEnd);
    
    const participant = await storage.getParticipant(data.participantId, companyId);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }
    
    const runs = await storage.getComplianceRuns(companyId, { participantId: data.participantId });
    const periodRuns = runs.filter(r => {
      const runDate = new Date(r.createdAt);
      return runDate >= periodStart && runDate <= periodEnd;
    });
    
    if (periodRuns.length === 0) {
      return res.status(400).json({ error: "No compliance runs found for the specified period" });
    }
    
    const runResponses: { run: any; responses: any[]; template: any }[] = [];
    for (const run of periodRuns) {
      const responses = await storage.getComplianceResponses(run.id, companyId);
      const template = await storage.getComplianceTemplate(run.templateId, companyId);
      runResponses.push({ run, responses, template });
    }
    
    // Collect compliance actions for the period
    const allActions = await storage.getComplianceActions(companyId, { participantId: data.participantId });
    const periodActions = allActions.filter(a => {
      const actionDate = new Date(a.createdAt);
      return actionDate >= periodStart && actionDate <= periodEnd;
    });
    
    // Separate daily and weekly runs
    const dailyRuns = periodRuns.filter(r => r.frequency === "DAILY");
    const weeklyRuns = periodRuns.filter(r => r.frequency === "WEEKLY");
    
    // Get template items for each run to analyze responses properly
    const allTemplateItems: Map<string, any[]> = new Map();
    for (const { run } of runResponses) {
      if (!allTemplateItems.has(run.templateId)) {
        const items = await storage.getComplianceTemplateItems(run.templateId, companyId);
        allTemplateItems.set(run.templateId, items);
      }
    }
    
    // Compute rollup metrics
    let dailyCriticalFailuresCount = 0;
    let incidentDaysCount = 0;
    let medicationNonComplianceDaysCount = 0;
    let weeklyIncidentCount = 0;
    let weeklyMedicationCompliant = "NA";
    let prnFlag = false;
    let restrictivePracticesUsed = false;
    
    for (const { run, responses } of runResponses) {
      const items = allTemplateItems.get(run.templateId) || [];
      
      for (const response of responses) {
        const item = items.find(i => i.id === response.templateItemId);
        if (!item) continue;
        
        const titleLower = item.title.toLowerCase();
        
        // Count critical failures
        if (item.isCritical && response.responseValue === "NO") {
          dailyCriticalFailuresCount++;
        }
        
        // Count incident days
        if (titleLower.includes("incident") && response.responseValue === "YES") {
          incidentDaysCount++;
        }
        
        // Track weekly incident count (NUMBER type)
        if (run.frequency === "WEEKLY" && titleLower.includes("number of incidents") && response.responseValue) {
          weeklyIncidentCount = parseInt(response.responseValue) || 0;
        }
        
        // Track medication compliance
        if (titleLower.includes("medication")) {
          if (run.frequency === "DAILY" && response.responseValue === "NO") {
            medicationNonComplianceDaysCount++;
          }
          if (run.frequency === "WEEKLY") {
            weeklyMedicationCompliant = response.responseValue || "NA";
          }
        }
        
        // PRN usage
        if (titleLower.includes("prn") && response.responseValue === "YES") {
          prnFlag = true;
        }
        
        // Restrictive practices
        if (titleLower.includes("restrictive practice") && response.responseValue === "YES") {
          restrictivePracticesUsed = true;
        }
      }
    }
    
    // Calculate overall status
    const highActions = periodActions.filter(a => a.severity === "HIGH");
    const mediumActions = periodActions.filter(a => a.severity === "MEDIUM");
    let overallStatus: "GREEN" | "AMBER" | "RED";
    if (highActions.length > 0 || dailyCriticalFailuresCount > 0) {
      overallStatus = "RED";
    } else if (mediumActions.length > 0) {
      overallStatus = "AMBER";
    } else {
      overallStatus = "GREEN";
    }
    
    const metricsJson = {
      dailyRunsCompletedCount: dailyRuns.length,
      weeklyRunsCompletedCount: weeklyRuns.length,
      dailyCriticalFailuresCount,
      incidentDaysCount,
      weeklyIncidentCount,
      medicationNonComplianceDaysCount,
      weeklyMedicationCompliant,
      prnFlag,
      restrictivePracticesUsed,
      openActionsCountBySeverity: {
        HIGH: highActions.filter(a => a.status === "OPEN").length,
        MEDIUM: mediumActions.filter(a => a.status === "OPEN").length,
      },
      overallStatus,
    };
    
    const inputData = {
      participantName: participant.displayName || `${participant.firstName} ${participant.lastName}`,
      periodStart: periodStart.toISOString().split("T")[0],
      periodEnd: periodEnd.toISOString().split("T")[0],
      metrics: metricsJson,
      runSummaries: runResponses.map(({ run, responses, template }) => {
        const items = allTemplateItems.get(run.templateId) || [];
        return {
          date: new Date(run.createdAt).toISOString().split("T")[0],
          templateName: template?.name || "Unknown",
          frequency: run.frequency,
          itemResponses: responses.map(r => {
            const item = items.find(i => i.id === r.templateItemId);
            return {
              title: item?.title || "Unknown",
              value: r.responseValue,
              notes: r.notes || null,
              isCritical: item?.isCritical || false,
            };
          }),
        };
      }),
      actions: periodActions.map(a => ({
        title: a.title,
        severity: a.severity,
        status: a.status,
        createdAt: new Date(a.createdAt).toISOString().split("T")[0],
      })),
    };
    
    const inputHash = crypto.createHash("sha256").update(JSON.stringify(inputData)).digest("hex");
    
    const systemPrompt = `You are a compliance report writer for an Australian NDIS (National Disability Insurance Scheme) provider. Generate a professional weekly compliance summary for a participant based ONLY on the data provided.

STRICT RULES - YOU MUST FOLLOW:
1. ONLY summarize facts from the provided checklist entries and actions - do NOT invent or assume any information
2. Never include specific medical diagnoses, disability types, or sensitive health details
3. Use factual, neutral, professional language appropriate for NDIS care documentation
4. If something is not recorded in the entries, explicitly state "Not recorded in checklist entries"
5. Reference specific dates when describing compliance issues or incidents

REQUIRED REPORT STRUCTURE (use these exact headings):
1) Period Overview - Summary of the reporting period, number of checks completed, overall compliance status
2) Support Delivery and Documentation - Summary of support delivery, case notes, and care plan alignment
3) Incidents and Safeguards - Summary of any incidents reported, restrictive practices (if any), and safety concerns
4) Medication and Health - Summary of medication compliance, PRN usage, and health-related observations
5) Actions and Follow-up - Summary of open actions, their severity, and recommended follow-up
6) Overall Compliance Status - Final assessment (GREEN/AMBER/RED) with brief justification

Keep the report factual and concise (300-500 words maximum).`;

    const userPrompt = `Generate a weekly compliance summary for participant "${inputData.participantName}" covering the period ${inputData.periodStart} to ${inputData.periodEnd}.

METRICS:
- Daily checks completed: ${inputData.metrics.dailyRunsCompletedCount}
- Weekly checks completed: ${inputData.metrics.weeklyRunsCompletedCount}
- Critical failures: ${inputData.metrics.dailyCriticalFailuresCount}
- Days with incidents reported: ${inputData.metrics.incidentDaysCount}
- Weekly incident count: ${inputData.metrics.weeklyIncidentCount}
- Medication non-compliance days: ${inputData.metrics.medicationNonComplianceDaysCount}
- Weekly medication compliance: ${inputData.metrics.weeklyMedicationCompliant}
- PRN usage noted: ${inputData.metrics.prnFlag ? "Yes" : "No"}
- Restrictive practices used: ${inputData.metrics.restrictivePracticesUsed ? "Yes" : "No"}
- Open HIGH actions: ${inputData.metrics.openActionsCountBySeverity.HIGH}
- Open MEDIUM actions: ${inputData.metrics.openActionsCountBySeverity.MEDIUM}
- Overall Status: ${inputData.metrics.overallStatus}

CHECKLIST ENTRIES:
${inputData.runSummaries.map(s => `${s.date} - ${s.templateName} (${s.frequency}):
${s.itemResponses.map(r => `  - ${r.title}: ${r.value}${r.notes ? ` (Notes: ${r.notes})` : ""}${r.isCritical ? " [CRITICAL]" : ""}`).join("\n")}`).join("\n\n")}

COMPLIANCE ACTIONS CREATED:
${inputData.actions.length > 0 ? inputData.actions.map(a => `- ${a.createdAt}: ${a.title} (${a.severity}, ${a.status})`).join("\n") : "No actions created this period"}

Based STRICTLY on this data, provide a professional weekly compliance summary following the required structure.`;

    let generatedText = "";
    let modelName = "gpt-5";
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 4000,
      });
      
      generatedText = completion.choices[0]?.message?.content || "";
      modelName = completion.model || "gpt-5";
      
      await storage.createAiGenerationLog({
        companyId,
        userId,
        featureKey: "WEEKLY_COMPLIANCE_REPORT",
        participantId: data.participantId,
        periodStart,
        periodEnd,
        inputHash,
        modelName,
        promptVersion: WEEKLY_REPORT_PROMPT_VERSION,
        success: true,
      });
    } catch (aiError: any) {
      await storage.createAiGenerationLog({
        companyId,
        userId,
        featureKey: "WEEKLY_COMPLIANCE_REPORT",
        participantId: data.participantId,
        periodStart,
        periodEnd,
        inputHash,
        modelName,
        promptVersion: WEEKLY_REPORT_PROMPT_VERSION,
        success: false,
        errorMessage: aiError.message || "AI generation failed",
      });
      throw new Error("AI generation failed: " + (aiError.message || "Unknown error"));
    }
    
    const report = await storage.createWeeklyComplianceReport({
      companyId,
      participantId: data.participantId,
      periodStart,
      periodEnd,
      generatedByUserId: userId,
      generationSource: "AI",
      reportText: generatedText,
      metricsJson,
    });
    
    res.status(201).json(report);
  } catch (error: any) {
    console.error("Error generating weekly report:", error);
    res.status(500).json({ error: error.message || "Failed to generate weekly report" });
  }
});

export default router;
