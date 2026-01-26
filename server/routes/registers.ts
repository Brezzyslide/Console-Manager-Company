import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireCompanyAuth, requireRole, type AuthenticatedCompanyRequest } from "../lib/companyAuth";
import { 
  evacuationDrillTypes, 
  participantNotInvolvedReasons, 
  involvementRatings,
  complainantTypes,
  complaintCategories,
  complaintStatuses,
  closureSatisfactions,
  externalNotificationBodies,
  riskCategories,
  riskScopeTypes,
  riskLevels,
  riskRatings,
  riskReviewFrequencies,
  riskStatuses,
  improvementSources,
  relatedRegisterTypes,
  improvementStatuses,
  policyCategories,
  policyUpdateReasons,
  policyStatuses,
  legislativeJurisdictions,
  legislativeApplicability,
  legislativeStatuses
} from "@shared/schema";

const router = Router();

// ============================================================
// EVACUATION DRILL REGISTER
// ============================================================

router.get("/registers/evacuation-drills", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { siteId, from, to } = req.query;
    
    const drills = await storage.getEvacuationDrills(companyId, {
      siteId: siteId as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
    });
    res.json(drills);
  } catch (error: any) {
    console.error("Error fetching evacuation drills:", error);
    res.status(500).json({ error: "Failed to fetch evacuation drills" });
  }
});

router.get("/registers/evacuation-drills/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const drill = await storage.getEvacuationDrill(id, companyId);
    if (!drill) {
      return res.status(404).json({ error: "Evacuation drill not found" });
    }
    res.json(drill);
  } catch (error: any) {
    console.error("Error fetching evacuation drill:", error);
    res.status(500).json({ error: "Failed to fetch evacuation drill" });
  }
});

router.post("/registers/evacuation-drills", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      dateOfDrill: z.string().datetime(),
      siteId: z.string().min(1, "Work site is required"),
      drillType: z.enum(evacuationDrillTypes).optional().default("FIRE"),
      assemblyPoint: z.string().optional(),
      wardenFirstName: z.string().min(1, "Warden first name is required"),
      wardenLastName: z.string().min(1, "Warden last name is required"),
      totalPeoplePresent: z.number().int().min(1, "Total people must be at least 1"),
      staffInitialsPresent: z.string().min(1, "Staff initials are required"),
      clientInitialsPresent: z.string().min(1, "Client initials are required"),
      participantActivelyInvolved: z.boolean(),
      ifNotInvolvedReason: z.enum(participantNotInvolvedReasons).optional().nullable(),
      ifNotInvolvedOtherText: z.string().optional().nullable(),
      involvementRating: z.enum(involvementRatings),
      improvementNotes: z.string().min(1, "Improvement notes are required"),
      attachments: z.array(z.any()).optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    const drill = await storage.createEvacuationDrill({
      ...data,
      companyId,
      completedByUserId: userId,
      dateOfDrill: new Date(data.dateOfDrill),
    });
    
    res.status(201).json(drill);
  } catch (error: any) {
    console.error("Error creating evacuation drill:", error);
    if (error.errors) {
      const messages = error.errors.map((e: any) => e.message).join(", ");
      res.status(400).json({ error: messages });
    } else {
      res.status(400).json({ error: error.message || "Failed to create evacuation drill" });
    }
  }
});

router.patch("/registers/evacuation-drills/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const schema = z.object({
      dateOfDrill: z.string().datetime().optional(),
      siteId: z.string().min(1).optional(),
      drillType: z.enum(evacuationDrillTypes).optional(),
      assemblyPoint: z.string().optional(),
      wardenFirstName: z.string().min(1).optional(),
      wardenLastName: z.string().min(1).optional(),
      totalPeoplePresent: z.number().int().min(1).optional(),
      staffInitialsPresent: z.string().min(1).optional(),
      clientInitialsPresent: z.string().min(1).optional(),
      participantActivelyInvolved: z.boolean().optional(),
      ifNotInvolvedReason: z.enum(participantNotInvolvedReasons).optional().nullable(),
      ifNotInvolvedOtherText: z.string().optional().nullable(),
      involvementRating: z.enum(involvementRatings).optional(),
      improvementNotes: z.string().min(1).optional(),
      attachments: z.array(z.any()).optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    const updated = await storage.updateEvacuationDrill(id, companyId, {
      ...data,
      dateOfDrill: data.dateOfDrill ? new Date(data.dateOfDrill) : undefined,
    });
    
    if (!updated) {
      return res.status(404).json({ error: "Evacuation drill not found" });
    }
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating evacuation drill:", error);
    res.status(400).json({ error: error.message || "Failed to update evacuation drill" });
  }
});

