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

  // ── 3. Create the auth user with a generated password ──
  const password = generatePassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: body.first_name ?? "",
      last_name: body.last_name ??"",
      phone: body.phone ?? "",
    },
  });
  if (createErr || !created.user) {
    return json({ error: createErr?.message ?? "Failed to create user" }, 400);
  }

  // ── 4. Upsert profile as admin with the assigned role ──
  let { error: profileErr } = await admin.from("profiles").upsert({
    id: created.user.id,
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
      id: created.user.id,
      role: "admin",
      role_id: role.id,
    });
    profileErr = retry.error;
  }
  if (profileErr) {
    // roll back the orphaned auth user
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: `Profile creation failed: ${profileErr.message}` }, 400);
  }

  // ── 5. Email credentials (best effort) ──
  let emailed = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") ?? "Weera Admin <onboarding@resend.dev>",
          to: [email],
          subject: "Your Weera admin account",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
              <h2 style="color:#EA580C">Welcome to Weera Admin</h2>
              <p>An administrator account has been created for you.</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0">
                <tr><td style="padding:8px;border:1px solid #E2E8F0"><b>Email</b></td><td style="padding:8px;border:1px solid #E2E8F0">${email}</td></tr>
                <tr><td style="padding:8px;border:1px solid #E2E8F0"><b>Temporary password</b></td><td style="padding:8px;border:1px solid #E2E8F0"><code>${password}</code></td></tr>
                <tr><td style="padding:8px;border:1px solid #E2E8F0"><b>Role</b></td><td style="padding:8px;border:1px solid #E2E8F0">${role.name}</td></tr>
              </table>
              <p>Please sign in and change your password immediately.</p>
            </div>`,
        }),
      });
      emailed = res.ok;
    } catch {
      emailed = false;
    }
  }

  return json({
    user_id: created.user.id,
    email,
    password, // shown once in the UI so it can be copied / shared securely
    role: role.name,
    emailed,
  });
});
