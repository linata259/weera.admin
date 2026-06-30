// src/features/logs/components/StatsBar.tsx

import { fmtCount } from "../utils";
import type { SentryIssue } from "../types";

interface Props {
  issues: SentryIssue[];
}

export function StatsBar({ issues }: Props) {
  const total       = issues.length;
  const fatal       = issues.filter((i) => i.level === "fatal").length;
  const errors      = issues.filter((i) => i.level === "error").length;
  const unresolved  = issues.filter((i) => i.status === "unresolved").length;
  const totalEvents = issues.reduce((acc, i) => acc + parseInt(i.count, 10), 0);

  const stats = [
    { label: "Total Issues",  value: total,              accent: "text-white"       },
    { label: "Unresolved",    value: unresolved,         accent: "text-red-400"     },
    { label: "Fatal",         value: fatal,              accent: "text-red-300"     },
    { label: "Errors",        value: errors,             accent: "text-orange-400"  },
    { label: "Total Events",  value: fmtCount(totalEvents), accent: "text-[#6c5ce7]" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-4">
          <p className={`text-2xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
          <p className="text-[#8b949e] text-xs mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}