router.delete("/registers/evacuation-drills/:id", requireCompanyAuth, requireRole(["CompanyAdmin"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const deleted = await storage.deleteEvacuationDrill(id, companyId);
    if (!deleted) {
      return res.status(404).json({ error: "Evacuation drill not found" });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting evacuation drill:", error);
    res.status(500).json({ error: "Failed to delete evacuation drill" });
  }
});

// ============================================================
// COMPLAINTS REGISTER
// ============================================================

router.get("/registers/complaints", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { siteId, status, category, from, to, externalNotificationRequired } = req.query;
    
    const complaints = await storage.getComplaints(companyId, {
      siteId: siteId as string | undefined,
      status: status as string | undefined,
      category: category as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      externalNotificationRequired: externalNotificationRequired === "true" ? true : externalNotificationRequired === "false" ? false : undefined,
    });
    res.json(complaints);
  } catch (error: any) {
    console.error("Error fetching complaints:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

router.get("/registers/complaints/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const complaint = await storage.getComplaint(id, companyId);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    res.json(complaint);
  } catch (error: any) {
    console.error("Error fetching complaint:", error);
    res.status(500).json({ error: "Failed to fetch complaint" });
  }
});

router.post("/registers/complaints", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      receivedAt: z.string().datetime(),
      siteId: z.string().optional().nullable(),
      participantId: z.string().optional().nullable(),
      complainantType: z.enum(complainantTypes),
      complainantName: z.string().optional().nullable(),
      complainantContact: z.string().optional().nullable(),
      relationshipToParticipant: z.string().optional().nullable(),
      isAnonymous: z.boolean().optional().default(false),
      category: z.enum(complaintCategories),
      description: z.string().min(1, "Description is required"),
      immediateRisk: z.boolean().optional().default(false),
      immediateActionsTaken: z.string().optional().nullable(),
      externalNotificationRequired: z.boolean().optional().default(false),
      externalBodies: z.array(z.enum(externalNotificationBodies)).optional().nullable(),
      externalOtherBodyText: z.string().optional().nullable(),
      externalNotifiedAt: z.string().datetime().optional().nullable(),
      externalReferenceNumber: z.string().optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    const complaint = await storage.createComplaint({
      ...data,
      companyId,
      createdByUserId: userId,
      receivedAt: new Date(data.receivedAt),
      status: "IN_PROGRESS",
      externalNotifiedAt: data.externalNotifiedAt ? new Date(data.externalNotifiedAt) : null,
    });
    
    res.status(201).json(complaint);
  } catch (error: any) {
    console.error("Error creating complaint:", error);
    if (error.errors) {
      const messages = error.errors.map((e: any) => e.message).join(", ");
      res.status(400).json({ error: messages });
    } else {
      res.status(400).json({ error: error.message || "Failed to create complaint" });
    }
  }
});

