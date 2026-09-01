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
