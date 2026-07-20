// Supabase Edge Function: create-admin-user
//
// Creates an admin account with a generated password, assigns a role,
// and emails the credentials (via Resend, if RESEND_API_KEY is set).
// The credentials are always returned to the caller so the UI can show
// a copy-able fallback when email isn't configured.
//
// Deploy:  supabase functions deploy create-admin-user
// Secrets: supabase secrets set RESEND_API_KEY=re_xxx  (optional)
//          supabase secrets set EMAIL_FROM="Weera Admin <admin@yourdomain.com>"  (optional)

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
  // guarantee one of each class, fill the rest randomly, then shuffle
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

  // ── 1. Authenticate the caller and verify they are an admin ──
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, role_id")
    .eq("id", caller.id)
    .single();

  let callerRoleName: string | undefined;
  if (callerProfile?.role_id) {
    const { data: callerRole } = await admin
      .from("roles")
      .select("name")
      .eq("id", callerProfile.role_id)
      .single();
    callerRoleName = callerRole?.name;
  }
  const isAdmin = callerProfile?.role === "admin";
  const canCreateAdmins =
    isAdmin &&
    (!callerRoleName || ["Super Admin", "Admin"].includes(callerRoleName));
  if (!canCreateAdmins) {
    return json({ error: "Only Super Admin / Admin can create admin users" }, 403);
  }

  // ── 2. Validate input ──
  let body: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    role_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Valid email is required" }, 400);
  }
  if (!body.role_id) return json({ error: "role_id is required" }, 400);

  const { data: role } = await admin
    .from("roles")
    .select("id, name")
    .eq("id", body.role_id)
    .single();
  if (!role) return json({ error: "Role not found" }, 400);

  // ── 3. Invite the user by email (sent through Supabase Auth —
  //       the same email channel the Weera app already uses), then
  //       set a generated password so credentials can also be shared
  //       directly from the UI ──
  const password = generatePassword();
  const inviteOptions: { data: Record<string, string>; redirectTo?: string } = {
    data: {
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      phone: body.phone ?? "",
      invited_role: role.name,
      // rendered into the invite email template as {{ .Data.temp_password }},
      // then stripped from user metadata right after the email is sent
      temp_password: password,
    },
  };
  // optional: where the invite link lands (must be in Auth → URL allow-list)
  const adminUrl = Deno.env.get("ADMIN_APP_URL");
  if (adminUrl) inviteOptions.redirectTo = adminUrl;

  let userId: string | null = null;
  let emailed = false;

  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, inviteOptions);

  if (invited?.user) {
    userId = invited.user.id;
    emailed = true;
    // set the real password and remove it from metadata (the invite email
    // has already been rendered and sent at this point)
    await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { temp_password: null },
    });
  } else {
    // invite failed (e.g. email sending disabled) → fall back to direct
    // creation so the flow still completes with copyable credentials
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: inviteOptions.data,
    });
    if (createErr || !created.user) {
      return json(
        { error: inviteErr?.message ?? createErr?.message ?? "Failed to create user" },
        400,
      );
    }
    userId = created.user.id;
  }

  // ── 4. Upsert profile as admin with the assigned role ──
  let { error: profileErr } = await admin.from("profiles").upsert({
    id: userId,
    email,
    first_name: body.first_name ?? null,
    last_name: body.last_name ?? null,
    phone: body.phone ?? null,
    role: "admin",
    role_id: role.id,
  });
  // retry with the minimal column set if this profiles schema
  // doesn't have email/phone/name columns
  if (profileErr && /column|schema cache/i.test(profileErr.message)) {
    const retry = await admin.from("profiles").upsert({
      id: userId,
      role: "admin",
      role_id: role.id,
    });
    profileErr = retry.error;
  }
  if (profileErr) {
    // roll back the orphaned auth user
    await admin.auth.admin.deleteUser(userId!);
    return json({ error: `Profile creation failed: ${profileErr.message}` }, 400);
  }

  return json({
    user_id: userId,
    email,
    password, // shown once in the UI so it can be copied / shared securely
    role: role.name,
    emailed,
  });
});
