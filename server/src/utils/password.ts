import bcrypt from "bcryptjs";

export function hashPassword(plaintext: string): string {
  return bcrypt.hashSync(plaintext, 10);
}

export function comparePassword(plaintext: string, hash: string): boolean {
  if (!plaintext || !hash) return false;
  return bcrypt.compareSync(plaintext, hash);
}

/**
 * Validates password complexity per BR-02:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordComplexity(password: string): boolean {
  if (!password || password.length < 8) return false;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUpper && hasLower && hasNumber && hasSpecial;
}
