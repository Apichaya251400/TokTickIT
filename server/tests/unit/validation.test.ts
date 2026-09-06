import { describe, it, expect } from "vitest";
import { validateSummary, validateDescription, validateFileSize, sanitizeFileName } from "../../src/utils/validation.js";

describe("UNIT-02: Summary & Description String Trimming and Validation Helper", () => {
  describe("validateSummary", () => {
    it("trims whitespace and approves valid 10-120 length strings", () => {
      expect(validateSummary("  Valid summary text  ")).toBe("Valid summary text");
      expect(validateSummary("1234567890")).toBe("1234567890");
    });

    it("rejects strings under 10 characters or whitespace-only input", () => {
      expect(validateSummary("Too short")).toBeNull();
      expect(validateSummary("   ")).toBeNull();
      expect(validateSummary("")).toBeNull();
    });

    it("rejects strings over 120 characters", () => {
      const longSummary = "a".repeat(121);
      expect(validateSummary(longSummary)).toBeNull();
    });
  });

  describe("validateDescription", () => {
    it("trims whitespace and approves valid 20-2000 length strings", () => {
      expect(validateDescription("  Valid description text at least 20 chars  ")).toBe(
        "Valid description text at least 20 chars"
      );
      expect(validateDescription("a".repeat(20))).toBe("a".repeat(20));
    });

    it("rejects strings under 20 characters or whitespace-only input", () => {
      expect(validateDescription("Short description")).toBeNull();
      expect(validateDescription("                          ")).toBeNull();
      expect(validateDescription("")).toBeNull();
    });

    it("rejects strings over 2,000 characters", () => {
      const longDescription = "a".repeat(2001);
      expect(validateDescription(longDescription)).toBeNull();
    });
  });
});

describe("UNIT-03: File Size Boundary & Filename Path Traversal Sanitizer Helper", () => {
  describe("validateFileSize", () => {
    it("accepts file sizes up to 5,000,000 bytes inclusive", () => {
      expect(validateFileSize(4999999)).toBe(true);
      expect(validateFileSize(5000000)).toBe(true);
    });

    it("rejects file sizes exceeding 5,000,000 bytes", () => {
      expect(validateFileSize(5000001)).toBe(false);
      expect(validateFileSize(10000000)).toBe(false);
    });
  });

  describe("sanitizeFileName", () => {
    it("sanitizes path traversal sequences and returns safe basename", () => {
      expect(sanitizeFileName("../secret.txt")).toBe("secret.txt");
      expect(sanitizeFileName("..\\secret.txt")).toBe("secret.txt");
      expect(sanitizeFileName("../../../etc/passwd")).toBe("passwd");
      expect(sanitizeFileName("normal-image.png")).toBe("normal-image.png");
    });
  });
});
