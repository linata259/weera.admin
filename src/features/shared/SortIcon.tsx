import React from "react";

export const SortIcon: React.FC<{ active: boolean; direction?: "asc" | "desc" }> = ({ active, direction }) => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 2v9M6.5 2L4 5M6.5 2L9 5"
      stroke={active && direction === "asc" ? "#EA580C" : "#CBD5E1"}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 11L4 8M6.5 11L9 8"
      stroke={active && direction === "desc" ? "#EA580C" : "#CBD5E1"}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);