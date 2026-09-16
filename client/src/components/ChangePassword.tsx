import React, { useState } from "react";
import { changePasswordApi, User } from "../api";

interface ChangePasswordProps {
  user: User;
  onPasswordChangeSuccess: (updatedUser: User) => void;
}

export default function ChangePassword({ user, onPasswordChangeSuccess }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    let isValid = true;
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);

    if (!currentPassword) {
      setCurrentPasswordError("Current password is required.");
      isValid = false;
    }

    if (!newPassword) {
      setNewPasswordError("New password is required.");
      isValid = false;
    } else {
      const minLength = newPassword.length >= 8;
      const hasUpper = /[A-Z]/.test(newPassword);
      const hasLower = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

      if (!minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        setNewPasswordError(
          "New password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character."
        );
        isValid = false;
      }
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your new password.");
      isValid = false;
    } else if (newPassword && confirmPassword !== newPassword) {
      setConfirmPasswordError("New password and confirm password do not match.");
      isValid = false;
    }

    return isValid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await changePasswordApi(currentPassword, newPassword, confirmPassword);
      onPasswordChangeSuccess(res.user);
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.data?.error?.message || "Failed to update password. Please verify your current password and try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
      <div className="card shadow-sm border-0" style={{ maxWidth: 480, width: "100%" }}>
        <div className="card-body p-4 p-sm-5">
          <div className="text-center mb-4">
            <h1 className="h4 fw-bold text-success">Mandatory Password Change</h1>
            <p className="text-muted small">
              Hello, <span className="fw-semibold text-dark">{user.name}</span> ({user.email}). Because your account is set with an initial password, you must create a new secure password before accessing TokTickIT features.
            </p>
          </div>

          {errorMessage && (
            <div className="alert alert-danger mb-4" role="alert" aria-live="assertive">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="current-password" className="form-label fw-semibold">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                className={`form-control ${currentPasswordError ? "is-invalid" : ""}`}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (currentPasswordError) setCurrentPasswordError(null);
                }}
                disabled={isSubmitting}
                required
              />
              {currentPasswordError && <div className="invalid-feedback">{currentPasswordError}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="new-password" className="form-label fw-semibold">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                className={`form-control ${newPasswordError ? "is-invalid" : ""}`}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPasswordError) setNewPasswordError(null);
                }}
                disabled={isSubmitting}
                required
              />
              {newPasswordError && <div className="invalid-feedback">{newPasswordError}</div>}
              <div className="form-text text-muted small mt-1">
                Must be at least 8 characters long with uppercase, lowercase, number, and special character (!@#$%^&*).
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="confirm-password" className="form-label fw-semibold">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className={`form-control ${confirmPasswordError ? "is-invalid" : ""}`}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError(null);
                }}
                disabled={isSubmitting}
                required
              />
              {confirmPasswordError && <div className="invalid-feedback">{confirmPasswordError}</div>}
            </div>

            <div className="d-grid">
              <button
                type="submit"
                className="btn btn-success btn-lg fw-semibold d-flex align-items-center justify-content-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Updating Password…
                  </>
                ) : (
                  "Update Password & Continue"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
