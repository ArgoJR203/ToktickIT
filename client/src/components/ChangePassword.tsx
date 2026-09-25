import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

interface ChangePasswordProps {
  onSuccess?: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess }) => {
  const { changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Password Complexity Rule Checks (BR-07)
  const isLengthValid = newPassword.length >= 8;
  const isCaseValid = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const isNumSpecialValid = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
  const isMatching = confirmPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    currentPassword.trim().length > 0 &&
    isLengthValid &&
    isCaseValid &&
    isNumSpecialValid &&
    isMatching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setErrorMessage(null);
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update password. Please check your credentials.";
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
      <div className="w-100" style={{ maxWidth: "480px" }}>
        {/* Brand & Gating Header */}
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
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 className="h4 fw-bold text-main mb-1" style={{ color: "var(--color-text-main)" }}>
            Change Your Password
          </h1>
          <p className="small mb-0" style={{ color: "var(--color-text-muted)" }}>
            You must change your initial password before continuing.
          </p>
        </div>

        {/* Change Password Card */}
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
            {/* Current Password Field */}
            <div className="mb-3">
              <label htmlFor="current-password" className="form-label small fw-semibold">
                Current (initial) password <span className="required-asterisk">*</span>
              </label>
              <div className="input-group password-input-group">
                <input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  className="form-control touch-target"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="btn password-toggle-btn touch-target"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                  disabled={submitting}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="mb-3">
              <label htmlFor="new-password" className="form-label small fw-semibold">
                New password <span className="required-asterisk">*</span>
              </label>
              <div className="input-group password-input-group">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  className="form-control touch-target"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="btn password-toggle-btn touch-target"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  disabled={submitting}
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div className="mb-3">
              <label htmlFor="confirm-password" className="form-label small fw-semibold">
                Confirm new password <span className="required-asterisk">*</span>
              </label>
              <div className="input-group password-input-group">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control touch-target"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="btn password-toggle-btn touch-target"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  disabled={submitting}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Live Password Complexity Checklist */}
            <div className="checklist-card mb-4" aria-label="Password requirements">
              <div className="small fw-semibold text-muted mb-2">Password Requirements:</div>

              {/* Requirement 1: Length */}
              <div
                className={`checklist-item ${isLengthValid ? "valid" : ""}`}
                data-testid="rule-length"
              >
                {isLengthValid ? (
                  <svg className="checklist-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg className="checklist-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"></circle>
                  </svg>
                )}
                <span>At least 8 characters</span>
              </div>

              {/* Requirement 2: Case */}
              <div
                className={`checklist-item ${isCaseValid ? "valid" : ""}`}
                data-testid="rule-case"
              >
                {isCaseValid ? (
                  <svg className="checklist-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg className="checklist-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"></circle>
                  </svg>
                )}
                <span>Includes uppercase and lowercase letters</span>
              </div>

              {/* Requirement 3: Number or Special */}
              <div
                className={`checklist-item ${isNumSpecialValid ? "valid" : ""}`}
                data-testid="rule-special"
              >
                {isNumSpecialValid ? (
                  <svg className="checklist-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg className="checklist-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"></circle>
                  </svg>
                )}
                <span>Includes a number or special character</span>
              </div>

              {/* Requirement 4: Passwords match */}
              <div
                className={`checklist-item ${isMatching ? "valid" : ""}`}
                data-testid="rule-match"
              >
                {isMatching ? (
                  <svg className="checklist-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg className="checklist-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"></circle>
                  </svg>
                )}
                <span>Passwords match</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-zen-primary w-100 touch-target fw-semibold d-flex align-items-center justify-content-center"
              disabled={!isFormValid || submitting}
            >
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Updating password...</span>
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Abort / Logout button */}
          <div className="text-center mt-3 pt-3 border-top">
            <button
              type="button"
              className="btn btn-link btn-sm text-muted text-decoration-none"
              onClick={logout}
              disabled={submitting}
            >
              Cancel and sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
