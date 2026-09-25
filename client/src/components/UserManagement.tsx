import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AdminUser,
  fetchAdminUsers,
  fetchActiveAdminCount,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

export const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authoritative global active admin count (independent of table filters)
  const [systemActiveAdminCount, setSystemActiveAdminCount] = useState<number>(1);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createEmail, setCreateEmail] = useState<string>("");
  const [createRole, setCreateRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">("REQUESTER");
  const [createIsActive, setCreateIsActive] = useState<boolean>(true);
  const [createInitialPassword, setCreateInitialPassword] = useState<string>("");
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editRole, setEditRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">("REQUESTER");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Reset Initial Password State (inside Edit modal)
  const [resetPassword, setResetPassword] = useState<string>("");
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Load users from API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers({
        search: search.trim() || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
      });
      setUsers(data);

      // Derive authoritative active admin count (independent of table filter)
      if (typeof (data as any)?.activeAdminCount === "number") {
        setSystemActiveAdminCount((data as any).activeAdminCount);
      } else if (!search.trim() && roleFilter === "ALL") {
        const fullCount = data.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length;
        setSystemActiveAdminCount(fullCount);
      } else {
        // When filtered and header was absent (e.g. mocked in unit test), fetch global active admin count
        fetchActiveAdminCount()
          .then((count) => setSystemActiveAdminCount(count))
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load user list.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Safety checks for editing user
  const isEditingSelf = useMemo(() => {
    return !!(editingUser && currentUser && editingUser.id === currentUser.id);
  }, [editingUser, currentUser]);

  const isLastActiveAdmin = useMemo(() => {
    return !!(
      editingUser &&
      editingUser.role === "ADMINISTRATOR" &&
      editingUser.isActive &&
      systemActiveAdminCount <= 1
    );
  }, [editingUser, systemActiveAdminCount]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setCreateName("");
    setCreateEmail("");
    setCreateRole("REQUESTER");
    setCreateIsActive(true);
    setCreateInitialPassword("");
    setShowCreatePassword(false);
    setCreateError(null);
    setCreateSuccess(null);
    setShowCreateModal(true);
  };

  // Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!createName.trim()) {
      setCreateError("Full name is required.");
      return;
    }
    if (!createEmail.trim()) {
      setCreateError("Email address is required.");
      return;
    }
    if (!createInitialPassword) {
      setCreateError("Initial password is required.");
      return;
    }

    setCreateLoading(true);
    try {
      await createAdminUser({
        name: createName.trim(),
        email: createEmail.trim().toLowerCase(),
        role: createRole,
        isActive: createIsActive,
        initialPassword: createInitialPassword,
      });

      setCreateSuccess("User created successfully! Must change password flag is active.");
      await loadUsers();
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 1000);
    } catch (err: any) {
      if (err?.code === "DUPLICATE_EMAIL" || err?.status === 409 || err?.message?.includes("already exists")) {
        setCreateError("A user with this email address already exists. Please use a unique email.");
      } else {
        setCreateError(err?.message || "Failed to create user.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditError(null);
    setEditSuccess(null);

    // Reset password sub-form state
    setResetPassword("");
    setShowResetPassword(false);
    setResetError(null);
    setResetSuccess(null);
  };

  // Submit Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError(null);
    setEditSuccess(null);

    if (!editName.trim()) {
      setEditError("Full name is required.");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("Email address is required.");
      return;
    }

    // Client-side safety enforcement
    if (isEditingSelf && !editIsActive) {
      setEditError("Administrators cannot deactivate their own account.");
      return;
    }

    if (isLastActiveAdmin && (!editIsActive || editRole !== "ADMINISTRATOR")) {
      setEditError("Cannot deactivate or demote the last active Administrator in the system.");
      return;
    }

    setEditLoading(true);
    try {
      const updated = await updateAdminUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        isActive: editIsActive,
      });

      setEditingUser(updated);
      setEditSuccess("User details updated successfully!");
      await loadUsers();
    } catch (err: any) {
      if (err?.code === "DUPLICATE_EMAIL" || err?.status === 409 || err?.message?.includes("already exists")) {
        setEditError("A user with this email address already exists. Please use a unique email.");
      } else if (err?.code === "ADMIN_SAFETY_VIOLATION") {
        setEditError(err.message);
      } else {
        setEditError(err?.message || "Failed to update user.");
      }
    } finally {
      setEditLoading(false);
    }
  };

  // Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setResetError(null);
    setResetSuccess(null);

    if (!resetPassword) {
      setResetError("New initial password is required.");
      return;
    }

    setResetLoading(true);
    try {
      await resetAdminUserPassword(editingUser.id, resetPassword);
      setResetSuccess("New initial password set! The user must change their password upon their next login.");
      setResetPassword("");
      await loadUsers();
    } catch (err: any) {
      setResetError(err?.message || "Failed to reset initial password.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="container py-4" data-testid="user-management-page">
      {/* Header & Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-primary-green)" }}>
            User Management
          </h1>
          <p className="text-muted mb-0">
            Manage system users, role permissions, account statuses, and credentials.
          </p>
        </div>
        <div>
          <button
            className="btn btn-zen-primary d-inline-flex align-items-center"
            onClick={handleOpenCreateModal}
            data-testid="btn-create-user"
          >
            <svg
              className="me-2"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <svg className="me-2 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div className="flex-grow-1">{error}</div>
          <button type="button" className="btn btn-sm btn-outline-danger ms-3" onClick={loadUsers}>
            Retry
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="zen-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-6 col-lg-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="search-users-input"
                aria-label="Search users by name or email"
              />
              {search && (
                <button
                  className="btn btn-outline-secondary border-start-0 border-end"
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4 col-lg-3">
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              data-testid="role-filter-select"
              aria-label="Filter by role"
            >
              <option value="ALL">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>

          <div className="col-12 col-sm-6 col-md-2 col-lg-4 text-sm-end">
            <div className="d-flex flex-wrap align-items-center justify-content-sm-end gap-2">
              <span className="badge bg-light text-dark border small py-1 px-2" data-testid="active-admins-count-badge">
                Active Admins: <strong className="text-success">{systemActiveAdminCount}</strong>
              </span>
              <span className="text-muted small">
                Showing <strong>{users.length}</strong> {users.length === 1 ? "user" : "users"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="zen-card overflow-hidden">
        {loading ? (
          <div className="p-5 text-center text-muted" data-testid="users-loading">
            <div className="spinner-border text-success mb-2" role="status">
              <span className="visually-hidden">Loading users...</span>
            </div>
            <div>Loading users...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-5 text-center text-muted" data-testid="users-empty">
            <svg
              className="mb-3 opacity-50"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h5>No users found</h5>
            <p className="small mb-0">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table View (>=768px) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0" data-testid="users-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "24%", minWidth: "120px" }}>Name</th>
                    <th style={{ width: "27%", minWidth: "140px" }}>Email</th>
                    <th style={{ width: "16%", minWidth: "90px" }}>Role</th>
                    <th style={{ width: "20%", minWidth: "110px" }}>Status</th>
                    <th className="d-none d-lg-table-cell" style={{ width: "13%", minWidth: "90px" }}>Joined</th>
                    <th className="text-end" style={{ width: "13%", minWidth: "65px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isCurrent = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} data-testid={`user-row-${u.id}`}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center fw-bold me-2 flex-shrink-0"
                              style={{
                                width: "32px",
                                height: "32px",
                                backgroundColor: u.role === "ADMINISTRATOR" ? "#F3E5F5" : u.role === "IT_STAFF" ? "#EAF6EF" : "#E8F4F8",
                                color: u.role === "ADMINISTRATOR" ? "#6A1B9A" : u.role === "IT_STAFF" ? "#006B3C" : "#0288D1",
                                fontSize: "0.8rem",
                              }}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="fw-semibold text-dark text-truncate d-inline-block" style={{ maxWidth: "125px" }} title={u.name}>
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="badge bg-secondary ms-2 small" style={{ fontSize: "0.65rem" }}>
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-muted font-monospace small text-truncate d-inline-block" style={{ maxWidth: "160px" }} title={u.email}>
                            {u.email}
                          </span>
                        </td>
                        <td>
                          {u.role === "ADMINISTRATOR" && (
                            <span className="badge-role badge-role-admin" data-testid="role-badge">
                              Administrator
                            </span>
                          )}
                          {u.role === "IT_STAFF" && (
                            <span className="badge-role badge-role-it-staff" data-testid="role-badge">
                              IT Staff
                            </span>
                          )}
                          {u.role === "REQUESTER" && (
                            <span className="badge-role badge-role-requester" data-testid="role-badge">
                              Requester
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1 align-items-center">
                            {u.isActive ? (
                              <span className="badge badge-status-active" data-testid="status-badge-active">
                                Active
                              </span>
                            ) : (
                              <span className="badge badge-status-inactive" data-testid="status-badge-inactive">
                                Inactive
                              </span>
                            )}

                            {u.mustChangePassword && (
                              <span
                                className="badge bg-warning text-dark"
                                style={{ fontSize: "0.68rem" }}
                                title="Password change required on next login"
                                data-testid="badge-must-change-password"
                              >
                                Password Reset
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="d-none d-lg-table-cell">
                          <span className="text-muted small">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-zen-secondary py-1 px-2"
                            onClick={() => handleOpenEditModal(u)}
                            data-testid={`btn-edit-user-${u.id}`}
                            aria-label={`Edit ${u.name}`}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (<768px) */}
            <div className="mobile-card-container d-md-none p-3" data-testid="mobile-card-list">
              {users.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    className="card zen-card mobile-user-card p-3 mb-3 shadow-sm"
                    data-testid={`mobile-user-card-${u.id}`}
                  >
                    {/* Card Header: Avatar, Name & Current User Indicator */}
                    <div className="d-flex align-items-center mb-2">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold me-2 flex-shrink-0"
                        style={{
                          width: "36px",
                          height: "36px",
                          backgroundColor:
                            u.role === "ADMINISTRATOR"
                              ? "#F3E5F5"
                              : u.role === "IT_STAFF"
                              ? "#EAF6EF"
                              : "#E8F4F8",
                          color:
                            u.role === "ADMINISTRATOR"
                              ? "#6A1B9A"
                              : u.role === "IT_STAFF"
                              ? "#006B3C"
                              : "#0288D1",
                          fontSize: "0.85rem",
                        }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-grow-1">
                        <div className="d-flex align-items-center">
                          <span className="fw-bold text-dark text-truncate">{u.name}</span>
                          {isCurrent && (
                            <span className="badge bg-secondary ms-2" style={{ fontSize: "0.65rem" }}>
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-muted font-monospace small text-break">{u.email}</div>
                      </div>
                    </div>

                    {/* Badges: Role, Status, Must Change Password */}
                    <div className="d-flex flex-wrap align-items-center gap-2 my-2 pt-2 border-top">
                      {u.role === "ADMINISTRATOR" && (
                        <span className="badge-role badge-role-admin">Administrator</span>
                      )}
                      {u.role === "IT_STAFF" && (
                        <span className="badge-role badge-role-it-staff">IT Staff</span>
                      )}
                      {u.role === "REQUESTER" && (
                        <span className="badge-role badge-role-requester">Requester</span>
                      )}

                      {u.isActive ? (
                        <span className="badge badge-status-active">Active</span>
                      ) : (
                        <span className="badge badge-status-inactive">Inactive</span>
                      )}

                      {u.mustChangePassword && (
                        <span
                          className="badge bg-warning text-dark"
                          style={{ fontSize: "0.68rem" }}
                          title="Password change required on next login"
                        >
                          Password Reset
                        </span>
                      )}
                    </div>

                    {/* Joined Date */}
                    <div className="d-flex justify-content-between align-items-center text-muted extra-small pt-1">
                      <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Edit Button with Touch Target >= 44px */}
                    <button
                      type="button"
                      className="btn btn-zen-primary w-100 btn-touch-target mt-3 d-flex align-items-center justify-content-center"
                      onClick={() => handleOpenEditModal(u)}
                      data-testid={`mobile-btn-edit-user-${u.id}`}
                      aria-label={`Edit ${u.name}`}
                    >
                      Edit User
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-modal-title"
          data-testid="create-user-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content zen-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold" id="create-user-modal-title">
                  Create New User
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close"
                  disabled={createLoading}
                ></button>
              </div>

              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  {createError && (
                    <div className="alert alert-danger py-2 small mb-3" role="alert" data-testid="create-error">
                      {createError}
                    </div>
                  )}
                  {createSuccess && (
                    <div className="alert alert-success py-2 small mb-3" role="alert" data-testid="create-success">
                      {createSuccess}
                    </div>
                  )}

                  {/* Full Name */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold" htmlFor="create-name">
                      Full Name <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="create-name"
                      placeholder="e.g. Jane Doe"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      data-testid="create-name-input"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold" htmlFor="create-email">
                      Email Address <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="create-email"
                      placeholder="e.g. jane.doe@toktickit.com"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      data-testid="create-email-input"
                      required
                    />
                  </div>

                  {/* Role */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold" htmlFor="create-role">
                      Role <span className="required-asterisk">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="create-role"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as any)}
                      data-testid="create-role-select"
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  {/* Initial Password */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold" htmlFor="create-initial-password">
                      Initial Password <span className="required-asterisk">*</span>
                    </label>
                    <div className="input-group password-input-group">
                      <input
                        type={showCreatePassword ? "text" : "password"}
                        className="form-control"
                        id="create-initial-password"
                        placeholder="Min. 8 chars, mixed case, number & special char"
                        value={createInitialPassword}
                        onChange={(e) => setCreateInitialPassword(e.target.value)}
                        data-testid="create-password-input"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        aria-label={showCreatePassword ? "Hide password" : "Show password"}
                      >
                        {showCreatePassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="form-text small text-muted mt-1">
                      Must be at least 8 characters with uppercase, lowercase, number, and special character.
                      User will be required to change this upon first login.
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="create-active-switch"
                      checked={createIsActive}
                      onChange={(e) => setCreateIsActive(e.target.checked)}
                      data-testid="create-active-checkbox"
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="create-active-switch">
                      Account Active
                    </label>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen-primary"
                    disabled={createLoading}
                    data-testid="btn-submit-create-user"
                  >
                    {createLoading ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-modal-title"
          data-testid="edit-user-modal"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content zen-card border-0 shadow">
              <div className="modal-header border-bottom">
                <div>
                  <h5 className="modal-title fw-bold" id="edit-user-modal-title">
                    Edit User: {editingUser.name}
                  </h5>
                  <span className="text-muted small">User ID #{editingUser.id}</span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingUser(null)}
                  aria-label="Close"
                  disabled={editLoading || resetLoading}
                ></button>
              </div>

              <div className="modal-body">
                {/* Admin Safety Alerts */}
                {isEditingSelf && (
                  <div
                    className="alert alert-info py-2 small d-flex align-items-center mb-3"
                    role="alert"
                    data-testid="self-deactivation-warning"
                  >
                    <svg className="me-2 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>
                      <strong>Safety Rule (BR-21):</strong> You cannot deactivate your own Administrator account.
                    </span>
                  </div>
                )}

                {isLastActiveAdmin && (
                  <div
                    className="alert alert-warning py-2 small d-flex align-items-center mb-3"
                    role="alert"
                    data-testid="last-admin-warning"
                  >
                    <svg className="me-2 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>
                      <strong>Safety Rule (BR-22):</strong> This is the sole active Administrator in the system. The account cannot be deactivated or demoted.
                    </span>
                  </div>
                )}

                {/* Edit Form */}
                <form onSubmit={handleUpdateUser} className="mb-4">
                  <h6 className="fw-bold mb-3 border-bottom pb-2">Profile & Role Details</h6>

                  {editError && (
                    <div className="alert alert-danger py-2 small mb-3" role="alert" data-testid="edit-error">
                      {editError}
                    </div>
                  )}
                  {editSuccess && (
                    <div className="alert alert-success py-2 small mb-3" role="alert" data-testid="edit-success">
                      {editSuccess}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold" htmlFor="edit-name">
                        Full Name <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        data-testid="edit-name-input"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold" htmlFor="edit-email">
                        Email Address <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        id="edit-email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        data-testid="edit-email-input"
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold" htmlFor="edit-role">
                        Role <span className="required-asterisk">*</span>
                      </label>
                      <select
                        className="form-select"
                        id="edit-role"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        disabled={isLastActiveAdmin}
                        data-testid="edit-role-select"
                      >
                        <option value="REQUESTER">Requester</option>
                        <option value="IT_STAFF">IT Staff</option>
                        <option value="ADMINISTRATOR">Administrator</option>
                      </select>
                      {isLastActiveAdmin && (
                        <div className="form-text small text-muted">
                          Cannot demote the last active Administrator.
                        </div>
                      )}
                    </div>

                    <div className="col-12 col-md-6 d-flex align-items-center">
                      <div className="form-check form-switch pt-md-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="edit-active-switch"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          disabled={isEditingSelf || isLastActiveAdmin}
                          data-testid="edit-active-checkbox"
                        />
                        <label className="form-check-label small fw-semibold ms-1" htmlFor="edit-active-switch">
                          Account Active
                        </label>
                        {(isEditingSelf || isLastActiveAdmin) && (
                          <div className="form-text small text-muted">
                            Deactivation is disabled by admin safety rules.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-end">
                    <button
                      type="submit"
                      className="btn btn-zen-primary btn-sm px-3"
                      disabled={editLoading}
                      data-testid="btn-submit-edit-user"
                    >
                      {editLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>

                {/* Password Reset Section (API-24, FR-20, AC-16) */}
                <div className="border rounded p-3 bg-light" data-testid="reset-password-section">
                  <h6 className="fw-bold mb-1">Set New Initial Password</h6>
                  <p className="text-muted small mb-3">
                    Assign a new temporary password. Setting this will require the user to change their password upon their next login.
                  </p>

                  {resetError && (
                    <div className="alert alert-danger py-2 small mb-3" role="alert" data-testid="reset-password-error">
                      {resetError}
                    </div>
                  )}
                  {resetSuccess && (
                    <div className="alert alert-success py-2 small mb-3" role="alert" data-testid="reset-password-success">
                      {resetSuccess}
                    </div>
                  )}

                  <form onSubmit={handleResetPassword}>
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-sm-8">
                        <label className="form-label small fw-semibold" htmlFor="reset-new-password">
                          New Temporary Password <span className="required-asterisk">*</span>
                        </label>
                        <div className="input-group password-input-group">
                          <input
                            type={showResetPassword ? "text" : "password"}
                            className="form-control form-control-sm"
                            id="reset-new-password"
                            placeholder="Min 8 chars, mixed case, number & symbol"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            data-testid="reset-password-input"
                          />
                          <button
                            type="button"
                            className="password-toggle-btn py-0 px-2 small"
                            onClick={() => setShowResetPassword(!showResetPassword)}
                            aria-label={showResetPassword ? "Hide password" : "Show password"}
                          >
                            {showResetPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>

                      <div className="col-12 col-sm-4 text-sm-end">
                        <button
                          type="submit"
                          className="btn btn-warning btn-sm w-100 fw-semibold"
                          disabled={resetLoading || !resetPassword}
                          data-testid="btn-reset-password"
                        >
                          {resetLoading ? "Updating..." : "Update Password"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={editLoading || resetLoading}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
