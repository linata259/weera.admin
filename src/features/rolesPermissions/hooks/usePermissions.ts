import { useEffect, useState } from "react";
import { supabase } from "services/supabaseClient";

export interface ModulePermission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface PermissionsState {
  loading: boolean;
  roleName: string | null;
  /** keyed by module, e.g. permissions["financials"]?.can_view */
  permissions: Record<string, ModulePermission>;
  can: (module: string, action?: keyof Omit<ModulePermission, "module">) => boolean;
}

/**
 * Resolves the signed-in admin's role and permission set.
 * Users with no role_id (legacy admins) are treated as full-access
 * so existing accounts keep working until roles are assigned.
 */
export function usePermissions(): PermissionsState {
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>({});
  const [fullAccess, setFullAccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role_id")
          .eq("id", session.user.id)
          .single();

        if (!profile?.role_id) {
          setFullAccess(true); // legacy admin without an assigned role
          return;
        }

        const [roleRes, permsRes, allPermsRes] = await Promise.all([
          supabase.from("roles").select("name").eq("id", profile.role_id).single(),
          supabase.from("role_permissions").select("*").eq("role_id", profile.role_id),
          supabase.from("permissions").select("id, module"),
        ]);

        setRoleName((roleRes.data as any)?.name ?? null);

        const moduleById = new Map(
          ((allPermsRes.data ?? []) as any[]).map((p) => [p.id, p.module as string]),
        );

        const map: Record<string, ModulePermission> = {};
        for (const p of (permsRes.data ?? []) as any[]) {
          const mod = moduleById.get(p.permission_id);
          if (!mod) continue;
          map[mod] = {
            module: mod,
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          };
        }
        setPermissions(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const can: PermissionsState["can"] = (module, action = "can_view") => {
    if (fullAccess) return true;
    return Boolean(permissions[module]?.[action]);
  };

  return { loading, roleName, permissions, can };
}
