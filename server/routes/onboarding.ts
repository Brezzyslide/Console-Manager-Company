import { Router } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireCompanyAuth, requireRole, AuthenticatedCompanyRequest } from "../lib/companyAuth";
import { storage } from "../storage";

const router = Router();

const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50);
  return `${base}_${crypto.randomBytes(4).toString("hex")}${ext}`;
}

// GET /api/company/onboarding/status
router.get("/onboarding/status", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const company = await storage.getCompany(companyId);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    const settings = await storage.getCompanySettings(companyId);
    const servicesCount = await storage.getCompanyServiceSelectionsCount(companyId);
    const documentsCount = await storage.getCompanyDocumentsCount(companyId);
    
    return res.json({
      onboardingStatus: company.onboardingStatus,
      checklist: {
        hasCompanySettings: !!settings,
        hasAtLeastOneServiceSelected: servicesCount > 0,
        hasAtLeastOneDocumentUploadedOrLinked: documentsCount > 0,
      },
    });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/company/onboarding/start
router.post("/onboarding/start", requireCompanyAuth, requireRole("CompanyAdmin"), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const company = await storage.getCompany(companyId);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    if (company.onboardingStatus !== "not_started") {
      return res.json({ onboardingStatus: company.onboardingStatus });
    }
    
    const updated = await storage.updateCompanyOnboardingStatus(companyId, "in_progress");
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "COMPANY_ONBOARDING_STARTED",
      entityType: "company",
      entityId: companyId,
      beforeJson: { onboardingStatus: "not_started" },
      afterJson: { onboardingStatus: "in_progress" },
    });
    
    return res.json({ onboardingStatus: updated?.onboardingStatus });
  } catch (error) {
    console.error("Start onboarding error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/company/onboarding/complete - CompanyAdmin only
router.post("/onboarding/complete", requireCompanyAuth, requireRole("CompanyAdmin"), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    
    const settings = await storage.getCompanySettings(companyId);
    const servicesCount = await storage.getCompanyServiceSelectionsCount(companyId);
    const documentsCount = await storage.getCompanyDocumentsCount(companyId);
    
    const errors: string[] = [];
    if (!settings) errors.push("Company settings must be saved");
    if (servicesCount === 0) errors.push("At least one service must be selected");
    if (documentsCount === 0) errors.push("At least one document must be uploaded or linked");
    
    if (errors.length > 0) {
      return res.status(400).json({ error: "Onboarding requirements not met", details: errors });
    }
    
    const company = await storage.getCompany(companyId);
    const completedAt = new Date();
    const updated = await storage.updateCompanyOnboardingStatus(companyId, "completed", completedAt);
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "COMPANY_ONBOARDING_COMPLETED",
      entityType: "company",
      entityId: companyId,
      beforeJson: { onboardingStatus: company?.onboardingStatus, status: company?.status },
      afterJson: { onboardingStatus: "completed", status: "active", onboardingCompletedAt: completedAt.toISOString() },
    });
    
    return res.json({ 
      onboardingStatus: updated?.onboardingStatus,
      onboardingCompletedAt: updated?.onboardingCompletedAt,
    });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/company/settings
router.get("/settings", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const settings = await storage.getCompanySettings(companyId);
    return res.json(settings || null);
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/company/settings
const settingsSchema = z.object({
  tradingName: z.string().nullable().optional(),
  businessAddress: z.string().nullable().optional(),
  primaryPhone: z.string().nullable().optional(),
  ndisRegistrationGroups: z.array(z.string()).nullable().optional(),
  operatingRegions: z.array(z.string()).nullable().optional(),
  supportDeliveryContexts: z.array(z.string()).nullable().optional(),
  keyRisksSummary: z.string().nullable().optional(),
  documentRetentionNote: z.string().nullable().optional(),
});

router.put("/settings", requireCompanyAuth, requireRole("CompanyAdmin"), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const input = settingsSchema.parse(req.body);
    
    const existing = await storage.getCompanySettings(companyId);
    
    const settings = await storage.upsertCompanySettings({
      companyId,
      ...input,
    });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "COMPANY_SETTINGS_UPDATED",
      entityType: "company_settings",
      entityId: settings.id,
      beforeJson: existing || null,
      afterJson: settings,
    });
    
    return res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Update settings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/company/services
router.get("/services", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const company = await storage.getCompany(companyId);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    const selections = await storage.getCompanyServiceSelections(companyId);
    const allLineItems = await storage.getSupportLineItems();
    const categories = await storage.getSupportCategories();
    
    const selectedItemIds = new Set(selections.map(s => s.lineItemId));
    
    const groupedServices = categories.map(cat => {
      const categoryItems = allLineItems.filter(item => item.categoryId === cat.id);
      return {
        categoryId: cat.id,
        categoryKey: cat.categoryKey,
        categoryLabel: cat.categoryLabel,
        items: categoryItems.map(item => ({
          id: item.id,
          itemCode: item.itemCode,
          itemLabel: item.itemLabel,
          budgetGroup: item.budgetGroup,
          isSelected: selectedItemIds.has(item.id),
        })),
        selectedCount: categoryItems.filter(item => selectedItemIds.has(item.id)).length,
      };
    });
    
    return res.json({
      mode: company.serviceSelectionMode,
      categories: groupedServices,
      totalSelected: selections.length,
    });
  } catch (error) {
    console.error("Get services error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/company/services - CompanyAdmin only
const servicesUpdateSchema = z.object({
  mode: z.enum(["ALL", "CATEGORY", "CUSTOM"]),
  selectedCategoryIds: z.array(z.string()).optional(),
  selectedLineItemIds: z.array(z.string()).optional(),
});

router.put("/services", requireCompanyAuth, requireRole("CompanyAdmin"), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const input = servicesUpdateSchema.parse(req.body);
    
    const existingSelections = await storage.getCompanyServiceSelections(companyId);
    const previousCount = existingSelections.length;
    
    let selectedItemIds: string[] = [];
    
    if (input.mode === "ALL") {
      const allItems = await storage.getActiveLineItems();
      selectedItemIds = allItems.map(item => item.id);
    } else if (input.mode === "CATEGORY" && input.selectedCategoryIds) {
      const items = await storage.getLineItemsByCategoryIds(input.selectedCategoryIds);
      selectedItemIds = items.map(item => item.id);
    } else if (input.mode === "CUSTOM" && input.selectedLineItemIds) {
      selectedItemIds = input.selectedLineItemIds;
    }
    
    // Delete existing and insert new (transactional replace)
    await storage.deleteCompanyServiceSelections(companyId);
    
    if (selectedItemIds.length > 0) {
      await storage.createCompanyServiceSelections(
        selectedItemIds.map(lineItemId => ({
          companyId,
          lineItemId,
        }))
      );
    }
    
    // Update company's service selection mode
    await storage.updateCompany(companyId, { serviceSelectionMode: input.mode });
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "COMPANY_SERVICES_UPDATED",
      entityType: "company_service_selections",
      entityId: companyId,
      beforeJson: { mode: "previous", count: previousCount },
      afterJson: { mode: input.mode, count: selectedItemIds.length },
    });
    
    return res.json({ 
      mode: input.mode, 
      selectedCount: selectedItemIds.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Update services error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/company/documents
router.get("/documents", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const documents = await storage.getCompanyDocuments(companyId);
    return res.json(documents);
  } catch (error) {
    console.error("Get documents error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/company/documents
const docTypes = [
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
  "other",
] as const;

const documentLinkSchema = z.object({
  storageKind: z.literal("link"),
  docType: z.enum(docTypes),
  title: z.string().min(1),
  externalLink: z.string().url(),
  notes: z.string().nullable().optional(),
});

router.post("/documents", requireCompanyAuth, requireRole("CompanyAdmin"), async (req: AuthenticatedCompanyRequest, res) => {
  const companyId = req.companyUser!.companyId;
  
  // Check if this is a link submission (JSON body)
  if (req.headers["content-type"]?.includes("application/json")) {
    try {
      const input = documentLinkSchema.parse(req.body);
      
      const doc = await storage.createCompanyDocument({
        companyId,
        docType: input.docType,
        title: input.title,
        storageKind: "link",
        externalLink: input.externalLink,
        notes: input.notes || null,
        uploadedByCompanyUserId: req.companyUser!.companyUserId,
      });
      
      await storage.logChange({
        actorType: "company_user",
        actorId: req.companyUser!.companyUserId,
        companyId,
        action: "COMPANY_DOCUMENT_ADDED",
        entityType: "company_document",
        entityId: doc.id,
        beforeJson: null,
        afterJson: { docType: doc.docType, title: doc.title, storageKind: doc.storageKind },
      });
      
      return res.status(201).json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Create document link error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  
  // File upload
  const uploadDir = path.join(process.cwd(), "uploads", "company", companyId);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => cb(null, sanitizeFilename(file.originalname)),
    }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIMES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`));
      }
    },
  }).single("file");
  
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }
    
    const docType = req.body.docType;
    const title = req.body.title;
    const notes = req.body.notes;
    
    if (!docType || !docTypes.includes(docType)) {
      return res.status(400).json({ error: "Valid docType is required" });
    }
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    try {
      const doc = await storage.createCompanyDocument({
        companyId,
        docType: docType as typeof docTypes[number],
        title,
        storageKind: "upload",
        filePath: `uploads/company/${companyId}/${req.file.filename}`,
        fileName: req.file.originalname,
        fileMime: req.file.mimetype,
        fileSize: req.file.size,
        notes: notes || null,
        uploadedByCompanyUserId: req.companyUser!.companyUserId,
      });
      
      await storage.logChange({
        actorType: "company_user",
        actorId: req.companyUser!.companyUserId,
        companyId,
        action: "COMPANY_DOCUMENT_ADDED",
        entityType: "company_document",
        entityId: doc.id,
        beforeJson: null,
        afterJson: { docType: doc.docType, title: doc.title, storageKind: doc.storageKind, fileName: doc.fileName },
      });
      
      return res.status(201).json(doc);
    } catch (error) {
      console.error("Create document upload error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

// PATCH /api/company/documents/:id
const documentUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  docType: z.enum(docTypes).optional(),
  notes: z.string().nullable().optional(),
  externalLink: z.string().url().optional(),
});

router.patch("/documents/:id", requireCompanyAuth, requireRole("CompanyAdmin"), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const docId = req.params.id;
    const input = documentUpdateSchema.parse(req.body);
    
    const existing = await storage.getCompanyDocument(docId, companyId);
    if (!existing) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    const updated = await storage.updateCompanyDocument(docId, companyId, input);
    
    if (!updated) {
      return res.status(404).json({ error: "Document not found or update failed" });
    }
    
    await storage.logChange({
      actorType: "company_user",
      actorId: req.companyUser!.companyUserId,
      companyId,
      action: "COMPANY_DOCUMENT_UPDATED",
      entityType: "company_document",
      entityId: docId,
      beforeJson: { title: existing.title, docType: existing.docType, notes: existing.notes },
      afterJson: { title: updated.title, docType: updated.docType, notes: updated.notes },
    });
    
    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromZodError(error).message });
    }
    console.error("Update document error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