router.patch("/registers/complaints/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userRole = req.companyUser!.role;
    const { id } = req.params;
    
    const existing = await storage.getComplaint(id, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    
    const schema = z.object({
      siteId: z.string().optional().nullable(),
      participantId: z.string().optional().nullable(),
      complainantType: z.enum(complainantTypes).optional(),
      complainantName: z.string().optional().nullable(),
      complainantContact: z.string().optional().nullable(),
      relationshipToParticipant: z.string().optional().nullable(),
      isAnonymous: z.boolean().optional(),
      category: z.enum(complaintCategories).optional(),
      description: z.string().optional(),
      immediateRisk: z.boolean().optional(),
      immediateActionsTaken: z.string().optional().nullable(),
      status: z.enum(complaintStatuses).optional(),
      acknowledgedAt: z.string().datetime().optional().nullable(),
      investigatorUserId: z.string().optional().nullable(),
      actionsSummary: z.string().optional().nullable(),
      outcomeSummary: z.string().optional().nullable(),
      resolvedAt: z.string().datetime().optional().nullable(),
      closedAt: z.string().datetime().optional().nullable(),
      closureSatisfaction: z.enum(closureSatisfactions).optional().nullable(),
      closureNotes: z.string().optional().nullable(),
      externalNotificationRequired: z.boolean().optional(),
      externalBodies: z.array(z.enum(externalNotificationBodies)).optional().nullable(),
      externalOtherBodyText: z.string().optional().nullable(),
      externalNotifiedAt: z.string().datetime().optional().nullable(),
      externalReferenceNumber: z.string().optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    if (data.status && data.status !== "IN_PROGRESS" && !["CompanyAdmin", "Auditor"].includes(userRole)) {
      return res.status(403).json({ error: "Only administrators can change status to resolved or closed" });
    }
    
    if (data.externalNotificationRequired !== undefined && !["CompanyAdmin", "Auditor"].includes(userRole)) {
      return res.status(403).json({ error: "Only administrators can update external notification fields" });
    }
    
    const updated = await storage.updateComplaint(id, companyId, {
      ...data,
      receivedAt: undefined,
      resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
      closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
      acknowledgedAt: data.acknowledgedAt ? new Date(data.acknowledgedAt) : undefined,
      externalNotifiedAt: data.externalNotifiedAt ? new Date(data.externalNotifiedAt) : undefined,
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating complaint:", error);
    res.status(400).json({ error: error.message || "Failed to update complaint" });
  }
});

router.post("/registers/complaints/:id/resolve", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const existing = await storage.getComplaint(id, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    
    const schema = z.object({
      outcomeSummary: z.string().min(1, "Outcome summary is required to resolve"),
    });
    
    const data = schema.parse(req.body);
    
    const updated = await storage.updateComplaint(id, companyId, {
      status: "RESOLVED",
      outcomeSummary: data.outcomeSummary,
      resolvedAt: new Date(),
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error resolving complaint:", error);
    res.status(400).json({ error: error.message || "Failed to resolve complaint" });
  }
});

router.post("/registers/complaints/:id/close", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const existing = await storage.getComplaint(id, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    
    const schema = z.object({
      closureSatisfaction: z.enum(closureSatisfactions),
      closureNotes: z.string().optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    const updated = await storage.updateComplaint(id, companyId, {
      status: "CLOSED",
      closureSatisfaction: data.closureSatisfaction,
      closureNotes: data.closureNotes,
      closedAt: new Date(),
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error("Error closing complaint:", error);
    res.status(400).json({ error: error.message || "Failed to close complaint" });
  }
});

// ============================================================
// RISK REGISTER
// ============================================================

router.get("/registers/risks", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const risks = await storage.getRisks(companyId);
    res.json(risks);
  } catch (error: any) {
    console.error("Error fetching risks:", error);
    res.status(500).json({ error: "Failed to fetch risks" });
  }
});

router.get("/registers/risks/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const risk = await storage.getRisk(id, companyId);
    if (!risk) {
      return res.status(404).json({ error: "Risk not found" });
    }
    res.json(risk);
  } catch (error: any) {
    console.error("Error fetching risk:", error);
    res.status(500).json({ error: "Failed to fetch risk" });
  }
});

router.post("/registers/risks", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      riskTitle: z.string().min(1),
      riskDescription: z.string().min(1),
      riskCategory: z.enum(riskCategories),
      scopeType: z.enum(riskScopeTypes),
      siteId: z.string().optional().nullable(),
      participantId: z.string().optional().nullable(),
      likelihood: z.enum(riskLevels),
      consequence: z.enum(riskLevels),
      riskRating: z.enum(riskRatings),
      existingControls: z.string().min(1),
      additionalControlsRequired: z.string().optional().nullable(),
      ownerUserId: z.string().min(1),
      reviewFrequency: z.enum(riskReviewFrequencies),
      nextReviewDate: z.string().datetime(),
    });
    
    const data = schema.parse(req.body);
    
    const risk = await storage.createRisk({
      ...data,
      companyId,
      createdByUserId: userId,
      nextReviewDate: new Date(data.nextReviewDate),
    });
    
    res.status(201).json(risk);
  } catch (error: any) {
    console.error("Error creating risk:", error);
    res.status(400).json({ error: error.message || "Failed to create risk" });
  }
});

