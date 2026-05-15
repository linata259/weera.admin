import React from "react";

export const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{
      fontSize: 11, fontWeight: 600, color: "#94A3B8",
      textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 3,
    }}>
      {label}
    </div>
    <div style={{ fontSize: 14, color: value ? "#0F172A" : "#CBD5E1" }}>
      {value || "—"}
    </div>
  </div>
);