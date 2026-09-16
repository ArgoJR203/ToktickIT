import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { getPrisma } from "../prisma.js";
import { signToken } from "../utils/jwt.js";
import { revokeToken } from "../utils/token-revocation.js";
import { validatePasswordComplexity } from "../utils/password-validator.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();

/**
 * POST /api/auth/login (API Spec §3.1, BR-01, AC-01, AC-05, API-01, API-02)
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Email and password are required.",
        },
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Look up user by case-insensitive email
    const user = await getPrisma().user.findFirst({
      where: {
        email: {
          equals: trimmedEmail,
          mode: "insensitive",
        },
      },
    });

    // Inactive account or non-existent user rejected safely (BR-01, API-02)
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password. Please try again.",
        },
      });
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password. Please try again.",
        },
      });
    }

    // Sign JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("Error in POST /api/auth/login:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to authenticate.",
      },
    });
  }
});

/**
 * POST /api/auth/logout (API Spec §3.2, BR-09, AC-06, API-06)
 */
authRouter.post("/logout", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.token) {
      revokeToken(req.token);
    }

    return res.status(200).json({
      message: "Successfully logged out. Token has been revoked.",
    });
  } catch (err) {
    console.error("Error in POST /api/auth/logout:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to log out.",
      },
    });
  }
});

/**
 * GET /api/auth/me (API Spec §3.3, FR-05)
 */
authRouter.get("/me", authenticate, (req: Request, res: Response) => {
  return res.status(200).json({
    user: req.user,
  });
});

/**
 * POST /api/auth/change-password (API Spec §3.4, BR-02, BR-07, AC-02, API-03..API-05)
 */
authRouter.post("/change-password", authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Current password, new password, and confirmation are required.",
        },
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "New password and confirmation do not match.",
        },
      });
    }

    const user = await getPrisma().user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "User not found.",
        },
      });
    }

    // Verify current password
    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      return res.status(400).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Current password is incorrect.",
        },
      });
    }

    // Validate password complexity (BR-07, API-03, API-04)
    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.valid) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: complexity.errors[0] || "Password does not meet complexity requirements.",
          details: complexity.errors,
        },
      });
    }

    // Hash new password and clear mustChangePassword flag (BR-02, API-05)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await getPrisma().user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
      },
    });

    return res.status(200).json({
      message: "Password changed successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error in POST /api/auth/change-password:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to change password.",
      },
    });
  }
});
