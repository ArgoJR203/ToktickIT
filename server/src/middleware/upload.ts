import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "../utils/attachment-validator.js";

// Ensure uploads directory exists relative to server root regardless of process.cwd()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename to prevent directory traversal / unsafe characters
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const randomHex = crypto.randomBytes(4).toString("hex");
    const uniqueName = `${Date.now()}-${randomHex}-${sanitized}`;
    cb(null, uniqueName);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype?.toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(mime as any)) {
      cb(null, true);
    } else {
      const err: any = new Error(
        "Unsupported file type. Only JPG, PNG, WEBP, and PDF files are permitted."
      );
      err.code = "INVALID_FILE_TYPE";
      cb(err, false);
    }
  },
});
