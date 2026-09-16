import { beforeEach, describe, expect, it } from "vitest";
import { clearRevocationBlocklist, isTokenRevoked, revokeToken, signToken, verifyToken } from "../../src/utils/jwt.js";

describe("JWT Utility & Revocation Blocklist Unit Tests", () => {
  beforeEach(() => {
    clearRevocationBlocklist();
  });

  it("signToken & verifyToken: signs and verifies valid JWT payload", () => {
    const payload = {
      userId: 1,
      email: "user@example.com",
      role: "REQUESTER" as const,
      requiresPasswordChange: false,
    };

    const token = signToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded?.userId).toBe(1);
    expect(decoded?.email).toBe("user@example.com");
    expect(decoded?.role).toBe("REQUESTER");
  });

  it("revokeToken: invalidates revoked tokens (AC-13 / FR-03)", () => {
    const payload = {
      userId: 2,
      email: "staff@toktick.it",
      role: "IT_STAFF" as const,
      requiresPasswordChange: false,
    };

    const token = signToken(payload);
    expect(verifyToken(token)).not.toBeNull();

    revokeToken(token);
    expect(isTokenRevoked(token)).toBe(true);
    expect(verifyToken(token)).toBeNull();
  });
});
