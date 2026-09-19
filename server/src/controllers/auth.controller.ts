import { Response } from "express";
import { getPrisma } from "../prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { revokeToken, signToken } from "../utils/jwt.js";
import { comparePassword, hashPassword, validatePasswordComplexity } from "../utils/password.js";

const isProduction = process.env.NODE_ENV === "production";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

/**
 * POST /api/auth/login
 * Public endpoint to authenticate user credentials.
 */
export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid email address or password",
      });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    // BR-01 & BR-12: Reject invalid credentials or inactive accounts with generic safe 401 error
    if (!user || !user.isActive || !comparePassword(password, user.passwordHash)) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid email address or password",
      });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      requiresPasswordChange: user.requiresPasswordChange,
    });

    res.cookie("token", token, COOKIE_OPTIONS);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        requiresPasswordChange: user.requiresPasswordChange,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "An internal server error occurred during login",
    });
  }
}

/**
 * POST /api/auth/logout
 * Authenticated endpoint to invalidate the current session token (AC-13 / FR-03).
 */
export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (req.token) {
      revokeToken(req.token);
    }
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict" as const,
    });
    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "An internal server error occurred during logout",
    });
  }
}

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile and role.
 */
export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    res.status(200).json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        requiresPasswordChange: req.user.requiresPasswordChange,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "An internal server error occurred while retrieving user profile",
    });
  }
}

/**
 * POST /api/auth/change-password
 * Mandatory or optional password change for authenticated users.
 */
export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Current password, new password, and confirm password are required",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "New password and confirm password do not match",
      });
      return;
    }

    if (!validatePasswordComplexity(newPassword)) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "New password must be at least 8 characters and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
      });
      return;
    }

    if (!comparePassword(currentPassword, req.user.passwordHash)) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Current password is incorrect",
      });
      return;
    }

    const newPasswordHash = hashPassword(newPassword);

    const prisma = getPrisma();
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash: newPasswordHash,
        requiresPasswordChange: false,
      },
    });

    // Sign a fresh token reflecting updated requiresPasswordChange status
    const newToken = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      requiresPasswordChange: false,
    });
    res.cookie("token", newToken, COOKIE_OPTIONS);

    res.status(200).json({
      message: "Password changed successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        requiresPasswordChange: false,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "An internal server error occurred while changing password",
    });
  }
}
