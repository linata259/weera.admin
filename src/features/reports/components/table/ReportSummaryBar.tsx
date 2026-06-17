import React from "react";

interface SummaryItem {
  label: string;
  value: string;
}

interface ReportSummaryBarProps {
  title: string;
  items: SummaryItem[];
  onExportCsv: () => void;
}

export const ReportSummaryBar: React.FC<ReportSummaryBarProps> = ({
  title,
  items,
  onExportCsv,
}) => (
  <div
    style={{
      background: "#F1F5F9",
      border: "1px solid #E8EDF2",
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}
  >
    <div style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, color: "#0F172A", fontSize: 18 }}>{title}</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        {items.map((item) => (
          <div key={item.label} style={{ fontSize: 13, color: "#475569" }}>
            <span>{item.label}: </span>
            <strong style={{ color: "#0F172A" }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#475569", fontSize: 13 }}>Export As:</span>
      <button
        type="button"
        onClick={onExportCsv}
        style={{
          height: 38,
          padding: "0 14px",
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          background: "#fff",
          color: "#0F172A",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        CSV
      </button>
      <button
        type="button"
        style={{
          height: 38,
          padding: "0 14px",
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          background: "#fff",
          color: "#0F172A",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Excel
      </button>
    </div>
  </div>
);
