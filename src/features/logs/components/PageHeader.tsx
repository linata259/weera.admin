// src/features/logs/components/PageHeader.tsx

import { relativeTime } from "../utils";
import { PERIOD_OPTIONS } from "../constants";

interface Props {
  period: string;
  loading: boolean;
  lastRefresh: Date | null;
  onPeriodChange: (p: string) => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export function PageHeader({
  period,
  loading,
  lastRefresh,
  onPeriodChange,
  onRefresh,
  onDisconnect,
}: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* Left: title */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#6c5ce7] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">Sentry Logs</h1>
          <span className="bg-[#161b22] border border-[#30363d] text-[#8b949e] text-xs px-2 py-0.5 rounded-full">
            Weera App
          </span>
        </div>
        {lastRefresh && (
          <p className="text-[#6e7681] text-xs mt-1">
            Last refreshed {relativeTime(lastRefresh.toISOString())}
          </p>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-3">
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] text-[#c9d1d9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#6c5ce7]"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[#c9d1d9] text-sm rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Refresh
        </button>

        <button
          onClick={onDisconnect}
          className="text-[#6e7681] hover:text-red-400 text-xs transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}