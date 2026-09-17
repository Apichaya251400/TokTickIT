import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requireRole, AuthenticatedRequest } from "../middleware/auth.js";

export const adminRouter = Router();

// GET /api/admin/users - List users with search (q) and role filter (ADMINISTRATOR ONLY / FR-14)
adminRouter.get(
  "/users",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const prisma = getPrisma();
      const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
      const roleParam = typeof req.query.role === "string" ? req.query.role.trim().toUpperCase() : undefined;

      const where: any = {};

      if (q) {
        where.OR = [
          { name: { contains: q } },
          { email: { contains: q } },
        ];
      }

      if (roleParam && roleParam !== "ALL") {
        if (!["REQUESTER", "IT_STAFF", "ADMINISTRATOR"].includes(roleParam)) {
          res.status(400).json({
            error: "INVALID_QUERY_PARAMETER",
            message: "Invalid role query parameter",
          });
          return;
        }
        where.role = roleParam as Role;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          requiresPasswordChange: true,
          createdAt: true,
        },
        orderBy: { id: "asc" },
      });

      res.status(200).json({ users });
    } catch (error) {
      res.status(500).json({ error: "SERVER_ERROR", message: "Failed to fetch users" });
    }
  }
);

// POST /api/admin/users - Create User (ADMINISTRATOR ONLY / FR-14)
adminRouter.post(
  "/users",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, email, role, isActive, initialPassword } = req.body || {};

      if (!name || typeof name !== "string" || name.trim() === "") {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Name is required" });
        return;
      }

      if (!email || typeof email !== "string" || !email.includes("@")) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Valid email address is required" });
        return;
      }

      if (!role || !["REQUESTER", "IT_STAFF", "ADMINISTRATOR"].includes(role)) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid role specified" });
        return;
      }

      if (!initialPassword || typeof initialPassword !== "string" || initialPassword.length < 8) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Initial password must be at least 8 characters" });
        return;
      }

      const prisma = getPrisma();

      // Check duplicate email
      const existing = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (existing) {
        res.status(409).json({
          error: "DUPLICATE_EMAIL",
          message: "A user with this email address already exists",
        });
        return;
      }

      const passwordHash = bcrypt.hashSync(initialPassword, 10);
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role as Role,
          isActive: typeof isActive === "boolean" ? isActive : true,
          passwordHash,
          requiresPasswordChange: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          requiresPasswordChange: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        message: "User created successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({ error: "SERVER_ERROR", message: "Failed to create user" });
    }
  }
);

// PUT /api/admin/users/:id - Edit User Details & Safety Guards (ADMINISTRATOR ONLY / FR-14)
adminRouter.put(
  "/users/:id",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid user ID" });
        return;
      }

      const { name, email, role, isActive } = req.body || {};

      if (!name || typeof name !== "string" || name.trim() === "") {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Name is required" });
        return;
      }

      if (!email || typeof email !== "string" || !email.includes("@")) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Valid email address is required" });
        return;
      }

      if (!role || !["REQUESTER", "IT_STAFF", "ADMINISTRATOR"].includes(role)) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid role specified" });
        return;
      }

      if (typeof isActive !== "boolean") {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "isActive must be a boolean" });
        return;
      }

      const prisma = getPrisma();

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
        return;
      }

      // Check self-deactivation guard
      if (req.user!.id === targetUserId && isActive === false) {
        res.status(400).json({
          error: "INVALID_ADMIN_ACTION",
          message: "Administrators cannot deactivate their own account or deactivate the last active Administrator",
        });
        return;
      }

      // Check duplicate email
      if (email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
        });
        if (existingEmail && existingEmail.id !== targetUserId) {
          res.status(409).json({
            error: "DUPLICATE_EMAIL",
            message: "A user with this email address already exists",
          });
          return;
        }
      }

      // Check Last Active Administrator protection
      if (targetUser.role === "ADMINISTRATOR" && targetUser.isActive && (role !== "ADMINISTRATOR" || isActive === false)) {
        const activeAdminCount = await prisma.user.count({
          where: {
            role: "ADMINISTRATOR",
            isActive: true,
          },
        });

        if (activeAdminCount <= 1) {
          res.status(400).json({
            error: "INVALID_ADMIN_ACTION",
            message: "Administrators cannot deactivate their own account or deactivate the last active Administrator",
          });
          return;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role as Role,
          isActive,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          requiresPasswordChange: true,
          createdAt: true,
        },
      });

      res.status(200).json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({ error: "SERVER_ERROR", message: "Failed to update user" });
    }
  }
);

// POST /api/admin/users/:id/password - Reset Initial Password (ADMINISTRATOR ONLY / FR-14)
adminRouter.post(
  "/users/:id/password",
  authenticateToken,
  requireRole("ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid user ID" });
        return;
      }

      const { initialPassword } = req.body || {};

      if (!initialPassword || typeof initialPassword !== "string" || initialPassword.length < 8) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Initial password must be at least 8 characters" });
        return;
      }

      const prisma = getPrisma();
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
        return;
      }

      const passwordHash = bcrypt.hashSync(initialPassword, 10);
      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          passwordHash,
          requiresPasswordChange: true,
        },
        select: {
          id: true,
          requiresPasswordChange: true,
        },
      });

      res.status(200).json({
        message: "New initial password set successfully. User will be required to change password at next login.",
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({ error: "SERVER_ERROR", message: "Failed to reset initial password" });
    }
  }
);
