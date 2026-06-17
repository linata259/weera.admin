// src/features/logs/components/IssueDrawer/DrawerMetaStrip.tsx

import { SentryIssue } from "../types";
import { fmtCount, relativeTime } from "../utils";



interface Props {
  issue: SentryIssue;
}

export function DrawerMetaStrip({ issue }: Props) {
  return (
    <div className="flex gap-6 px-5 py-3 border-b border-[#30363d] text-xs text-[#8b949e]">
      <span>Events: <strong className="text-white">{fmtCount(issue.count)}</strong></span>
      <span>Users:  <strong className="text-white">{issue.userCount}</strong></span>
      <span>First:  <strong className="text-white">{relativeTime(issue.firstSeen)}</strong></span>
      <span>Last:   <strong className="text-white">{relativeTime(issue.lastSeen)}</strong></span>
      <a
        href={issue.permalink}
        target="_blank"
        rel="noreferrer"
        className="ml-auto text-[#6c5ce7] hover:underline"
      >
        Open in Sentry ↗
      </a>
    </div>
  );
}