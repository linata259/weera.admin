import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAdminUser, fetchRoles } from "../api/rolesApi";
import { CreateAdminUserResult, Role } from "../types";
import {
  card, input, label, MUTED, TEXT, BORDER, PRIMARY,
  PrimaryButton, GhostButton, ErrorNote, Spinner,
} from "../components/ui";

const CreateAdminUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateAdminUserResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");

  useEffect(() => {
    fetchRoles()
      .then((r) => {
        setRoles(r);
        setError(null);
      })
      .catch((e) =>
        setError(
          e?.message?.includes("does not exist") || e?.code === "42P01"
            ? "Roles tables not found. Run supabase/roles_permissions_setup.sql in the Supabase SQL editor first."
            : e?.message ?? "Failed to load roles",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!firstName.trim()) return setError("First name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("A valid email is required");
    if (!roleId) return setError("Please assign a role");

    setSaving(true);
    setError(null);
    try {
      const res = await createAdminUser({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        role_id: roleId,
      });
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create admin user");
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(
      `Weera Admin access\nEmail: ${result.email}\nTemporary password: ${result.password}\nRole: ${result.role}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── success state ─────────────────────────────────────────── */
  if (result) {
    return (
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", maxWidth: 560 }}>
        <div style={card}>
          <h2 style={{ margin: "0 0 6px", fontSize: 18, color: TEXT }}>
            {result.role} account created
          </h2>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, color: MUTED }}>
            {result.emailed
              ? `An invite email was sent to ${result.email}. You can also share the temporary password below — it's shown only once.`
              : "The invite email couldn't be sent — copy the credentials below and share them securely. The password is shown only once."}
          </p>

          <div
            style={{
              border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: 16, fontSize: 14, color: TEXT, marginBottom: 18,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: MUTED }}>Email:&nbsp;</span>{result.email}
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: MUTED }}>Temporary password:&nbsp;</span>
              <code style={{ background: "#F8FAFC", padding: "2px 8px", borderRadius: 6 }}>
                {result.password}
              </code>
            </div>
            <div>
              <span style={{ color: MUTED }}>Role:&nbsp;</span>
              <span style={{ color: PRIMARY, fontWeight: 600 }}>{result.role}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <PrimaryButton onClick={copyCredentials}>
              {copied ? "Copied!" : "Copy credentials"}
            </PrimaryButton>
            <GhostButton onClick={() => navigate("/roles")}>
              Back to Admin Users
            </GhostButton>
          </div>
        </div>
      </div>
    );
  }

  /* ── form ──────────────────────────────────────────────────── */
  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", maxWidth: 760 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: TEXT }}>
          Create Admin User
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
          A secure password is generated automatically and sent to the user by email
        </p>
      </div>

      <ErrorNote message={error} />

      {loading ? (
        <Spinner />
      ) : (
        <div style={card}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            <div>
              <label style={label}>First Name</label>
              <input style={input} placeholder="John" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={label}>Last Name</label>
              <input style={input} placeholder="Doe" value={lastName}
                onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <label style={label}>Email</label>
              <input style={input} type="email" placeholder="johndoe@gmail.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={label}>Mobile Number</label>
              <input style={input} placeholder="+254 712 345 678" value={phone}
                onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label style={label}>Assign Role</label>
              <select
                style={input}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <option value="">Select role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Password</label>
              <input
                style={{ ...input, background: "#F8FAFC", color: MUTED }}
                value="Auto-generated on creation"
                readOnly
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
            <GhostButton onClick={() => navigate("/roles")}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSubmit} disabled={saving}>
              {saving ? "Creating…" : "Create Admin User"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateAdminUserPage;
