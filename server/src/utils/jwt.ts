import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Role } from "@prisma/client";

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  exp?: number;
  iat?: number;
}

const DEFAULT_EXPIRY = "8h"; // 8 hours per API Spec §1.1

// Lazy singleton secret: NEVER hardcoded in source control (Handout §6.1)
let resolvedSecret: string | null = null;

/**
 * Resolves the JWT secret without exposing any hardcoded fallback in source control.
 * Satisfies Handout §6.1:
 * - Checks process.env.JWT_SECRET.
 * - In production (NODE_ENV === "production"), immediately throws if not configured in environment.
 * - Reads from local .env if in development and not yet loaded.
 * - In dev/test when unconfigured, generates an ephemeral, cryptographically random in-memory secret.
 */
export function getJwtSecret(options?: { allowEnvFile?: boolean }): string {
  if (resolvedSecret) {
    return resolvedSecret;
  }

  // 1. Check process.env.JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== "") {
    resolvedSecret = process.env.JWT_SECRET.trim();
    return resolvedSecret;
  }

  // 2. Strict production refusal (Handout §6.1)
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: JWT_SECRET environment variable is required in production but was not provided."
    );
  }

  // 3. Fallback: Parse from local .env directly if process.env was not populated (dev only)
  if (options?.allowEnvFile !== false) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const match = line.match(/^\s*JWT_SECRET\s*=\s*["']?(.*?)["']?\s*$/);
          if (match && match[1] && match[1].trim() !== "") {
            const secret = match[1].trim();
            process.env.JWT_SECRET = secret;
            resolvedSecret = secret;
            return resolvedSecret;
          }
        }
      }
    } catch (err) {
      console.error("Failed to read .env for JWT_SECRET:", err);
    }
  }

  // 4. In dev/test without .env: generate a cryptographically random secret in memory
  // This guarantees zero hardcoded secrets exist in source control.
  resolvedSecret = crypto.randomBytes(64).toString("hex");
  console.warn(
    "[SECURITY WARNING] JWT_SECRET is not configured. Generated an ephemeral, cryptographically random in-memory secret for this session."
  );
  return resolvedSecret;
}

/**
 * Resets the cached secret. Used exclusively in unit tests to test environment variations.
 */
export function resetJwtSecretForTesting(override?: string | null): void {
  resolvedSecret = override ?? null;
}

/**
 * Signs an authentication JWT.
 */
export function signToken(
  payload: Omit<AuthTokenPayload, "exp" | "iat">,
  expiresIn: string | number = DEFAULT_EXPIRY
): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verifies and decodes an authentication JWT.
 * Returns decoded payload if valid, or null if invalid or expired.
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as AuthTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
