import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

interface LoginProps {
  onSuccess?: () => void;
  onSwitchToDevSelector?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onSwitchToDevSelector }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please try again.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center p-3"
      style={{ backgroundColor: "var(--color-bg-quiet)" }}
    >
      <div className="w-100" style={{ maxWidth: "440px" }}>
        {/* Brand & Title */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm"
            style={{
              width: "56px",
              height: "56px",
              backgroundColor: "var(--color-primary-green)",
              color: "#ffffff",
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <h1 className="h3 fw-bold text-main mb-1" style={{ color: "var(--color-text-main)" }}>
            TokTickIT
          </h1>
          <h2 className="h5 fw-semibold mb-1" style={{ color: "var(--color-text-main)" }}>
            Sign in to your account
          </h2>
          <p className="small mb-0" style={{ color: "var(--color-text-muted)" }}>
            Enter your credentials to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="card zen-card p-4 shadow-sm border-0">
          {/* Error Banner */}
          {errorMessage && (
            <div
              className="alert zen-alert-danger mb-3 d-flex align-items-center"
              role="alert"
              aria-live="polite"
            >
              <svg
                className="me-2 flex-shrink-0"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span className="small">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="mb-3">
              <label htmlFor="email" className="form-label small fw-semibold">
                Email address <span className="required-asterisk">*</span>
              </label>
              <input
                id="email"
                type="email"
                className="form-control touch-target"
                placeholder="name@toktickit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
              />
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <label htmlFor="password" className="form-label small fw-semibold">
                Password <span className="required-asterisk">*</span>
              </label>
              <div className="input-group password-input-group">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control touch-target"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="btn password-toggle-btn touch-target"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={submitting}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    /* Eye Off Icon */
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    /* Eye Icon */
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-zen-primary w-100 touch-target fw-semibold d-flex align-items-center justify-content-center"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Optional Dev Requester Switcher */}
          {onSwitchToDevSelector && (
            <div className="text-center mt-3 pt-3 border-top">
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none text-muted"
                onClick={onSwitchToDevSelector}
              >
                Use Development Requester (Lab 2)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
