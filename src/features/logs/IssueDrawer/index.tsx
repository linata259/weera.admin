// src/features/logs/components/IssueDrawer/index.tsx

import { useState, useEffect } from "react";
import { SentryEvent, SentryIssue } from "../types";
import { SENTRY_BASE, SENTRY_ORG } from "../constants";
import { DrawerHeader } from "./DrawerHeader";
import { DrawerMetaStrip } from "./DrawerMetaStrip";
import { UserBlock } from "./UserBlock";
import { ExceptionBlock } from "./ExceptionBlock";
import { EnvironmentBlock } from "./EnvironmentBlock";
import { BreadcrumbsBlock } from "./BreadcrumbsBlock";
import { TagsBlock } from "./TagsBlock";


interface Props {
  issue: SentryIssue;
  token: string;
  onClose: () => void;
}

export function IssueDrawer({ issue, token, onClose }: Props) {
  const [event, setEvent]   = useState<SentryEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);

  // Fetch the latest event for this issue
  useEffect(() => {
    setLoading(true);
    setErr(null);
    setEvent(null);

    fetch(
      `${SENTRY_BASE}/organizations/${SENTRY_ORG}/issues/${issue.id}/events/latest/`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d: SentryEvent) => { setEvent(d); setLoading(false); })
      .catch((e: Error)      => { setErr(e.message); setLoading(false); });
  }, [issue.id, token]);

  const exceptions  = event?.entries?.find((e) => e.type === "exception")?.data?.values  ?? [];
  const breadcrumbs = event?.entries?.find((e) => e.type === "breadcrumbs")?.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Side panel */}
      <div className="w-full max-w-2xl bg-[#0d1117] border-l border-[#30363d] flex flex-col overflow-hidden">
        <DrawerHeader issue={issue} onClose={onClose} />
        <DrawerMetaStrip issue={issue} />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-2 text-[#8b949e] text-sm">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Loading latest event…
            </div>
          )}

          {/* Error state */}
          {err && (
            <div className="bg-red-950 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
              {err}
            </div>
          )}

          {/* Content blocks — only render once event is loaded */}
          {event && (
            <>
              <ExceptionBlock   exceptions={exceptions} />
              <UserBlock        user={event.user} />
              <EnvironmentBlock event={event} />
              <BreadcrumbsBlock breadcrumbs={breadcrumbs} />
              <TagsBlock        tags={event.tags} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}