import React, { useEffect, useState } from "react";
import { supabase } from "services/supabaseClient";
import { LoginPage } from "./LoginPage";

interface Props {
  children: React.ReactNode;
}

type AuthState = "loading" | "authenticated" | "unauthenticated";

// Remembers "this browser was a verified admin" so a remount — e.g. the
// browser discarding a background tab and reloading it when the admin
// switches back — can skip straight to the app instead of blocking behind
// a full-page spinner while checkSession() re-does the round trip. The
// session itself is still re-verified in the background on every mount;
// this only changes what's shown while that happens.
const VERIFIED_KEY = "weera_admin_verified";

export const AuthGuard: React.FC<Props> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => (
    (typeof window !== "undefined" && window.localStorage.getItem(VERIFIED_KEY) === "1")
      ? "authenticated"
      : "loading"
  ));

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.localStorage.removeItem(VERIFIED_KEY);
      setState("unauthenticated");
      return;
    }

    /* verify admin role */
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role === "admin") {
      window.localStorage.setItem(VERIFIED_KEY, "1");
      setState("authenticated");
    } else {
      window.localStorage.removeItem(VERIFIED_KEY);
      await supabase.auth.signOut();
      setState("unauthenticated");
    }
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          window.localStorage.removeItem(VERIFIED_KEY);
          setState("unauthenticated");
        }
        if (event === "SIGNED_IN")  checkSession();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (state === "loading") return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      color: "#64748B",
      fontSize: 14,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 32, height: 32,
          border: "3px solid #E2E8F0",
          borderTop: "3px solid #EA580C",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 12px",
        }} />
        Loading…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (state === "unauthenticated") {
    return <LoginPage onLogin={() => setState("authenticated")} />;
  }

  return <>{children}</>;
};