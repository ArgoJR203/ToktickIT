import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { getPrisma } from "../prisma.js";
import { authenticate, enforcePasswordChange, requireRole } from "../middleware/auth.js";
import { validatePasswordComplexity } from "../utils/password-validator.js";
import {
  validateSelfDeactivation,
  validateLastAdminPreservation,
} from "../utils/admin-safety-validator.js";

export const adminRouter = Router();

// All admin endpoints require authentication, password change enforcement, and ADMINISTRATOR role (API-25, FR-07)
adminRouter.use(authenticate, enforcePasswordChange, requireRole("ADMINISTRATOR"));

/**
 * GET /api/admin/users
 * List all users with optional search and role filtering.
 * (AC-13, FR-17)
 */
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const { search, role } = req.query;
    const where: Record<string, unknown> = {};

    // 1. Search by name or email (case-insensitive)
    if (typeof search === "string" && search.trim() !== "") {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    // 2. Filter by role
    const validRoles: Role[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
    if (typeof role === "string" && validRoles.includes(role.trim().toUpperCase() as Role)) {
      where.role = role.trim().toUpperCase() as Role;
    }

    const users = await getPrisma().user.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalActiveAdmins = await getPrisma().user.count({
      where: { role: "ADMINISTRATOR", isActive: true },
    });
    res.setHeader("X-Active-Admin-Count", totalActiveAdmins.toString());
    res.setHeader("Access-Control-Expose-Headers", "X-Active-Admin-Count");

    return res.status(200).json(users);
  } catch (err) {
    console.error("Error in GET /api/admin/users:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to load users." },
    });
  }
});

/**
 * GET /api/admin/users/summary
 * Retrieve system-wide user statistics including authoritative active administrator count.
 */
adminRouter.get("/users/summary", async (_req: Request, res: Response) => {
  try {
    const activeAdminCount = await getPrisma().user.count({
      where: { role: "ADMINISTRATOR", isActive: true },
    });
    const totalUsers = await getPrisma().user.count();
    return res.status(200).json({ activeAdminCount, totalUsers });
  } catch (err) {
    console.error("Error in GET /api/admin/users/summary:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to load user summary." },
    });
  }
});

/**
 * POST /api/admin/users
 * Create user with role, initial password, and mustChangePassword = true.
 * (AC-13, FR-18, BR-20, API-20, API-21)
 */
adminRouter.post("/users", async (req: Request, res: Response) => {
  try {
    const { name, email, role, isActive, initialPassword } = req.body || {};

    // 1. Name validation
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Full Name is required." },
      });
    }

    // 2. Email validation
    if (typeof email !== "string" || email.trim().length === 0) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Email address is required." },
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid email address format." },
      });
    }

    // 3. Duplicate email check (BR-20, API-21)
    const existingUser = await getPrisma().user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: `A user account with email '${normalizedEmail}' already exists.`,
        },
      });
    }

    // 4. Role validation
    const validRoles: Role[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
    if (typeof role !== "string" || !validRoles.includes(role.trim().toUpperCase() as Role)) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: `Role must be one of: ${validRoles.join(", ")}`,
        },
      });
    }
    const targetRole = role.trim().toUpperCase() as Role;

    // 5. Initial password complexity validation (BR-07, API-20)
    const passwordValidation = validatePasswordComplexity(initialPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Validation failed for requested operation.",
          details: passwordValidation.errors.map((msg) => ({
            field: "password",
            message: msg,
          })),
        },
      });
    }

    // 6. Hash password and persist user with mustChangePassword = true (AC-13, FR-18)
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const activeStatus = isActive !== undefined ? Boolean(isActive) : true;

    const newUser = await getPrisma().user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        role: targetRole,
        isActive: activeStatus,
        passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    return res.status(201).json(newUser);
  } catch (err: any) {
    // Handle Prisma unique constraint race condition (Prisma P2002 on email)
    if (err?.code === "P2002") {
      const emailVal = req.body?.email ? String(req.body.email).trim().toLowerCase() : "specified";
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: `A user account with email '${emailVal}' already exists.`,
        },
      });
    }
    console.error("Error in POST /api/admin/users:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to create user account." },
    });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Edit user account with safety checks (self-deactivation and last admin preservation).
 * (AC-14, AC-15, BR-21, BR-22, API-22, API-23)
 */
