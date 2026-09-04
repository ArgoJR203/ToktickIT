/**
 * Attachment Validator Utility (Issue #2-8 / UNIT-02)
 *
 * Enforces business rules:
 * - BR-12: Strictly permitted MIME types: image/jpeg, image/jpg, image/png, image/webp, application/pdf
 * - BR-13: Maximum file size: 5 MB (5,242,880 bytes)
 */

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes (5 MB)

export interface ValidationResult {
  isValid: boolean;
  errorCode?: "FILE_TOO_LARGE" | "INVALID_FILE_TYPE";
  message?: string;
}

export function validateAttachment(file: {
  mimetype?: string;
  size?: number;
}): ValidationResult {
  if (!file) {
    return {
      isValid: false,
      errorCode: "INVALID_FILE_TYPE",
      message: "No file provided.",
    };
  }

  // Check file size (BR-13)
  if (typeof file.size === "number" && file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      errorCode: "FILE_TOO_LARGE",
      message: "File exceeds maximum permitted size of 5 MB (5,242,880 bytes).",
    };
  }

  // Check MIME type (BR-12)
  const mime = file.mimetype?.toLowerCase() || "";
  const isAllowedMime = (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);

  if (!isAllowedMime) {
    return {
      isValid: false,
      errorCode: "INVALID_FILE_TYPE",
      message:
        "Unsupported file type. Only JPG, PNG, WEBP, and PDF files are permitted.",
    };
  }

  return { isValid: true };
}
