import { supabase } from "services/supabaseClient";
import {
  Role,
  Permission,
  RolePermission,
  PermissionRow,
  AdminUser,
  CreateAdminUserInput,
  CreateAdminUserResult,
} from "../types";

/* ── Roles ─────────────────────────────────────────────────── */

export async function fetchRoles(): Promise<Role[]> {
  // roles_overview adds users_assigned / modules_visible counts
  const { data, error } = await supabase
    .from("roles_overview")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    // fall back to the raw table if the view hasn't been created yet
    const fallback = await supabase.from("roles").select("*").order("created_at");
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []) as Role[];
  }
  return (data ?? []) as Role[];
}

export async function fetchPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Permission[];
}

export async function fetchRolePermissions(
  roleId: string,
): Promise<RolePermission[]> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("role_id", roleId);
  if (error) throw error;
  return (data ?? []) as RolePermission[];
}

export async function fetchRole(roleId: string): Promise<Role> {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("id", roleId)
    .single();
  if (error) throw error;
  return data as Role;
}

export async function createRole(
  name: string,
  description: string,
  rows: PermissionRow[],
): Promise<Role> {
  const { data, error } = await supabase
    .from("roles")
    .insert({ name: name.trim(), description: description.trim() || null })
    .select()
    .single();
  if (error) throw error;
  const role = data as Role;
  await saveRolePermissions(role.id, rows);
  return role;
}

export async function updateRole(
  roleId: string,
  name: string,
  description: string,
  rows: PermissionRow[],
): Promise<void> {
  const { error } = await supabase
    .from("roles")
    .update({
      name: name.trim(),
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roleId);
  if (error) throw error;
  await saveRolePermissions(roleId, rows);
}

async function saveRolePermissions(roleId: string, rows: PermissionRow[]) {
  const payload = rows
    .filter((r) => r.can_view || r.can_create || r.can_edit || r.can_delete)
    .map((r) => ({
      role_id: roleId,
      permission_id: r.id,
      can_view: r.can_view,
      can_create: r.can_create,
      can_edit: r.can_edit,
      can_delete: r.can_delete,
    }));

  // replace the whole permission set for this role
  const del = await supabase.from("role_permissions").delete().eq("role_id", roleId);
  if (del.error) throw del.error;
  if (payload.length > 0) {
    const ins = await supabase.from("role_permissions").insert(payload);
    if (ins.error) throw ins.error;
  }
}

export async function deleteRole(roleId: string): Promise<void> {
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) throw error;
}

/* ── Admin users ───────────────────────────────────────────── */

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  // select("*") + a separate roles lookup: avoids 400s from missing
  // profile columns or a not-yet-cached profiles→roles relationship
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "admin"),
    supabase.from("roles").select("id, name"),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const roleNames = new Map(
    ((rolesRes.data ?? []) as any[]).map((r) => [r.id, r.name as string]),
  );

  const users = ((profilesRes.data ?? []) as any[]).map((row) => ({
    id: row.id,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    image_url: row.image_url ?? null,
    role_id: row.role_id ?? null,
    role_name: row.role_id ? roleNames.get(row.role_id) ?? null : null,
    created_at: row.created_at ?? null,
  }));

  return users.sort((a, b) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
  );
}

export async function updateAdminUserRole(
  userId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ role_id: roleId })
    .eq("id", userId);
  if (error) throw error;
}

export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<CreateAdminUserResult> {
  const { data, error } = await supabase.functions.invoke("create-admin-user", {
    body: input,
  });
  if (error) {
    // surface the function's error message when available
    let message = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch {
      /* keep original message */
    }
    throw new Error(message);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as CreateAdminUserResult;
}
