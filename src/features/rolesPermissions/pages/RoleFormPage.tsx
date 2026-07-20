import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createRole, fetchPermissions, fetchRole, fetchRolePermissions, updateRole,
} from "../api/rolesApi";
import { PermissionRow } from "../types";
import {
  card, th, td, input, label, MUTED, TEXT, BORDER,
  PrimaryButton, GhostButton, Check, ErrorNote, Spinner,
} from "../components/ui";

type Action = "can_view" | "can_create" | "can_edit" | "can_delete";
const ACTIONS: { key: Action; label: string }[] = [
  { key: "can_view", label: "View" },
  { key: "can_create", label: "Create" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
];

const RoleFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { roleId } = useParams<{ roleId: string }>();
  const isEdit = Boolean(roleId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [isSystem, setIsSystem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const permissions = await fetchPermissions();
        let assigned: Record<string, Partial<PermissionRow>> = {};
        if (roleId) {
          const [role, rolePerms] = await Promise.all([
            fetchRole(roleId),
            fetchRolePermissions(roleId),
          ]);
          setName(role.name);
          setDescription(role.description ?? "");
          setIsSystem(role.is_system);
          assigned = Object.fromEntries(
            rolePerms.map((rp) => [rp.permission_id, rp]),
          );
        }
        setRows(
          permissions.map((p) => ({
            ...p,
            can_view: Boolean(assigned[p.id]?.can_view),
            can_create: Boolean(assigned[p.id]?.can_create),
            can_edit: Boolean(assigned[p.id]?.can_edit),
            can_delete: Boolean(assigned[p.id]?.can_delete),
          })),
        );
        setError(null);
      } catch (e: any) {
        setError(
          e?.message?.includes("does not exist") || e?.code === "42P01"
            ? "Roles tables not found. Run supabase/roles_permissions_setup.sql in the Supabase SQL editor first."
            : e?.message ?? "Failed to load permissions",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [roleId]);

  const toggle = (permissionId: string, action: Action, value: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== permissionId) return r;
        const next = { ...r, [action]: value };
        // create/edit/delete imply view
        if (action !== "can_view" && value) next.can_view = true;
        // removing view removes everything else
        if (action === "can_view" && !value) {
          next.can_create = false;
          next.can_edit = false;
          next.can_delete = false;
        }
        return next;
      }),
    );
  };

  const toggleAll = (value: boolean) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        can_view: value, can_create: value, can_edit: value, can_delete: value,
      })),
    );
  };

  const allChecked = useMemo(
    () => rows.length > 0 && rows.every((r) => r.can_view && r.can_create && r.can_edit && r.can_delete),
    [rows],
  );

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Role name is required");
      return;
    }
    if (!rows.some((r) => r.can_view)) {
      setError("Select at least one permission");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && roleId) {
        await updateRole(roleId, name, description, rows);
      } else {
        await createRole(name, description, rows);
      }
      navigate("/roles/manage");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: TEXT }}>
          {isEdit ? "Edit Role" : "Add Role"}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
          {isEdit
            ? "Update the role details and its permissions"
            : "Name the role and choose what it can access"}
        </p>
      </div>

      <ErrorNote message={error} />

      {loading ? (
        <Spinner />
      ) : (
        <div style={card}>
          <div style={{ marginBottom: 18 }}>
            <label style={label}>Role Name</label>
            <input
              style={{ ...input, maxWidth: 420 }}
              placeholder="Enter role name"
              value={name}
              disabled={isSystem}
              onChange={(e) => setName(e.target.value)}
            />
            {isSystem && (
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                System role — the name can’t be changed.
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={label}>Role Description</label>
            <textarea
              style={{ ...input, minHeight: 80, resize: "vertical" }}
              placeholder="Write description…"
              maxLength={250}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div style={{ fontSize: 11.5, color: MUTED, textAlign: "right" }}>
              {description.length}/250
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginRight: "auto" }}>
              Set Role Permissions
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
              <Check checked={allChecked} onChange={toggleAll} />
              Full access (all modules)
            </div>
          </div>

          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={th}>Sr. No.</th>
                    <th style={th}>Module</th>
                    {ACTIONS.map((a) => (
                      <th key={a.key} style={{ ...th, textAlign: "center" }}>{a.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td style={td}>{String(i + 1).padStart(2, "0")}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 500 }}>{r.label}</div>
                        {r.description && (
                          <div style={{ fontSize: 12, color: MUTED }}>{r.description}</div>
                        )}
                      </td>
                      {ACTIONS.map((a) => (
                        <td key={a.key} style={{ ...td, textAlign: "center" }}>
                          <Check
                            checked={r[a.key]}
                            onChange={(v) => toggle(r.id, a.key, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
            <GhostButton onClick={() => navigate("/roles/manage")}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Role"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleFormPage;
