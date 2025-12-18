import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

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

export function createCompanyUploadMiddleware(companyId: string) {
  const uploadDir = path.join(process.cwd(), "uploads", "company", companyId);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      cb(null, sanitizeFilename(file.originalname));
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIMES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`));
      }
    },
  });
}

export function getFileMetadata(file: Express.Multer.File, companyId: string) {
  return {
    filePath: `uploads/company/${companyId}/${file.filename}`,
    fileName: file.originalname,
    fileMime: file.mimetype,
    fileSize: file.size,
  };
}