router.patch("/registers/risks/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { id } = req.params;
    
    const existing = await storage.getRisk(id, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Risk not found" });
    }
    
    const schema = z.object({
      riskTitle: z.string().optional(),
      riskDescription: z.string().optional(),
      riskCategory: z.enum(riskCategories).optional(),
      scopeType: z.enum(riskScopeTypes).optional(),
      siteId: z.string().optional().nullable(),
      participantId: z.string().optional().nullable(),
      likelihood: z.enum(riskLevels).optional(),
      consequence: z.enum(riskLevels).optional(),
      riskRating: z.enum(riskRatings).optional(),
      existingControls: z.string().optional(),
      additionalControlsRequired: z.string().optional().nullable(),
      ownerUserId: z.string().optional(),
      reviewFrequency: z.enum(riskReviewFrequencies).optional(),
      nextReviewDate: z.string().optional(),
      status: z.enum(riskStatuses).optional(),
      closureNotes: z.string().optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    const updates: any = { ...data };
    if (data.nextReviewDate) {
      updates.nextReviewDate = new Date(data.nextReviewDate);
    }
    if (data.status === "CLOSED") {
      updates.closedAt = new Date();
      updates.closedByUserId = userId;
    }
    
    const updated = await storage.updateRisk(id, companyId, updates);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating risk:", error);
    res.status(400).json({ error: error.message || "Failed to update risk" });
  }
});

// ============================================================
// CONTINUOUS IMPROVEMENT REGISTER
// ============================================================

router.get("/registers/improvements", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const improvements = await storage.getImprovements(companyId);
    res.json(improvements);
  } catch (error: any) {
    console.error("Error fetching improvements:", error);
    res.status(500).json({ error: "Failed to fetch improvements" });
  }
});

router.get("/registers/improvements/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const improvement = await storage.getImprovement(id, companyId);
    if (!improvement) {
      return res.status(404).json({ error: "Improvement not found" });
    }
    res.json(improvement);
  } catch (error: any) {
    console.error("Error fetching improvement:", error);
    res.status(500).json({ error: "Failed to fetch improvement" });
  }
});

router.post("/registers/improvements", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      improvementTitle: z.string().min(1),
      source: z.enum(improvementSources),
      relatedRegisterType: z.enum(relatedRegisterTypes).optional().nullable(),
      relatedRecordId: z.string().optional().nullable(),
      description: z.string().min(1),
      improvementActions: z.string().min(1),
      responsibleUserId: z.string().min(1),
      targetCompletionDate: z.string().datetime(),
    });
    
    const data = schema.parse(req.body);
    
    const improvement = await storage.createImprovement({
      ...data,
      companyId,
      createdByUserId: userId,
      targetCompletionDate: new Date(data.targetCompletionDate),
    });
    
    res.status(201).json(improvement);
  } catch (error: any) {
    console.error("Error creating improvement:", error);
    res.status(400).json({ error: error.message || "Failed to create improvement" });
  }
});

router.patch("/registers/improvements/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { id } = req.params;
    
    const existing = await storage.getImprovement(id, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Improvement not found" });
    }
    
    const schema = z.object({
      improvementTitle: z.string().optional(),
      source: z.enum(improvementSources).optional(),
      relatedRegisterType: z.enum(relatedRegisterTypes).optional().nullable(),
      relatedRecordId: z.string().optional().nullable(),
      description: z.string().optional(),
      improvementActions: z.string().optional(),
      responsibleUserId: z.string().optional(),
      targetCompletionDate: z.string().optional(),
      status: z.enum(improvementStatuses).optional(),
      outcomeSummary: z.string().optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    const updates: any = { ...data };
    if (data.targetCompletionDate) {
      updates.targetCompletionDate = new Date(data.targetCompletionDate);
    }
    if (data.status === "COMPLETED") {
      updates.completedAt = new Date();
      updates.completedByUserId = userId;
    }
    
    const updated = await storage.updateImprovement(id, companyId, updates);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating improvement:", error);
    res.status(400).json({ error: error.message || "Failed to update improvement" });
  }
});

