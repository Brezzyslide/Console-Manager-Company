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
  externalNotificationBodies
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

export default router;
