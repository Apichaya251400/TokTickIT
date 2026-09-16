import React, { useState } from "react";
import { loginApi, User } from "../api.js";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Email address is required.");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
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
      const res = await loginApi(email.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      const msg = err?.data?.message || "Invalid email address or password.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
      <div className="card shadow-sm border-0" style={{ maxWidth: 440, width: "100%" }}>
        <div className="card-body p-4 p-sm-5">
          <div className="text-center mb-4">
            <h1 className="h3 fw-bold text-success">
              TokTick<span className="text-dark">IT</span>
            </h1>
            <p className="text-muted small">Sign in to access your IT Service Desk account</p>
          </div>

          {errorMessage && (
            <div className="alert alert-danger mb-4" role="alert" aria-live="assertive">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label fw-semibold">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className={`form-control ${emailError ? "is-invalid" : ""}`}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                disabled={isSubmitting}
                required
              />
              {emailError && <div className="invalid-feedback">{emailError}</div>}
            </div>

            <div className="mb-4">
              <label htmlFor="login-password" className="form-label fw-semibold">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className={`form-control ${passwordError ? "is-invalid" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                disabled={isSubmitting}
                required
              />
              {passwordError && <div className="invalid-feedback">{passwordError}</div>}
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
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
