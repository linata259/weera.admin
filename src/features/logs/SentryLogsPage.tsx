// src/features/logs/SentryLogsPage.tsx

import { useState } from "react";
import { LevelFilter, SentryIssue, StatusFilter } from "./types";
import { useSentryIssues } from "./types/useSentryIssues";
import { StatsBar } from "./components/StatsBar";
import { IssueFilters } from "./components/IssueFilters";
import { PageHeader } from "./components/PageHeader";
import { TokenGate } from "./components/TokenGate";
import { ErrorBanner } from "./components/ErrorBanner";
import { IssueTable } from "./components/IssueTable";
import { IssueDrawer } from "./IssueDrawer";



export default function SentryLogsPage() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(null);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [period,       setPeriod]       = useState("14d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [levelFilter,  setLevelFilter]  = useState<LevelFilter>("");
  const [search,       setSearch]       = useState("");

  // ── Drawer state ───────────────────────────────────────────────────────────
  const [selectedIssue, setSelectedIssue] = useState<SentryIssue | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { issues, loading, error, hasMore, lastRefresh, refresh, loadMore } =
    useSentryIssues({
      token:        token ?? "",
      period,
      statusFilter,
      levelFilter,
    });

  // Client-side search filter (title + culprit)
  const filtered = issues.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      i.culprit?.toLowerCase().includes(q)
    );
  });

  // ── Token gate ─────────────────────────────────────────────────────────────
  if (!token) return <TokenGate onToken={setToken} />;

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <PageHeader
        period={period}
        loading={loading}
        lastRefresh={lastRefresh}
        onPeriodChange={setPeriod}
        onRefresh={refresh}
        onDisconnect={() => { setToken(null); }}
      />

      {issues.length > 0 && <StatsBar issues={issues} />}

      <IssueFilters
        search={search}
        statusFilter={statusFilter}
        levelFilter={levelFilter}
        resultCount={filtered.length}
        onSearch={setSearch}
        onStatusChange={setStatusFilter}
        onLevelChange={setLevelFilter}
      />

      {error && <ErrorBanner message={error} />}

      <IssueTable
        issues={filtered}
        loading={loading}
        hasMore={hasMore}
        search={search}
        onSelect={setSelectedIssue}
        onLoadMore={loadMore}
      />

      {selectedIssue && (
        <IssueDrawer
          issue={selectedIssue}
          token={token}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}