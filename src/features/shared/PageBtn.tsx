import React from "react";

export const PageBtn: React.FC<{
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, active = false, disabled = false, onClick }) => (
  <button
    onClick={onClick} disabled={disabled}
    style={{
      minWidth: 34, height: 34, borderRadius: 8,
      border: active ? "none" : "1px solid #E2E8F0",
      background: active ? "#EA580C" : disabled ? "#F8FAFC" : "#fff",
      color: active ? "#fff" : disabled ? "#CBD5E1" : "#334155",
      fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
      padding: "0 8px", transition: "background 0.15s",
    }}
  >
    {label}
  </button>
);