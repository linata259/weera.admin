// src/features/logs/types/index.ts

export interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  status: "unresolved" | "resolved" | "ignored";
  level: "fatal" | "error" | "warning" | "info" | "debug";
  /** Event count comes back as a string from the Sentry API */
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  isBookmarked: boolean;
  permalink: string;
  metadata: {
    value?: string;
    type?: string;
    filename?: string;
    function?: string;
  };
  tags: { key: string; name: string }[];
}

export interface StackFrame {
  filename: string;
  function: string;
  lineNo: number;
  colNo: number;
  absPath: string;
  context: [number, string][];
  inApp: boolean;
}

export interface SentryException {
  type: string;
  value: string;
  stacktrace?: {
    frames: StackFrame[];
  };
}

export interface SentryBreadcrumb {
  category: string;
  message: string;
  timestamp: string;
  level: string;
}

export interface SentryEvent {
  id: string;
  eventID: string;
  message: string;
  dateCreated: string;
  tags: { key: string; value: string }[];
  entries: Array<{
    type: string;
    data: {
      values?: SentryException[];
      items?: SentryBreadcrumb[];
    };
  }>;
  user?: { email?: string; id?: string; username?: string };
  contexts?: {
    device?: Record<string, string>;
    os?: Record<string, string>;
  };
  sdk?: { name: string; version: string };
}

export type StatusFilter = "" | "unresolved" | "resolved" | "ignored";
export type LevelFilter  = "" | "fatal" | "error" | "warning" | "info";
export type PeriodOption = "1h" | "24h" | "7d" | "14d" | "30d";