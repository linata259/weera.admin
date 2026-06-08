import React, { useEffect, useState } from "react";
import { supabase } from "services/supabaseClient";
import { LoginPage } from "./LoginPage";

interface Props {
  children: React.ReactNode;
}

type AuthState = "loading" | "authenticated" | "unauthenticated";

export const AuthGuard: React.FC<Props> = ({ children }) => {
  const [state, setState] = useState<AuthState>("loading");

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
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
      setState("authenticated");
    } else {
      await supabase.auth.signOut();
      setState("unauthenticated");
    }
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") setState("unauthenticated");
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
      fontFamily: "'DM Sans', sans-serif",
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