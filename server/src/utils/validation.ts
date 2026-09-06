/**
 * Trims summary and validates length constraints (10-120 characters).
 * Returns trimmed string if valid, or null if invalid / whitespace-only.
 */
export function validateSummary(summary: unknown): string | null {
  if (typeof summary !== "string") {
    return null;
  }
  const trimmed = summary.trim();
  if (trimmed.length < 10 || trimmed.length > 120) {
    return null;
  }
  return trimmed;
}

/**
 * Trims description and validates length constraints (20-2,000 characters).
 * Returns trimmed string if valid, or null if invalid / whitespace-only.
 */
export function validateDescription(description: unknown): string | null {
  if (typeof description !== "string") {
    return null;
  }
  const trimmed = description.trim();
  if (trimmed.length < 20 || trimmed.length > 2000) {
    return null;
  }
  return trimmed;
}

/**
 * Validates attachment file size limit (max 5,000,000 bytes inclusive).
 * Returns true if valid, false if non-number, <= 0, or > 5,000,000 bytes.
 */
export function validateFileSize(fileSize: unknown): boolean {
  if (typeof fileSize !== "number" || Number.isNaN(fileSize)) {
    return false;
  }
  return fileSize > 0 && fileSize <= 5_000_000;
}

/**
 * Sanitizes filename to prevent path traversal sequences (e.g. ../secret.txt -> secret.txt).
 * Uses path.basename to strip directory components.
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== "string") {
    return "unnamed_file";
  }
  // Normalize Windows backslashes to forward slashes before extracting basename
  const normalized = fileName.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const base = parts[parts.length - 1];
  return base || "unnamed_file";
}