// ============================================================
// POLICY UPDATE REGISTER
// ============================================================

router.get("/registers/policies", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const policies = await storage.getPolicies(companyId);
    res.json(policies);
  } catch (error: any) {
    console.error("Error fetching policies:", error);
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

router.get("/registers/policies/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const policy = await storage.getPolicy(id, companyId);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }
    res.json(policy);
  } catch (error: any) {
    console.error("Error fetching policy:", error);
    res.status(500).json({ error: "Failed to fetch policy" });
  }
});

router.post("/registers/policies", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      policyName: z.string().min(1),
      policyCategory: z.enum(policyCategories),
      version: z.string().min(1),
      changeSummary: z.string().min(1),
      reasonForUpdate: z.enum(policyUpdateReasons),
      approvalRequired: z.boolean().optional().default(true),
      reviewDueDate: z.string().datetime(),
      effectiveDate: z.string().optional().nullable(),
      implementationNotes: z.string().optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    const policy = await storage.createPolicy({
      ...data,
      companyId,
      createdByUserId: userId,
      reviewDueDate: new Date(data.reviewDueDate),
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
    });
    
    res.status(201).json(policy);
  } catch (error: any) {
    console.error("Error creating policy:", error);
    res.status(400).json({ error: error.message || "Failed to create policy" });
  }
});

router.patch("/registers/policies/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { id } = req.params;
    
    const existing = await storage.getPolicy(id, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Policy not found" });
    }
    
    const schema = z.object({
      policyName: z.string().optional(),
      policyCategory: z.enum(policyCategories).optional(),
      version: z.string().optional(),
      changeSummary: z.string().optional(),
      reasonForUpdate: z.enum(policyUpdateReasons).optional(),
      approvalRequired: z.boolean().optional(),
      approvedByUserId: z.string().optional().nullable(),
      approvalDate: z.string().optional().nullable(),
      effectiveDate: z.string().optional().nullable(),
      reviewDueDate: z.string().optional(),
      staffNotified: z.boolean().optional(),
      implementationNotes: z.string().optional().nullable(),
      status: z.enum(policyStatuses).optional(),
    });
    
    const data = schema.parse(req.body);
    
    const updates: any = { ...data };
    if (data.reviewDueDate) {
      updates.reviewDueDate = new Date(data.reviewDueDate);
    }
    if (data.effectiveDate) {
      updates.effectiveDate = new Date(data.effectiveDate);
    }
    if (data.approvalDate) {
      updates.approvalDate = new Date(data.approvalDate);
    }
    if (data.status === "APPROVED" && !existing.approvedByUserId) {
      updates.approvedByUserId = userId;
      updates.approvalDate = new Date();
    }
    
    const updated = await storage.updatePolicy(id, companyId, updates);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating policy:", error);
    res.status(400).json({ error: error.message || "Failed to update policy" });
  }
});

// ============================================================
// LEGISLATIVE REGISTER
// ============================================================

