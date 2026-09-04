import { describe, it, expect } from "vitest";
import {
  validateAttachment,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "../../src/utils/attachment-validator.js";

describe("Attachment Validator Utility (UNIT-02 / BR-12, BR-13)", () => {
  it("accepts valid MIME types when size is <= 5MB", () => {
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    for (const mime of validTypes) {
      const result = validateAttachment({
        mimetype: mime,
        size: 1024 * 500, // 500 KB
      });
      expect(result.isValid).toBe(true);
      expect(result.errorCode).toBeUndefined();
    }
  });

  it("accepts an attachment exactly at the 5MB limit", () => {
    const result = validateAttachment({
      mimetype: "application/pdf",
      size: MAX_FILE_SIZE, // Exactly 5,242,880 bytes
    });
    expect(result.isValid).toBe(true);
  });

  it("rejects an attachment exceeding the 5MB limit with FILE_TOO_LARGE (BR-13)", () => {
    const result = validateAttachment({
      mimetype: "application/pdf",
      size: MAX_FILE_SIZE + 1, // 5MB + 1 byte
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("FILE_TOO_LARGE");
    expect(result.message).toContain("exceeds maximum");
  });

  it("rejects unsupported MIME types with INVALID_FILE_TYPE (BR-12)", () => {
    const invalidTypes = [
      "text/plain",
      "application/zip",
      "video/mp4",
      "application/javascript",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/gif",
    ];

    for (const mime of invalidTypes) {
      const result = validateAttachment({
        mimetype: mime,
        size: 1024 * 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe("INVALID_FILE_TYPE");
      expect(result.message).toContain("Unsupported file type");
    }
  });

  it("handles case-insensitive MIME types correctly", () => {
    const result = validateAttachment({
      mimetype: "IMAGE/PNG",
      size: 1024,
    });
    expect(result.isValid).toBe(true);
  });

  it("rejects missing or empty file object", () => {
    // @ts-expect-error test null argument
    const result = validateAttachment(null);
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("INVALID_FILE_TYPE");
  });
});
