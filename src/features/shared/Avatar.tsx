import React from "react";

export const Avatar: React.FC<{ src?: string | null; name: string; size?: number }> = ({
  src, name, size = 36,
}) => {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return src ? (
    <img
      src={src} alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #F1F5F9", flexShrink: 0 }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#E2E8F0",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#64748B", flexShrink: 0,
    }}>
      {initials || "?"}
    </div>
  );
};