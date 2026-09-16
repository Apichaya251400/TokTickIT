import { NextFunction, Request, Response } from "express";
import { Role, User } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { isTokenRevoked, verifyToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

/**
 * Authentication Middleware:
 * - Reads JWT from cookie (`req.cookies.token`) or Authorization header (`Bearer <token>`)
 * - Checks server-side token revocation blocklist (AC-13 / FR-03)
 * - Performs real-time DB identity verification (BR-13) to check account existence & `isActive = true`
 * - Enforces mandatory password change restriction (BR-02): If `requiresPasswordChange = true`,
 *   blocks access to all protected endpoints except `/api/auth/change-password`, `/api/auth/me`, and `/api/auth/logout`
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    if (isTokenRevoked(token)) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Token has been revoked",
      });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
      return;
    }

    // Real-time DB lookup (BR-13)
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Account is inactive or does not exist",
      });
      return;
    }

    req.user = user;
    req.token = token;

    // Enforce mandatory password change (BR-02)
    if (user.requiresPasswordChange) {
      const allowedPaths = [
        "/api/auth/change-password",
        "/api/auth/me",
        "/api/auth/logout",
      ];
      const isAllowed = allowedPaths.some((path) => req.originalUrl.startsWith(path));

      if (!isAllowed) {
        res.status(403).json({
          error: "MUST_CHANGE_PASSWORD",
          message: "Mandatory password change required before accessing system features",
        });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal authentication error",
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Enforces that `req.user.role` matches one of the required roles.
 */
export function requireRole(...permittedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    if (!permittedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied",
      });
      return;
    }

    next();
  };
}
