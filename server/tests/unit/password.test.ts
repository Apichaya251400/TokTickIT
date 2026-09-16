import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword, validatePasswordComplexity } from "../../src/utils/password.js";

describe("Password Utility Unit Tests", () => {
  it("hashPassword & comparePassword: generates valid bcrypt hash and matches correctly", () => {
    const password = "InitialPassword123!";
    const hash = hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(10);
    expect(comparePassword(password, hash)).toBe(true);
    expect(comparePassword("WrongPassword123!", hash)).toBe(false);
  });

  it("validatePasswordComplexity: validates passwords against complexity rules", () => {
    // Valid passwords (min 8 chars, 1 upper, 1 lower, 1 number, 1 special)
    expect(validatePasswordComplexity("InitialPassword123!")).toBe(true);
    expect(validatePasswordComplexity("Pass1234!")).toBe(true);
    expect(validatePasswordComplexity("Complex#99Sec")).toBe(true);

    // Invalid passwords
    expect(validatePasswordComplexity("short1!")).toBe(false); // < 8 chars
    expect(validatePasswordComplexity("noupper123!")).toBe(false); // no uppercase
    expect(validatePasswordComplexity("NOLOWER123!")).toBe(false); // no lowercase
    expect(validatePasswordComplexity("NoNumberHere!")).toBe(false); // no number
    expect(validatePasswordComplexity("NoSpecialChar123")).toBe(false); // no special char
    expect(validatePasswordComplexity("")).toBe(false);
  });
});
