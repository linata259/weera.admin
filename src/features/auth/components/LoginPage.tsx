import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "services/supabaseClient";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { Ico, IconHide, IconView, iconSize } from "../../../components/icons";

const ORANGE = "#EA580C";
const NAVY   = "#0F172A";
const SLATE  = "#64748B";
const BORDER = "#E2E8F0";

interface Props {
  onLogin?: () => void;
}

const Logo: React.FC<{ size?: number; dark?: boolean }> = ({ size = 40, dark = false }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, background: ORANGE,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <img
        src={`${process.env.PUBLIC_URL}/images/4.png`}
        alt="Weera"
        style={{ width: size * 0.58, height: size * 0.58, objectFit: "contain", display: "block" }}
      />
    </div>
    <span style={{
      fontSize: size * 0.42, fontWeight: 800, letterSpacing: "0.02em",
      color: dark ? "#fff" : NAVY,
    }}>
      WEERA
    </span>
  </div>
);

export const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      background: "#fff",
    }}>

      {/* ── Left: branded panel (desktop only) ──────────────────── */}
      {!isMobile && (
        <div style={{
          flex: "1 1 42%",
          minHeight: "100vh",
          background: NAVY,
          display: "flex",
          flexDirection: "column",
          padding: "56px",
          boxSizing: "border-box",
        }}>
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 24,
          }}>
            <Logo size={88} dark />
            <p style={{
              margin: 0, maxWidth: 320, fontSize: 15, lineHeight: 1.65,
              color: "rgba(255,255,255,0.6)",
            }}>
              Manage users, jobs, and payments across the Weera platform
              from a single admin console.
            </p>
          </div>

          <p style={{ margin: 0, fontSize: 12.5, color: "#64748B", textAlign: "center" }}>
            © {new Date().getFullYear()} Weera
          </p>
        </div>
      )}

      {/* ── Right: sign-in form ─────────────────────────────────── */}
      <div style={{
        flex: isMobile ? "1 1 auto" : "1 1 58%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "40px 24px" : "40px",
        boxSizing: "border-box",
        background: "#F8FAFC",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {isMobile && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <Logo size={40} />
            </div>
          )}

          <div style={{ marginBottom: 28, textAlign: isMobile ? "center" : "left" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: NAVY, letterSpacing: "-0.01em" }}>
              Welcome back
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: SLATE }}>
              Sign in to your admin account to continue.
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: "#fff",
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            padding: "32px 28px",
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
                    aria-label={showPass ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: 12, top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      cursor: "pointer", padding: 0, color: SLATE,
                    }}
                  >
                    {showPass ? (
                      <Ico icon={IconHide} size={iconSize.lg} />
                    ) : (
                      <Ico icon={IconView} size={iconSize.lg} />
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
                  "Sign in"
                )}
              </button>

            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 12.5, color: "#94A3B8" }}>
            Having trouble signing in? Contact your platform administrator.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes weera-spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #CBD5E1; }
      `}</style>
    </div>
  );
};
