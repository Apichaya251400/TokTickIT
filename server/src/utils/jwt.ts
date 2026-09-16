import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "toktickit-secret-key-sprint-3";

export interface TokenPayload {
  userId: number;
  email: string;
  role: Role;
  requiresPasswordChange: boolean;
}

// In-memory revocation blocklist for revoked JWT tokens upon logout (AC-13)
const revokedTokens = new Set<string>();

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (isTokenRevoked(token)) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function revokeToken(token: string): void {
  if (token) {
    revokedTokens.add(token);
  }
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

export function clearRevocationBlocklist(): void {
  revokedTokens.clear();
}