const DEFAULT_LEGISLATION = [
  {
    legislationName: "NDIS Act 2013",
    jurisdiction: "FEDERAL" as const,
    authority: "Australian Government",
    description: "Primary legislation establishing the National Disability Insurance Scheme. Defines participant eligibility, funding principles, and provider requirements.",
    applicableTo: "ALL_PROVIDERS" as const,
    status: "CURRENT" as const,
  },
  {
    legislationName: "NDIS Quality and Safeguards Commission Rules 2018",
    jurisdiction: "FEDERAL" as const,
    authority: "NDIS Quality and Safeguards Commission",
    description: "Rules governing registration, quality, and safeguarding requirements for registered NDIS providers.",
    applicableTo: "ALL_PROVIDERS" as const,
    status: "CURRENT" as const,
  },
  {
    legislationName: "NDIS Code of Conduct",
    jurisdiction: "FEDERAL" as const,
    authority: "NDIS Quality and Safeguards Commission",
    description: "Mandatory code of conduct for all workers and providers delivering NDIS supports.",
    applicableTo: "ALL_PROVIDERS" as const,
    status: "CURRENT" as const,
  },
  {
    legislationName: "NDIS Practice Standards",
    jurisdiction: "FEDERAL" as const,
    authority: "NDIS Quality and Safeguards Commission",
    description: "Standards that registered providers must meet to demonstrate quality and safety of supports.",
    applicableTo: "ALL_PROVIDERS" as const,
    status: "CURRENT" as const,
  },
  {
    legislationName: "Restrictive Practices Authorization (Federal)",
    jurisdiction: "FEDERAL" as const,
    authority: "NDIS Quality and Safeguards Commission",
    description: "Requirements for authorizing the use of restrictive practices, including behavior support plans, reporting, and oversight.",
    applicableTo: "BEHAVIOUR_SUPPORT" as const,
    status: "CURRENT" as const,
  },
  {
    legislationName: "Disability Services Act 1986",
    jurisdiction: "FEDERAL" as const,
    authority: "Australian Government",
    description: "Federal legislation providing for the funding and delivery of disability services alongside NDIS.",
    applicableTo: "ALL_PROVIDERS" as const,
    status: "CURRENT" as const,
  },
  {
    legislationName: "Privacy Act 1988",
    jurisdiction: "FEDERAL" as const,
    authority: "Australian Government / OAIC",
    description: "Governs the handling of personal information, including Australian Privacy Principles (APPs).",
    applicableTo: "ALL_PROVIDERS" as const,
    status: "CURRENT" as const,
  },
  {
    legislationName: "Work Health and Safety Act 2011",
    jurisdiction: "FEDERAL" as const,
    authority: "Safe Work Australia",
    description: "Provides a framework to protect health, safety and welfare of all workers and others at a workplace.",
    applicableTo: "WORKFORCE" as const,
    status: "CURRENT" as const,
  },
];

router.get("/registers/legislative", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    
    let items = await storage.getLegislativeItems(companyId);
    
    if (items.length === 0) {
      for (const leg of DEFAULT_LEGISLATION) {
        await storage.createLegislativeItem({
          ...leg,
          companyId,
        });
      }
      items = await storage.getLegislativeItems(companyId);
    }
    
    res.json(items);
  } catch (error: any) {
    console.error("Error fetching legislative items:", error);
    res.status(500).json({ error: "Failed to fetch legislative items" });
  }
});

router.get("/registers/legislative/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    const item = await storage.getLegislativeItem(id, companyId);
    if (!item) {
      return res.status(404).json({ error: "Legislative item not found" });
    }
    res.json(item);
  } catch (error: any) {
    console.error("Error fetching legislative item:", error);
    res.status(500).json({ error: "Failed to fetch legislative item" });
  }
});

router.post("/registers/legislative", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    
    const schema = z.object({
      legislationName: z.string().min(1),
      jurisdiction: z.enum(legislativeJurisdictions),
      authority: z.string().min(1),
      description: z.string().min(1),
      applicableTo: z.enum(legislativeApplicability),
      linkedPolicies: z.array(z.string()).optional().nullable(),
    });
    
    const data = schema.parse(req.body);
    
    const item = await storage.createLegislativeItem({
      ...data,
      companyId,
    });
    
    res.status(201).json(item);
  } catch (error: any) {
    console.error("Error creating legislative item:", error);
    res.status(400).json({ error: error.message || "Failed to create legislative item" });
  }
});

router.patch("/registers/legislative/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const existing = await storage.getLegislativeItem(id, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Legislative item not found" });
    }
    
    const schema = z.object({
      legislationName: z.string().optional(),
      jurisdiction: z.enum(legislativeJurisdictions).optional(),
      authority: z.string().optional(),
      description: z.string().optional(),
      applicableTo: z.enum(legislativeApplicability).optional(),
      lastReviewedDate: z.string().optional().nullable(),
      reviewNotes: z.string().optional().nullable(),
      linkedPolicies: z.array(z.string()).optional().nullable(),
      status: z.enum(legislativeStatuses).optional(),
    });
    
    const data = schema.parse(req.body);
    
    const updates: any = { ...data };
    if (data.lastReviewedDate) {
      updates.lastReviewedDate = new Date(data.lastReviewedDate);
    }
    
    const updated = await storage.updateLegislativeItem(id, companyId, updates);
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating legislative item:", error);
    res.status(400).json({ error: error.message || "Failed to update legislative item" });
  }
});

export default router;
