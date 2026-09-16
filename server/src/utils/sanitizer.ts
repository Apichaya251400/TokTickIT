/**
 * Sanitizes input string by escaping HTML special characters into safe HTML entities (BR-11).
 * Prevents Cross-Site Scripting (XSS) attacks in Public Comments and Internal Notes.
 */
export function sanitizeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
