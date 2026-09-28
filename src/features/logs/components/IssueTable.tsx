// src/features/logs/components/IssueTable.tsx


import { Ico, IconLoading, IconLogs, iconSize } from "../../../components/icons";
import type { SentryIssue } from "../types";
import { IssueRow } from "./IssueRow";

interface Props {
  issues: SentryIssue[];
  loading: boolean;
  hasMore: boolean;
  search: string;
  onSelect: (issue: SentryIssue) => void;
  onLoadMore: () => void;
}

export function IssueTable({ issues, loading, hasMore, search, onSelect, onLoadMore }: Props) {
  // ── Empty / loading states ──────────────────────────────────────────────────
  if (loading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8b949e]">
        <span className="animate-spin inline-flex">
          <Ico icon={IconLoading} size={iconSize.lg} />
        </span>
        Fetching issues from Sentry…
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        {/* Empty-state illustration — deliberately larger than the icon scale. */}
        <span className="text-[#30363d] mb-3 inline-flex">
          <Ico icon={IconLogs} size={48} />
        </span>
        <p className="text-[#8b949e] text-sm">No issues found</p>
        <p className="text-[#6e7681] text-xs mt-1">
          {search ? "Try a different search term" : "Your app looks healthy for this period"}
        </p>
      </div>
    );
  }

  // ── Table ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#30363d] text-[#8b949e] text-xs uppercase tracking-wider">
        <span>Level</span>
        <span>Issue</span>
        <span className="text-right">Events</span>
        <span className="text-right">Users</span>
        <span className="text-right">Last Seen</span>
        <span>Status</span>
      </div>

      {/* Issue rows */}
      <div className="divide-y divide-[#21262d]">
        {issues.map((issue) => (
          <IssueRow key={issue.id} issue={issue} onClick={onSelect} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="border-t border-[#30363d] p-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-[#6c5ce7] hover:text-white text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more issues"}
          </button>
        </div>
      )}
    </div>
  );
}