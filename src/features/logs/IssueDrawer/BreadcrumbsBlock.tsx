// src/features/logs/components/IssueDrawer/BreadcrumbsBlock.tsx

import { SentryBreadcrumb } from "../types";
import { relativeTime } from "../utils";



interface Props {
  breadcrumbs: SentryBreadcrumb[];
}

export function BreadcrumbsBlock({ breadcrumbs }: Props) {
  if (breadcrumbs.length === 0) return null;

  return (
    <div>
      <h3 className="text-[#8b949e] text-xs uppercase tracking-widest mb-2">
        Breadcrumbs ({breadcrumbs.length})
      </h3>
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg divide-y divide-[#21262d] max-h-72 overflow-y-auto">
        {breadcrumbs.map((bc, i) => (
          <div key={i} className="flex gap-3 px-4 py-2 text-xs">
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                bc.level === "error"
                  ? "bg-red-950 text-red-400"
                  : bc.level === "warning"
                  ? "bg-yellow-950 text-yellow-400"
                  : "bg-[#0d1117] text-[#8b949e]"
              }`}
            >
              {bc.category}
            </span>
            <span className="text-[#c9d1d9] flex-1 break-all">{bc.message}</span>
            <span className="text-[#484f58] shrink-0">{relativeTime(bc.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}