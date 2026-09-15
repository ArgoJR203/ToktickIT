import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken } from "../utils/jwt.js";
import { isTokenRevoked } from "../utils/token-revocation.js";
import { getPrisma } from "../prisma.js";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      token?: string;
    }
  }
}

/**
 * Authentication Middleware (API Spec §1.2, BR-01, BR-09, AC-01, AC-06)
 * Verifies JWT token from Authorization header, validates revocation store,
 * and ensures user is active.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  const authHeader = req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication token is required.",
      },
    });
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication token is required.",
      },
    });
  }

  // Check Token Revocation Store (BR-09, AC-06, API-06)
  if (isTokenRevoked(token)) {
    return res.status(401).json({
      error: {
        code: "TOKEN_REVOKED",
        message: "Token has been revoked. Please log in again.",
      },
    });
  }

  // Verify JWT signature & expiration
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Invalid or expired authentication token.",
      },
    });
  }

  try {
    // Verify user exists and is active in database (BR-01)
    const user = await getPrisma().user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "User account is invalid or inactive.",
        },
      });
    }

    req.token = token;
    req.user = user;
    return next();
  } catch (err) {
    console.error("Error in authenticate middleware:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to authenticate user.",
      },
    });
  }
}

/**
 * Enforces mandatory first-login password change gating (BR-02, AC-02, API-07).
 * Gated endpoints return 403 PASSWORD_CHANGE_REQUIRED if mustChangePassword = true.
 */
export function enforcePasswordChange(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  if (req.user?.mustChangePassword === true) {
    const exemptPaths = [
      "/api/auth/change-password",
      "/api/auth/logout",
      "/api/auth/me",
    ];

    const currentPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    const isExempt = exemptPaths.some((p) => currentPath.startsWith(p));

    if (!isExempt) {
      return res.status(403).json({
        error: {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "You must change your initial password before accessing this resource.",
        },
      });
    }
  }

  return next();
}

/**
 * Role-Based Access Control Middleware (API Spec §1.2, §4.2, FR-07).
 * Requires that authenticated user possesses one of the permitted roles.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. You do not have permission to access this resource.",
        },
      });
    }

    return next();
  };
}
