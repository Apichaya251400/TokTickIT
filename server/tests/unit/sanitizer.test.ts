import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../../src/utils/sanitizer.js";

describe("Sanitizer Utility (BR-11 XSS Prevention)", () => {
  it("escapes dangerous HTML tags and attributes into safe HTML entities", () => {
    const input = '<script>alert("xss")</script>';
    const expected = "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;";
    expect(sanitizeHtml(input)).toBe(expected);
  });

  it("escapes iframe and event handlers", () => {
    const input = '<iframe src="javascript:alert(1)" onclick="doSomething()"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).toContain("&lt;iframe");
  });

  it("preserves plain text and clean whitespace without corruption", () => {
    const cleanText = "This is a normal comment. Everything is working fine!";
    expect(sanitizeHtml(cleanText)).toBe(cleanText);
  });

  it("handles empty or falsy strings gracefully", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});
