import React, { useState, useEffect, useRef } from "react";
import {
  AdminUser,
  AdminUserRole,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetUserInitialPassword,
  User,
} from "../api";

interface UserManagementProps {
  currentUser?: User | null;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  // Check authorization
  const isAdmin = currentUser?.role === "ADMINISTRATOR";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);

  // Form inputs
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: AdminUserRole;
    isActive: boolean;
    initialPassword: string;
  }>({
    name: "",
    email: "",
    role: "REQUESTER",
    isActive: true,
    initialPassword: "",
  });

  const [resetPasswordInput, setResetPasswordInput] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const latestRequestRef = useRef<number>(0);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [searchQuery, roleFilter, isAdmin]);

  async function loadUsers() {
    const requestId = ++latestRequestRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAdminUsers(searchQuery, roleFilter);
      if (requestId === latestRequestRef.current) {
        setUsers(res.users || []);
      }
    } catch (err: any) {
      if (requestId === latestRequestRef.current) {
        const msg =
          err?.data?.error?.message ||
          err?.data?.message ||
          err?.message ||
          "Failed to fetch user list.";
        setError(msg);
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }

  function openCreateModal() {
    setFormData({
      name: "",
      email: "",
      role: "REQUESTER",
      isActive: true,
      initialPassword: "",
    });
    setModalError(null);
    setModalSuccess(null);
    setIsCreateModalOpen(true);
  }

  function openEditModal(user: AdminUser) {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      initialPassword: "",
    });
    setModalError(null);
    setModalSuccess(null);
  }

  function openResetPasswordModal(user: AdminUser) {
    setResettingUser(user);
    setResetPasswordInput("");
    setModalError(null);
    setModalSuccess(null);
  }

  function closeModal() {
    setIsCreateModalOpen(false);
    setEditingUser(null);
    setResettingUser(null);
    setModalError(null);
    setModalSuccess(null);
  }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.initialPassword.trim()) {
      setModalError("All fields including Initial Password are required.");
      return;
    }

    if (!EMAIL_REGEX.test(formData.email.trim())) {
      setModalError("Please enter a valid email address.");
      return;
    }

    if (formData.initialPassword.trim().length < 8) {
      setModalError("Initial password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        isActive: formData.isActive,
        initialPassword: formData.initialPassword.trim(),
      });
      setSuccess(`User ${formData.email} created successfully.`);
      closeModal();
      loadUsers();
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to create user.";
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setModalError(null);
    setModalSuccess(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setModalError("Name and Email are required.");
      return;
    }

    if (!EMAIL_REGEX.test(formData.email.trim())) {
      setModalError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminUser(editingUser.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        isActive: formData.isActive,
      });
      setSuccess(`User ${editingUser.name} updated successfully.`);
      closeModal();
      loadUsers();
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to update user.";
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingUser) return;
    setModalError(null);
    setModalSuccess(null);

    if (!resetPasswordInput.trim() || resetPasswordInput.trim().length < 8) {
      setModalError("New initial password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetUserInitialPassword(resettingUser.id, resetPasswordInput.trim());
      setSuccess(`Initial password reset for ${resettingUser.email}. User must change password on next login.`);
      closeModal();
      loadUsers();
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to reset initial password.";
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="container mt-4" data-testid="admin-forbidden-banner">
        <div className="alert alert-danger" role="alert" data-testid="forbidden-alert">
          <h4 className="alert-heading">403 Forbidden</h4>
          <p>You do not have administrative privileges to access User Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: "#2d5a27" }}>
            User Management
          </h2>
          <p className="text-muted mb-0">
            Manage system users, role assignments, activation status, and initial password resets.
          </p>
        </div>
        <button
          className="btn btn-success"
          onClick={openCreateModal}
          data-testid="create-user-btn"
          style={{ backgroundColor: "#2d5a27", borderColor: "#2d5a27" }}
        >
          <i className="bi bi-person-plus-fill me-2"></i>Create New User
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          className="alert alert-danger alert-dismissible fade show mb-3"
          role="alert"
          data-testid="admin-error-alert"
        >
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {success && (
        <div
          className="alert alert-success alert-dismissible fade show mb-3"
          role="alert"
          data-testid="admin-success-alert"
        >
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: "12px" }}>
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="admin-user-search-input"
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                data-testid="admin-user-role-filter"
              >
                <option value="">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card shadow-sm border-0" style={{ borderRadius: "12px" }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Loading user directory...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-0">No users found matching the search/filter criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="admin-user-table">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-4">ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Password Flag</th>
                    <th scope="col" className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} data-testid={`admin-user-row-${u.id}`}>
                      <td className="ps-4 fw-semibold text-secondary">#{u.id}</td>
                      <td>
                        <span className="fw-semibold text-dark" data-testid={`user-name-${u.id}`}>
                          {u.name}
                        </span>
                      </td>
                      <td data-testid={`user-email-${u.id}`}>{u.email}</td>
                      <td>
                        <span
                          className={`badge ${
                            u.role === "ADMINISTRATOR"
                              ? "bg-danger text-white"
                              : u.role === "IT_STAFF"
                              ? "bg-primary text-white"
                              : "bg-secondary text-white"
                          }`}
                          data-testid={`user-role-${u.id}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${u.isActive ? "bg-success" : "bg-dark"}`}
                          data-testid={`user-status-${u.id}`}
                        >
                          {u.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td>
                        {u.requiresPasswordChange ? (
                          <span className="badge bg-warning text-dark">Must Change Password</span>
                        ) : (
                          <span className="badge bg-light text-muted border">Normal</span>
                        )}
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => openEditModal(u)}
                          data-testid={`edit-user-btn-${u.id}`}
                          title="Edit User Details"
                        >
                          <i className="bi bi-pencil-square me-1"></i>Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-warning text-dark"
                          onClick={() => openResetPasswordModal(u)}
                          data-testid={`reset-password-btn-${u.id}`}
                          title="Reset Initial Password"
                        >
                          <i className="bi bi-key-fill me-1"></i>Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="create-user-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ backgroundColor: "#2d5a27" }}>
                <h5 className="modal-title">Create New User</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeModal}
                  aria-label="Close"
                ></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  {modalError && (
                    <div className="alert alert-danger" role="alert" data-testid="admin-error-alert">
                      {modalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      data-testid="user-form-name"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="user-form-email"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">System Role</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as AdminUserRole })
                      }
                      data-testid="user-form-role"
                    >
                      <option value="REQUESTER">REQUESTER</option>
                      <option value="IT_STAFF">IT_STAFF</option>
                      <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Initial Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.initialPassword}
                      onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                      placeholder="Set initial password"
                      required
                      data-testid="user-form-password"
                    />
                    <div className="form-text">User will be prompted to change password on first login.</div>
                  </div>

                  <div className="mb-3 form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="createActiveSwitch"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      data-testid="user-form-active"
                    />
                    <label className="form-check-label fw-semibold" htmlFor="createActiveSwitch">
                      Account Active
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModal}
                    data-testid="cancel-user-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={isSubmitting}
                    data-testid="submit-user-btn"
                    style={{ backgroundColor: "#2d5a27", borderColor: "#2d5a27" }}
                  >
                    {isSubmitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="edit-user-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ backgroundColor: "#2d5a27" }}>
                <h5 className="modal-title">Edit User #{editingUser.id}</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeModal}
                  aria-label="Close"
                ></button>
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body">
                  {modalError && (
                    <div className="alert alert-danger" role="alert" data-testid="admin-error-alert">
                      {modalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      data-testid="user-form-name"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="user-form-email"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">System Role</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as AdminUserRole })
                      }
                      data-testid="user-form-role"
                    >
                      <option value="REQUESTER">REQUESTER</option>
                      <option value="IT_STAFF">IT_STAFF</option>
                      <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                    </select>
                  </div>

                  <div className="mb-3 form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="editActiveSwitch"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      data-testid="user-form-active"
                    />
                    <label className="form-check-label fw-semibold" htmlFor="editActiveSwitch">
                      Account Active
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModal}
                    data-testid="cancel-user-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={isSubmitting}
                    data-testid="submit-user-btn"
                    style={{ backgroundColor: "#2d5a27", borderColor: "#2d5a27" }}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Initial Password Modal */}
      {resettingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="reset-password-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">Reset Password for {resettingUser.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                  aria-label="Close"
                ></button>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body">
                  {modalError && (
                    <div className="alert alert-danger" role="alert" data-testid="admin-error-alert">
                      {modalError}
                    </div>
                  )}

                  <p className="text-muted">
                    Setting a new initial password for <strong>{resettingUser.email}</strong> will flag the account to require a password change on next login.
                  </p>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">New Initial Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      placeholder="Enter new initial password"
                      required
                      data-testid="reset-password-input"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModal}
                    data-testid="cancel-reset-password-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning text-dark"
                    disabled={isSubmitting}
                    data-testid="submit-reset-password-btn"
                  >
                    {isSubmitting ? "Resetting..." : "Reset Initial Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
