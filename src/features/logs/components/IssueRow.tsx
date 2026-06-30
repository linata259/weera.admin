// src/features/logs/components/IssueRow.tsx

import { LEVEL_STYLES, STATUS_STYLES } from "../constants";
import { relativeTime, fmtCount } from "../utils";
import type { SentryIssue } from "../types";

interface Props {
  issue: SentryIssue;
  onClick: (issue: SentryIssue) => void;
}

export function IssueRow({ issue, onClick }: Props) {
  const lvl = LEVEL_STYLES[issue.level] ?? LEVEL_STYLES.error;

  return (
    <button
      onClick={() => onClick(issue)}
      className="w-full grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-4 text-left hover:bg-[#21262d] transition-colors items-start"
    >
      {/* Level dot */}
      <div className="flex items-center justify-center w-6 pt-0.5">
        <span className={`w-2 h-2 rounded-full ${lvl.dot}`} />
      </div>

      {/* Title + culprit + metadata */}
      <div className="min-w-0">
        <p className="text-[#c9d1d9] text-sm font-medium leading-snug line-clamp-2">
          {issue.title}
        </p>
        {issue.culprit && (
          <p className="text-[#6e7681] text-xs font-mono mt-0.5 truncate">{issue.culprit}</p>
        )}
        {issue.metadata?.value && (
          <p className="text-[#8b949e] text-xs mt-0.5 line-clamp-1">{issue.metadata.value}</p>
        )}
      </div>

      {/* Event count */}
      <div className="text-right">
        <span className="text-white text-sm font-semibold tabular-nums">{fmtCount(issue.count)}</span>
      </div>

      {/* User count */}
      <div className="text-right">
        <span className="text-[#8b949e] text-sm tabular-nums">{issue.userCount}</span>
      </div>

      {/* Last seen */}
      <div className="text-right">
        <span className="text-[#8b949e] text-xs whitespace-nowrap">{relativeTime(issue.lastSeen)}</span>
      </div>

      {/* Status badge */}
      <div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_STYLES[issue.status]}`}>
          {issue.status}
        </span>
      </div>
    </button>
  );
}