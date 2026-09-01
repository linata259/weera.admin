import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from "react";
import { supabase } from "services/supabaseClient";

interface PermissionsCache {
  roleName: string | null;
  permissions: Record<string, ModulePermission>;
  fullAccess: boolean;
}

const CACHE_KEY = "weera_admin_permissions";

function readPermissionsCache(): PermissionsCache | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PermissionsCache) : null;
  } catch {
    return null;
  }
}

function writePermissionsCache(cache: PermissionsCache): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore — this is a nice-to-have cache, not required for correctness
  }
}

export interface ModulePermission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface PermissionsState {
  loading: boolean;
  roleName: string | null;
  permissions: Record<string, ModulePermission>;
  can: (module: string, action?: keyof Omit<ModulePermission, "module">) => boolean;
}

const PermissionsContext = createContext<PermissionsState>({
  loading: true,
  roleName: null,
  permissions: {},
  can: () => false,
});

/**
 * Resolves the signed-in admin's role and permission set ONCE per login and
 * shares it app-wide. Refetches on auth changes so switching accounts never
 * shows the previous user's dashboard or navigation.
 */
export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const cached = readPermissionsCache();
  const [loading, setLoading] = useState(cached === null);
  const [roleName, setRoleName] = useState<string | null>(cached?.roleName ?? null);
  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>(cached?.permissions ?? {});
  const [fullAccess, setFullAccess] = useState(cached?.fullAccess ?? false);

  // `isInitial` is true only for the very first load on mount. When we
  // already have a cached role/permission set to show (e.g. the browser
  // discarded this tab in the background and reloaded it when the admin
  // switched back), that first load runs quietly behind the cached UI
  // instead of blanking the screen back to a spinner. A real auth change
  // (sign in/out, a different user) always resets and shows the spinner,
  // since stale permissions must never leak across accounts.
  const load = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setLoading(true);
      setRoleName(null);
      setPermissions({});
      setFullAccess(false);
    }
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
        writePermissionsCache({ roleName: null, permissions: {}, fullAccess: true });
        return;
      }

      const [roleRes, permsRes, allPermsRes] = await Promise.all([
        supabase.from("roles").select("name").eq("id", profile.role_id).single(),
        supabase.from("role_permissions").select("*").eq("role_id", profile.role_id),
        supabase.from("permissions").select("id, module"),
      ]);

      const resolvedRoleName = (roleRes.data as any)?.name ?? null;
      setRoleName(resolvedRoleName);

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
      writePermissionsCache({ roleName: resolvedRoleName, permissions: map, fullAccess: false });
    } catch {
      window.localStorage.removeItem(CACHE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(cached !== null);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        window.localStorage.removeItem(CACHE_KEY);
        load();
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const can: PermissionsState["can"] = (module, action = "can_view") => {
    if (fullAccess) return true;
    return Boolean(permissions[module]?.[action]);
  };

  return (
    <PermissionsContext.Provider value={{ loading, roleName, permissions, can }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext(): PermissionsState {
  return useContext(PermissionsContext);
}
