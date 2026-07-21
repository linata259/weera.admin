import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteAdminUser, fetchAdminUsers, fetchRoles, resetAdminPassword, updateAdminUserRole,
} from "../api/rolesApi";
import { AdminUser, Role } from "../types";
import {
  card, th, td, input, MUTED, TEXT, BORDER,
  PrimaryButton, GhostButton, RoleBadge, ErrorNote, Spinner,
} from "../components/ui";

const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([fetchAdminUsers(), fetchRoles()])
      .then(([u, r]) => {
        setUsers(u);
        setRoles(r);
        setError(null);
      })
      .catch((e) =>
        setError(
          e?.message?.includes("does not exist") || e?.code === "42P01"
            ? "Roles tables not found. Run supabase/roles_permissions_setup.sql in the Supabase SQL editor first."
            : e?.message ?? "Failed to load admin users",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.first_name, u.last_name, u.email, u.phone, u.role_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [users, search]);

  const handleDelete = async (u: AdminUser) => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "this user";
    if (!window.confirm(`Delete ${name}'s admin account? This can't be undone.`)) return;
    setSavingId(u.id);
    try {
      await deleteAdminUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete user");
    } finally {
      setSavingId(null);
    }
  };

  const handleResetPassword = async (u: AdminUser) => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "this user";
    if (!window.confirm(`Generate a new password for ${name}? Their current password will stop working.`)) return;
    setSavingId(u.id);
    try {
      const { password, emailed } = await resetAdminPassword(u.id);
      setResetResult({ email: u.email ?? name, password, emailed });
    } catch (e: any) {
      setError(e?.message ?? "Failed to reset password");
    } finally {
      setSavingId(null);
    }
  };

  const copyReset = async () => {
    if (!resetResult) return;
    await navigator.clipboard.writeText(
      `Email: ${resetResult.email}\nNew password: ${resetResult.password}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    setSavingId(userId);
    try {
      await updateAdminUserRole(userId, roleId);
      const role = roles.find((r) => r.id === roleId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, role_id: roleId, role_name: role?.name ?? u.role_name }
            : u,
        ),
      );
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update role");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif" }}>
      {/* header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <div style={{ marginRight: "auto" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: TEXT }}>
            Roles &amp; Permissions
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
            Admin users and the roles assigned to them
          </p>
        </div>
        <GhostButton onClick={() => navigate("/roles/manage")}>Manage Roles</GhostButton>
        <PrimaryButton onClick={() => navigate("/roles/create-user")}>
          + Create Admin User
        </PrimaryButton>
      </div>

      <ErrorNote message={error} />

      {resetResult && (
        <div style={{
          ...card, marginBottom: 16, display: "flex", flexWrap: "wrap",
          alignItems: "center", gap: 12, borderColor: "#FDBA8C", background: "#FFF7ED",
        }}>
          <div style={{ marginRight: "auto", fontSize: 13.5, color: TEXT }}>
            New password for <b>{resetResult.email}</b>:{" "}
            <code style={{ background: "#fff", padding: "3px 8px", borderRadius: 6, border: `1px solid ${BORDER}` }}>
              {resetResult.password}
            </code>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
              {resetResult.emailed
                ? "Also emailed to the user. Shown here only once."
                : "Email couldn't be sent — copy it now and share it securely. Shown only once."}
            </div>
          </div>
          <PrimaryButton onClick={copyReset}>{copied ? "Copied!" : "Copy"}</PrimaryButton>
          <GhostButton onClick={() => setResetResult(null)}>Dismiss</GhostButton>
        </div>
      )}

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${BORDER}` }}>
          <input
            style={{ ...input, maxWidth: 320 }}
            placeholder="Search admin users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Sr. No.</th>
                  <th style={th}>User Name</th>
                  <th style={th}>Contact No.</th>
                  <th style={th}>Email Id</th>
                  <th style={th}>Assigned Role</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const name =
                    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                    "Unknown";
                  return (
                    <tr key={u.id}>
                      <td style={td}>{String(i + 1).padStart(2, "0")}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {u.image_url ? (
                            <img
                              src={u.image_url}
                              alt=""
                              style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 30, height: 30, borderRadius: "50%",
                                background: "#FFF4EE", color: "#EA580C",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700,
                              }}
                            >
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontWeight: 500 }}>{name}</span>
                        </div>
                      </td>
                      <td style={td}>{u.phone || "—"}</td>
                      <td style={td}>{u.email || "—"}</td>
                      <td style={td}>
                        {editingId === u.id ? (
                          <select
                            style={{ ...input, width: 190, padding: "6px 8px" }}
                            value={u.role_id ?? ""}
                            disabled={savingId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          >
                            <option value="" disabled>Select role…</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        ) : (
                          <RoleBadge name={u.role_name} />
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            onClick={() => setEditingId(editingId === u.id ? null : u.id)}
                            style={{
                              background: "none", border: `1px solid ${BORDER}`,
                              borderRadius: 6, padding: "5px 10px", fontSize: 12.5,
                              color: "#475569", cursor: "pointer",
                            }}
                          >
                            {editingId === u.id ? "Cancel" : "Change Role"}
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            disabled={savingId === u.id}
                            title="Generate a new password (shown once)"
                            style={{
                              background: "none", border: `1px solid ${BORDER}`,
                              borderRadius: 6, padding: "5px 10px", fontSize: 12.5,
                              color: "#475569", cursor: "pointer",
                            }}
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={savingId === u.id}
                            style={{
                              background: "none", border: "1px solid #FECACA",
                              borderRadius: 6, padding: "5px 10px", fontSize: 12.5,
                              color: "#DC2626", cursor: "pointer",
                            }}
                          >
                            {savingId === u.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td style={{ ...td, textAlign: "center", color: MUTED }} colSpan={6}>
                      No admin users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
