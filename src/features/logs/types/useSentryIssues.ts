// src/features/logs/hooks/useSentryIssues.ts

import { useState, useEffect, useCallback } from "react";
import { SENTRY_BASE, SENTRY_ORG, SENTRY_PROJECT } from "../constants";
import type { SentryIssue, StatusFilter, LevelFilter } from "../types";

interface UseSentryIssuesOptions {
  token: string;
  period: string;
  statusFilter: StatusFilter;
  levelFilter: LevelFilter;
}

interface UseSentryIssuesReturn {
  issues: SentryIssue[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  lastRefresh: Date | null;
  refresh: () => void;
  loadMore: () => void;
}

export function useSentryIssues({
  token,
  period,
  statusFilter,
  levelFilter,
}: UseSentryIssuesOptions): UseSentryIssuesReturn {
  const [issues, setIssues]           = useState<SentryIssue[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [cursor, setCursor]           = useState<string | null>(null);
  const [hasMore, setHasMore]         = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchIssues = useCallback(
    async (nextCursor?: string, append = false) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        statsPeriod: period,
        limit: "25",
        query: statusFilter ? `is:${statusFilter}` : "is:unresolved",
        ...(levelFilter ? { level: levelFilter } : {}),
        ...(nextCursor   ? { cursor: nextCursor }  : {}),
      });

      try {
        const res = await fetch(
          `${SENTRY_BASE}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? `${res.status} ${res.statusText}`);
        }

        const data: SentryIssue[] = await res.json();

        // Parse cursor-based pagination from Link header
        const link      = res.headers.get("Link") ?? "";
        const nextMatch = link.match(/cursor="([^"]+)"[^>]*>;\s*rel="next"[^,]*results="true"/);
        if (nextMatch) {
          setCursor(nextMatch[1]);
          setHasMore(true);
        } else {
          setCursor(null);
          setHasMore(false);
        }

        setIssues((prev) => (append ? [...prev, ...data] : data));
        setLastRefresh(new Date());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [token, period, statusFilter, levelFilter]
  );

  // Re-fetch whenever filters or token change
  useEffect(() => {
    setCursor(null);
    setHasMore(false);
    fetchIssues();
  }, [fetchIssues]);

  const refresh  = useCallback(() => { setCursor(null); fetchIssues(); }, [fetchIssues]);
  const loadMore = useCallback(() => { if (cursor) fetchIssues(cursor, true); }, [cursor, fetchIssues]);

  return { issues, loading, error, hasMore, lastRefresh, refresh, loadMore };
}