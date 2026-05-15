import React, { useState } from "react";

export const IconBtn: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({
  title, onClick, children,
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: 32, height: 32, border: "1.5px solid #E2E8F0", borderRadius: "50%",
        background: hovered ? "#F8FAFC" : "#fff", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s", padding: 0,
      }}
    >
      {children}
    </button>
  );
};