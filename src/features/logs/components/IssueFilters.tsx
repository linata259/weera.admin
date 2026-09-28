// src/features/logs/components/IssueFilters.tsx

import { Ico, IconSearchControl, iconSize } from "../../../components/icons";
import type { StatusFilter, LevelFilter } from "../types";

interface Props {
  search: string;
  statusFilter: StatusFilter;
  levelFilter: LevelFilter;
  resultCount: number;
  onSearch: (v: string) => void;
  onStatusChange: (v: StatusFilter) => void;
  onLevelChange: (v: LevelFilter) => void;
}

export function IssueFilters({
  search,
  statusFilter,
  levelFilter,
  resultCount,
  onSearch,
  onStatusChange,
  onLevelChange,
}: Props) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58] inline-flex">
          <Ico icon={IconSearchControl} size={iconSize.md} />
        </span>
        <input
          type="text"
          placeholder="Search issues…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#6c5ce7]"
        />
      </div>

      {/* Status */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        className="bg-[#161b22] border border-[#30363d] text-[#c9d1d9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c5ce7]"
      >
        <option value="">All statuses</option>
        <option value="unresolved">Unresolved</option>
        <option value="resolved">Resolved</option>
        <option value="ignored">Ignored</option>
      </select>

      {/* Level */}
      <select
        value={levelFilter}
        onChange={(e) => onLevelChange(e.target.value as LevelFilter)}
        className="bg-[#161b22] border border-[#30363d] text-[#c9d1d9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c5ce7]"
      >
        <option value="">All levels</option>
        <option value="fatal">Fatal</option>
        <option value="error">Error</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
      </select>

      <span className="text-[#6e7681] text-xs ml-auto">
        {resultCount} issue{resultCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}