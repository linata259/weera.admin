import React from "react";

export const PRIMARY = "#EA580C";
export const BORDER = "#E2E8F0";
export const TEXT = "#1E293B";
export const MUTED = "#64748B";

export const card: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 24,
};

export const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 12,
  fontWeight: 600,
  color: MUTED,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: "nowrap",
};

export const td: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: 13.5,
  color: TEXT,
  borderBottom: `1px solid #F1F5F9`,
  verticalAlign: "middle",
};

export const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  outline: "none",
  color: TEXT,
  background: "#fff",
  boxSizing: "border-box",
};

export const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: TEXT,
  marginBottom: 6,
};

export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ style, disabled, ...rest }) => (
  <button
    {...rest}
    disabled={disabled}
    style={{
      background: disabled ? "#FDBA8C" : PRIMARY,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 18px",
      fontSize: 14,
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      ...style,
    }}
  />
);

export const GhostButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ style, ...rest }) => (
  <button
    {...rest}
    style={{
      background: "#fff",
      color: TEXT,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: "10px 18px",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      ...style,
    }}
  />
);

export const RoleBadge: React.FC<{ name: string | null }> = ({ name }) => {
  if (!name) {
    return <span style={{ color: MUTED, fontSize: 13 }}>—</span>;
  }
  const system = name === "Super Admin" || name === "Admin";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: system ? "#FFF4EE" : "#F1F5F9",
        color: system ? PRIMARY : "#475569",
        border: `1px solid ${system ? "#FDBA8C" : BORDER}`,
      }}
    >
      {name}
    </span>
  );
};

export const Check: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <input
    type="checkbox"
    checked={checked}
    disabled={disabled}
    onChange={(e) => onChange(e.target.checked)}
    style={{
      width: 16,
      height: 16,
      accentColor: PRIMARY,
      cursor: disabled ? "not-allowed" : "pointer",
    }}
  />
);

export const ErrorNote: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div
      style={{
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        color: "#B91C1C",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        marginBottom: 16,
      }}
    >
      {message}
    </div>
  ) : null;

export const Spinner: React.FC = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: `3px solid ${BORDER}`,
        borderTopColor: PRIMARY,
        animation: "weera-rp-spin 0.7s linear infinite",
      }}
    />
    <style>{`@keyframes weera-rp-spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);