adminRouter.patch("/users/:id", async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid user ID." },
      });
    }

    const targetUser = await getPrisma().user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User account not found." },
      });
    }

    const { name, email, role, isActive } = req.body || {};
    const updateData: Record<string, unknown> = {};

    // 1. Name update
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Full Name cannot be empty." },
        });
      }
      updateData.name = name.trim();
    }

    // 2. Email update & duplicate check
    if (email !== undefined) {
      if (typeof email !== "string" || email.trim().length === 0) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Email cannot be empty." },
        });
      }
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Invalid email address format." },
        });
      }

      if (normalizedEmail !== targetUser.email.toLowerCase()) {
        const existing = await getPrisma().user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing && existing.id !== targetUserId) {
          return res.status(409).json({
            error: {
              code: "DUPLICATE_EMAIL",
              message: `A user account with email '${normalizedEmail}' already exists.`,
            },
          });
        }
        updateData.email = normalizedEmail;
      }
    }

    // 3. Role check
    let nextRole: Role | undefined = undefined;
    if (role !== undefined) {
      const validRoles: Role[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
      if (typeof role !== "string" || !validRoles.includes(role.trim().toUpperCase() as Role)) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: `Role must be one of: ${validRoles.join(", ")}`,
          },
        });
      }
      nextRole = role.trim().toUpperCase() as Role;
      updateData.role = nextRole;
    }

    // 4. Active status & Safety Checks (BR-21, BR-22, API-22, API-23)
    let nextIsActive: boolean | undefined = undefined;
    if (isActive !== undefined) {
      nextIsActive = Boolean(isActive);
      updateData.isActive = nextIsActive;
    }

    // Safety Rule 1: Prevent self-deactivation (BR-21, AC-14, API-22)
    const selfDeactivationCheck = validateSelfDeactivation(
      req.user!.id,
      targetUserId,
      nextIsActive
    );
    if (!selfDeactivationCheck.allowed) {
      return res.status(400).json({
        error: {
          code: selfDeactivationCheck.code || "ADMIN_SAFETY_VIOLATION",
          message: selfDeactivationCheck.message || "Administrators cannot deactivate their own account.",
        },
      });
    }

    // Safety Rule 2: Prevent deactivating or demoting the last active Administrator (BR-22, AC-15, API-23)
    if (targetUser.role === "ADMINISTRATOR" && targetUser.isActive) {
      const activeAdminCount = await getPrisma().user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });

      const lastAdminCheck = validateLastAdminPreservation(
        activeAdminCount,
        targetUser.role,
        nextRole,
        nextIsActive
      );
      if (!lastAdminCheck.allowed) {
        return res.status(400).json({
          error: {
            code: lastAdminCheck.code || "ADMIN_SAFETY_VIOLATION",
            message: lastAdminCheck.message || "Cannot deactivate or demote the system's last active Administrator.",
          },
        });
      }
    }

    // 5. Update user in DB
    const updatedUser = await getPrisma().user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        updatedAt: true,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (err: any) {
    // Handle Prisma unique constraint race condition (Prisma P2002 on email)
    if (err?.code === "P2002") {
      const emailVal = req.body?.email ? String(req.body.email).trim().toLowerCase() : "specified";
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: `A user account with email '${emailVal}' already exists.`,
        },
      });
    }
    console.error("Error in PATCH /api/admin/users/:id:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to update user account." },
    });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user's password to a new temporary initial password, forcing password change on next login.
 * (AC-16, FR-20, API-24)
 */
adminRouter.post("/users/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid user ID." },
      });
    }

    const targetUser = await getPrisma().user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!targetUser) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User account not found." },
      });
    }

    const { newInitialPassword } = req.body || {};
    const validation = validatePasswordComplexity(newInitialPassword);
    if (!validation.valid) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Validation failed for requested operation.",
          details: validation.errors.map((msg) => ({
            field: "password",
            message: msg,
          })),
        },
      });
    }

    const passwordHash = await bcrypt.hash(newInitialPassword, 10);

    await getPrisma().user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    return res.status(200).json({
      message: "New initial password set. User will be required to change it at their next login.",
      userId: targetUserId,
      mustChangePassword: true,
    });
  } catch (err) {
    console.error("Error in POST /api/admin/users/:id/reset-password:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to reset user password." },
    });
  }
});
