import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteRole, fetchRoles } from "../api/rolesApi";
import { Role } from "../types";
import {
  card, th, td, MUTED, BORDER,
  PrimaryButton, GhostButton, RoleBadge, ErrorNote, Spinner,
} from "../components/ui";
import { readDashboardCache, writeDashboardCache } from "../../../utils/dashboardCache";
import { PageHeader } from "../../../components/PageHeader";
import { IconRoles } from "../../../components/icons";

const CACHE_KEY = "manageRolesPage";

const ManageRolesPage: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>(() => readDashboardCache<Role[]>(CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(() => readDashboardCache<Role[]>(CACHE_KEY) === null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchRoles()
      .then((r) => { setRoles(r); setError(null); writeDashboardCache(CACHE_KEY, r); })
      .catch((e) =>
        setError(
          e?.message?.includes("does not exist") || e?.code === "42P01"
            ? "Roles tables not found. Run supabase/roles_permissions_setup.sql in the Supabase SQL editor first."
            : e?.message ?? "Failed to load roles",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (role: Role) => {
    if (role.is_system) return;
    const assigned = role.users_assigned ?? 0;
    const ok = window.confirm(
      assigned > 0
        ? `"${role.name}" is assigned to ${assigned} user(s). Deleting it will leave them without a role. Continue?`
        : `Delete role "${role.name}"?`,
    );
    if (!ok) return;
    setDeletingId(role.id);
    try {
      await deleteRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete role");
    } finally {
      setDeletingId(null);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <PageHeader
        title="Manage Roles"
        subtitle="Define what each admin role can see and do"
        icon={IconRoles}
        breadcrumbs={[
          { label: "Roles & Permissions", onClick: () => navigate("/roles") },
          { label: "Manage Roles" },
        ]}
        actions={
          <>
            <GhostButton onClick={() => navigate("/roles")}>Admin Users</GhostButton>
            <PrimaryButton onClick={() => navigate("/roles/add")}>+ Add Role</PrimaryButton>
          </>
        }
      />

      <ErrorNote message={error} />

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <Spinner />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Sr. No.</th>
                  <th style={th}>Role Name</th>
                  <th style={th}>Role Description</th>
                  <th style={th}>Users Assigned</th>
                  <th style={th}>Last Modified</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={r.id}>
                    <td style={td}>{String(i + 1).padStart(2, "0")}</td>
                    <td style={td}><RoleBadge name={r.name} /></td>
                    <td style={{ ...td, maxWidth: 420, color: "#475569" }}>
                      {r.description || "—"}
                    </td>
                    <td style={td}>{r.users_assigned ?? "—"}</td>
                    <td style={td}>{fmtDate(r.updated_at)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => navigate(`/roles/${r.id}/edit`)}
                          style={{
                            background: "none", border: `1px solid ${BORDER}`,
                            borderRadius: 6, padding: "5px 10px", fontSize: 12.5,
                            color: "#475569", cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={r.is_system || deletingId === r.id}
                          title={r.is_system ? "System roles can't be deleted" : "Delete role"}
                          style={{
                            background: "none",
                            border: `1px solid ${r.is_system ? "#F1F5F9" : "#FECACA"}`,
                            borderRadius: 6, padding: "5px 10px", fontSize: 12.5,
                            color: r.is_system ? "#CBD5E1" : "#DC2626",
                            cursor: r.is_system ? "not-allowed" : "pointer",
                          }}
                        >
                          {deletingId === r.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr>
                    <td style={{ ...td, textAlign: "center", color: MUTED }} colSpan={6}>
                      No roles yet. Run the setup SQL or add one with “+ Add Role”.
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

export default ManageRolesPage;
