// Supabase Edge Function: admin-users
//
// Actions (POST JSON body):
//   { action: "list" }                        → full admin user list (email/phone from auth.users)
//   { action: "delete", user_id }             → remove an admin account
//   { action: "reset_password", user_id }     → set a new generated password, returned once
//
// Deploy:  supabase functions deploy admin-users --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generatePassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return set[buf[0] % set.length];
  };
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ── authenticate caller, require Super Admin / Admin ──
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, role_id")
    .eq("id", caller.id)
    .single();

  let callerRoleName: string | undefined;
  if (callerProfile?.role_id) {
    const { data: r } = await admin
      .from("roles").select("name").eq("id", callerProfile.role_id).single();
    callerRoleName = r?.name;
  }
  const canManage =
    callerProfile?.role === "admin" &&
    (!callerRoleName || ["Super Admin", "Admin"].includes(callerRoleName));
  if (!canManage) return json({ error: "Not authorized" }, 403);

  let body: { action?: string; user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  /* ── list ─────────────────────────────────────────────────── */
  if (body.action === "list") {
    const [usersRes, profilesRes, rolesRes] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("profiles").select("*").eq("role", "admin"),
      admin.from("roles").select("id, name"),
    ]);
    if (usersRes.error) return json({ error: usersRes.error.message }, 400);

    const roleNames = new Map(
      (rolesRes.data ?? []).map((r: any) => [r.id, r.name as string]),
    );
    const authById = new Map(
      usersRes.data.users.map((u) => [u.id, u]),
    );

    const users = (profilesRes.data ?? []).map((p: any) => {
      const au = authById.get(p.id);
      const meta = (au?.user_metadata ?? {}) as Record<string, any>;
      return {
        id: p.id,
        first_name: p.first_name || meta.first_name || null,
        last_name: p.last_name || meta.last_name || null,
        email: au?.email ?? p.email ?? null,
        phone: p.phone || au?.phone || meta.phone || null,
        image_url: p.image_url ?? null,
        role_id: p.role_id ?? null,
        role_name: p.role_id ? roleNames.get(p.role_id) ?? null : null,
        created_at: au?.created_at ?? p.created_at ?? null,
        last_sign_in_at: au?.last_sign_in_at ?? null,
      };
    });

    users.sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
    return json({ users });
  }

  /* ── delete ───────────────────────────────────────────────── */
  if (body.action === "delete") {
    if (!body.user_id) return json({ error: "user_id is required" }, 400);
    if (body.user_id === caller.id) {
      return json({ error: "You can't delete your own account" }, 400);
    }
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(body.user_id);
    // remove the profile row too (in case there's no FK cascade)
    await admin.from("profiles").delete().eq("id", body.user_id);
    if (delAuthErr) return json({ error: delAuthErr.message }, 400);
    return json({ success: true });
  }

  /* ── set role ─────────────────────────────────────────────── */
  if (body.action === "set_role") {
    const roleId = (body as any).role_id as string | undefined;
    if (!body.user_id || !roleId) {
      return json({ error: "user_id and role_id are required" }, 400);
    }
    const { data: role } = await admin
      .from("roles").select("id, name").eq("id", roleId).single();
    if (!role) return json({ error: "Role not found" }, 400);

    const { error: updErr } = await admin
      .from("profiles")
      .update({ role_id: role.id })
      .eq("id", body.user_id);
    if (updErr) return json({ error: updErr.message }, 400);
    return json({ success: true, role: role.name });
  }

  /* ── reset password ───────────────────────────────────────── */
  if (body.action === "reset_password") {
    if (!body.user_id) return json({ error: "user_id is required" }, 400);

    const { data: target } = await admin.auth.admin.getUserById(body.user_id);
    if (!target?.user?.email) return json({ error: "User not found" }, 404);
    const email = target.user.email;

    const password = generatePassword();
    // temp_password goes into metadata so the "Reset Password" email
    // template can render it, then gets scrubbed right after sending
    const { error: updErr } = await admin.auth.admin.updateUserById(
      body.user_id,
      { password, user_metadata: { temp_password: password } },
    );
    if (updErr) return json({ error: updErr.message }, 400);

    let emailed = false;
    try {
      const redirectTo = Deno.env.get("ADMIN_APP_URL");
      const { error: mailErr } = await admin.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : undefined,
      );
      emailed = !mailErr;
    } catch {
      emailed = false;
    }

    // remove the plain-text password from metadata (email already rendered)
    await admin.auth.admin.updateUserById(body.user_id, {
      user_metadata: { temp_password: null },
    });

    return json({ password, emailed });
  }

  return json({ error: "Unknown action" }, 400);
});
