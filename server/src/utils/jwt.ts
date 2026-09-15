import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  exp?: number;
  iat?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "toktickit_jwt_secret_key_2026_cpe334";
const DEFAULT_EXPIRY = "8h"; // 8 hours per API Spec §1.1

/**
 * Signs an authentication JWT.
 */
export function signToken(
  payload: Omit<AuthTokenPayload, "exp" | "iat">,
  expiresIn: string | number = DEFAULT_EXPIRY
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/**
 * Verifies and decodes an authentication JWT.
 * Returns decoded payload if valid, or null if invalid or expired.
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
