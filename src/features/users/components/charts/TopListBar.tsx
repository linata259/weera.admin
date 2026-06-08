import React from "react";

const SLATE = "#64748B";
const NAVY = "#0F172A";
const BORDER = "#E2E8F0";

interface Props {
  items: { name: string; count: number }[];
  color: string;
}

export const TopListBar: React.FC<Props> = ({ items, color }) => {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 12,
              color: SLATE,
              width: 120,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.name}
          </span>

          <div
            style={{
              flex: 1,
              height: 6,
              background: BORDER,
              borderRadius: 99,
            }}
          >
            <div
              style={{
                width: `${(item.count / max) * 100}%`,
                height: "100%",
                background: color,
                borderRadius: 99,
                transition: "width 0.6s ease",
              }}
            />
          </div>

          <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
};