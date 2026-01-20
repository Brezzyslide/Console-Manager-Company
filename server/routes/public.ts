import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const PORTAL_JWT_SECRET = process.env.COMPANY_JWT_SECRET || "portal-session-secret";
const PORTAL_SESSION_EXPIRY = "4h";

interface PortalSession {
  portalId: string;
  token: string;
}

interface AuthenticatedPortalRequest extends Request {
  portalSession?: PortalSession;
}

function createPortalSessionToken(portalId: string, token: string): string {
  return jwt.sign({ portalId, token }, PORTAL_JWT_SECRET, { expiresIn: PORTAL_SESSION_EXPIRY });
}

function verifyPortalSession(sessionToken: string): PortalSession | null {
  try {
    const decoded = jwt.verify(sessionToken, PORTAL_JWT_SECRET) as PortalSession;
    return decoded;
  } catch {
    return null;
  }
}

async function requirePortalSession(req: AuthenticatedPortalRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Session token required" });
  }
  
  const sessionToken = authHeader.substring(7);
  const session = verifyPortalSession(sessionToken);
  
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  
  const portal = await storage.getAuditEvidencePortalByToken(session.token);
  
  if (!portal || portal.id !== session.portalId) {
    return res.status(401).json({ error: "Portal not found" });
  }
  
  if (portal.revokedAt || (portal.expiresAt && new Date(portal.expiresAt) < new Date())) {
    return res.status(403).json({ error: "Portal access denied" });
  }
  
  req.portalSession = session;
  next();
}

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads", "evidence");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function sanitizeFilename(filename: string): string {
  return path.basename(filename).replace(/[^\w.-]/g, '_');
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const sanitized = sanitizeFilename(file.originalname);
      const uniqueName = `${crypto.randomUUID()}-${sanitized}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/evidence/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const evidenceRequest = await storage.getEvidenceRequestByPublicToken(token);
    
    if (!evidenceRequest) {
      return res.status(404).json({ error: "Evidence request not found or link is invalid" });
    }

    if (evidenceRequest.status === "REJECTED") {
      return res.status(400).json({ error: "This evidence request has been closed" });
    }

    const company = await storage.getCompany(evidenceRequest.companyId);
    
    return res.json({
      id: evidenceRequest.id,
      evidenceType: evidenceRequest.evidenceType,
      requestNote: evidenceRequest.requestNote,
      dueDate: evidenceRequest.dueDate,
      status: evidenceRequest.status,
      companyName: company?.legalName || "Unknown Company",
    });
  } catch (error) {
    console.error("Error fetching evidence request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/evidence/:token/upload", upload.single("file"), async (req, res) => {
  try {
    const { token } = req.params;
    const { uploaderName, uploaderEmail, note, documentType } = req.body;

    if (!uploaderName || !uploaderEmail) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const evidenceRequest = await storage.getEvidenceRequestByPublicToken(token);
    
    if (!evidenceRequest) {
      return res.status(404).json({ error: "Evidence request not found or link is invalid" });
    }

    if (evidenceRequest.status === "REJECTED") {
      return res.status(400).json({ error: "This evidence request has been closed" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const sanitizedFileName = sanitizeFilename(req.file.originalname);

    const evidenceItem = await storage.createEvidenceItemPublic(evidenceRequest.id, {
      storageKind: "UPLOAD",
      fileName: sanitizedFileName,
      mimeType: req.file.mimetype,
      filePath: req.file.path,
      fileSizeBytes: req.file.size,
      note: note || null,
      externalUploaderName: uploaderName,
      externalUploaderEmail: uploaderEmail,
      uploadedByCompanyUserId: null,
      documentType: documentType || null,
    });

    if (evidenceRequest.status === "REQUESTED") {
      await storage.updateEvidenceRequestByToken(token, { status: "SUBMITTED" });
    }

    await storage.logChange({
      actorType: "system",
      actorId: `external:${uploaderEmail}`,
      companyId: evidenceRequest.companyId,
      action: "EVIDENCE_SUBMITTED_EXTERNAL",
      entityType: "evidence_request",
      entityId: evidenceRequest.id,
      afterJson: { 
        evidenceItemId: evidenceItem.id,
        fileName: sanitizedFileName,
        externalUploaderName: uploaderName,
        externalUploaderEmail: uploaderEmail,
      },
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      item: {
        id: evidenceItem.id,
        fileName: evidenceItem.fileName,
        uploadedAt: evidenceItem.createdAt,
      },
    });
  } catch (error) {
    console.error("Error uploading evidence:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ===== AUDIT EVIDENCE PORTAL (BULK UPLOAD) ROUTES =====

const portalAuthSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

router.post("/audit-portal/:token/auth", async (req, res) => {
  try {
    const { token } = req.params;
    const input = portalAuthSchema.parse(req.body);
    
    const portal = await storage.getAuditEvidencePortalByToken(token);
    
    if (!portal) {
      return res.status(404).json({ error: "Portal not found or link is invalid" });
    }
    
    if (portal.revokedAt) {
      return res.status(403).json({ error: "This portal link has been revoked" });
    }
    
    if (portal.expiresAt && new Date(portal.expiresAt) < new Date()) {
      return res.status(403).json({ error: "This portal link has expired" });
    }
    
    const isValidPassword = await bcrypt.compare(input.password, portal.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }
    
    await storage.updatePortalLastAccessed(portal.id);
    
    const audit = await storage.getAudit(portal.auditId, portal.companyId);
    const company = await storage.getCompany(portal.companyId);
    
    const sessionToken = createPortalSessionToken(portal.id, token);
    
    return res.json({
      success: true,
      sessionToken,
      portalId: portal.id,
      auditId: portal.auditId,
      auditName: audit?.title || "Audit",
      companyName: company?.legalName || "Company",
      expiresAt: portal.expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Portal auth error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/audit-portal/evidence-requests", requirePortalSession, async (req: AuthenticatedPortalRequest, res) => {
  try {
    const session = req.portalSession!;
    const portal = await storage.getAuditEvidencePortalByToken(session.token);
    
    if (!portal) {
      return res.status(404).json({ error: "Portal not found" });
    }
    
    const evidenceRequests = await storage.getEvidenceRequests(portal.companyId, { auditId: portal.auditId });
    
    const requestsForExternal = evidenceRequests
      .filter(req => req.status !== "REJECTED")
      .map(req => ({
        id: req.id,
        evidenceType: req.evidenceType,
        requestNote: req.requestNote,
        dueDate: req.dueDate,
        status: req.status,
        findingId: req.findingId,
      }));
    
    return res.json(requestsForExternal);
  } catch (error) {
    console.error("Portal evidence requests error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/audit-portal/evidence-requests/:requestId/upload", requirePortalSession, upload.single("file"), async (req: AuthenticatedPortalRequest, res) => {
  try {
    const session = req.portalSession!;
    const { requestId } = req.params;
    const { uploaderName, uploaderEmail, note, documentType } = req.body;
    
    if (!uploaderName || !uploaderEmail) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    
    const portal = await storage.getAuditEvidencePortalByToken(session.token);
    
    if (!portal) {
      return res.status(404).json({ error: "Portal not found" });
    }
    
    const evidenceRequest = await storage.getEvidenceRequest(requestId, portal.companyId);
    
    if (!evidenceRequest || evidenceRequest.auditId !== portal.auditId) {
      return res.status(404).json({ error: "Evidence request not found" });
    }
    
    if (evidenceRequest.status === "REJECTED") {
      return res.status(400).json({ error: "This evidence request has been closed" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const sanitizedFileName = sanitizeFilename(req.file.originalname);
    
    const evidenceItem = await storage.createEvidenceItemPublic(evidenceRequest.id, {
      storageKind: "UPLOAD",
      fileName: sanitizedFileName,
      mimeType: req.file.mimetype,
      filePath: req.file.path,
      fileSizeBytes: req.file.size,
      note: note || null,
      externalUploaderName: uploaderName,
      externalUploaderEmail: uploaderEmail,
      uploadedByCompanyUserId: null,
      documentType: documentType || null,
    });
    
    if (evidenceRequest.status === "REQUESTED") {
      await storage.updateEvidenceRequest(requestId, portal.companyId, { status: "SUBMITTED" });
    }
    
    await storage.logChange({
      actorType: "system",
      actorId: `portal:${portal.id}:${uploaderEmail}`,
      companyId: portal.companyId,
      action: "EVIDENCE_SUBMITTED_PORTAL",
      entityType: "evidence_request",
      entityId: requestId,
      afterJson: { 
        evidenceItemId: evidenceItem.id,
        fileName: sanitizedFileName,
        externalUploaderName: uploaderName,
        externalUploaderEmail: uploaderEmail,
        portalId: portal.id,
      },
    });
    
    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      item: {
        id: evidenceItem.id,
        fileName: evidenceItem.fileName,
        uploadedAt: evidenceItem.createdAt,
      },
    });
  } catch (error) {
    console.error("Portal evidence upload error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/audit-portal/general-evidence", requirePortalSession, upload.single("file"), async (req: AuthenticatedPortalRequest, res) => {
  try {
    const session = req.portalSession!;
    const { uploaderName, uploaderEmail, description, note } = req.body;
    
    if (!uploaderName || !uploaderEmail) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    
    if (!description || description.length < 1) {
      return res.status(400).json({ error: "Description is required to explain what this evidence is for" });
    }
    
    const portal = await storage.getAuditEvidencePortalByToken(session.token);
    
    if (!portal) {
      return res.status(404).json({ error: "Portal not found" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const sanitizedFileName = sanitizeFilename(req.file.originalname);
    
    const submission = await storage.createGeneralEvidenceSubmission({
      companyId: portal.companyId,
      auditId: portal.auditId,
      portalId: portal.id,
      fileName: sanitizedFileName,
      mimeType: req.file.mimetype,
      filePath: req.file.path,
      fileSizeBytes: req.file.size,
      description: note ? `${description}\n\nNote: ${note}` : description,
      uploaderName,
      uploaderEmail,
      status: "PENDING_REVIEW",
    });
    
    await storage.logChange({
      actorType: "system",
      actorId: `portal:${portal.id}:${uploaderEmail}`,
      companyId: portal.companyId,
      action: "GENERAL_EVIDENCE_SUBMITTED",
      entityType: "general_evidence_submission",
      entityId: submission.id,
      afterJson: { 
        fileName: sanitizedFileName,
        description,
        externalUploaderName: uploaderName,
        externalUploaderEmail: uploaderEmail,
        portalId: portal.id,
      },
    });
    
    return res.status(201).json({
      success: true,
      message: "Evidence submitted successfully. It will be reviewed by the audit team.",
      item: {
        id: submission.id,
        fileName: submission.fileName,
        description: submission.description,
        uploadedAt: submission.createdAt,
      },
    });
  } catch (error) {
    console.error("Portal general evidence upload error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
