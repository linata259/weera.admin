import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "services/supabaseClient";

const ORANGE = "#EA580C";
const NAVY   = "#0F172A";
const SLATE  = "#64748B";
const BORDER = "#E2E8F0";
const BG     = "#F8FAFC";

interface Props {
  onLogin?: () => void;
}

export const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      toast.error(authError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        setError("Access denied. Admin accounts only.");
        toast.error("Access denied. Admin accounts only.");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    toast.success("Welcome back! Redirecting to dashboard...");
    onLogin?.();
    navigate("/dashboard");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <img
            src="/images/4.png"
            alt="Weera"
            style={{
              height: 72,
              objectFit: "contain",
              marginBottom: 14,
              display: "block",
              margin: "0 auto 14px",
            }}
          />
          <p style={{ margin: 0, fontSize: 14, color: SLATE }}>
            Admin Panel — Sign in to continue
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@weera.co.ke"
                required
                style={{
                  padding: "11px 14px",
                  border: `1.5px solid ${error ? "#FCA5A5" : BORDER}`,
                  borderRadius: 10,
                  fontSize: 14,
                  color: NAVY,
                  outline: "none",
                  fontFamily: "inherit",
                  background: "#fff",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                onBlur={(e)  => (e.target.style.borderColor = error ? "#FCA5A5" : BORDER)}
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 44px 11px 14px",
                    border: `1.5px solid ${error ? "#FCA5A5" : BORDER}`,
                    borderRadius: 10,
                    fontSize: 14,
                    color: NAVY,
                    outline: "none",
                    fontFamily: "inherit",
                    background: "#fff",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                  onBlur={(e)  => (e.target.style.borderColor = error ? "#FCA5A5" : BORDER)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    cursor: "pointer", padding: 0, color: SLATE,
                  }}
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18M10.5 10.5A3 3 0 0013.5 13.5M9 4.2A10 10 0 0121 12a10 10 0 01-1.5 2.5M6.5 6.5A10 10 0 003 12a10 10 0 0010 5 10 10 0 004.5-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                padding: "10px 14px",
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: 10,
                fontSize: 13,
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.5" />
                  <path d="M8 5v3M8 11v.5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 0",
                background: loading ? "#CBD5E1" : ORANGE,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s",
                boxShadow: loading ? "none" : `0 4px 14px ${ORANGE}40`,
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16,
                    border: "2px solid rgba(255,255,255,0.35)",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    animation: "weera-spin 0.7s linear infinite",
                  }} />
                  Signing in…
                </>
              ) : (
                "Sign in to Admin Panel"
              )}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#94A3B8" }}>
          Weera Admin Panel · Restricted access
        </p>
      </div>

      <style>{`
        @keyframes weera-spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #CBD5E1; }
      `}</style>
    </div>
  );
};