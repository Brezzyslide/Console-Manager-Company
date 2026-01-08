import { Router } from "express";
import { storage } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads", "evidence");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${crypto.randomUUID()}-${file.originalname}`;
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
    const { uploaderName, uploaderEmail, note } = req.body;

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

    const evidenceItem = await storage.createEvidenceItemPublic(evidenceRequest.id, {
      storageKind: "UPLOAD",
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      filePath: req.file.path,
      fileSizeBytes: req.file.size,
      note: note || null,
      externalUploaderName: uploaderName,
      externalUploaderEmail: uploaderEmail,
      uploadedByCompanyUserId: null,
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

export default router;
