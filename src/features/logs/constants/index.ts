// src/features/logs/constants/index.ts

// Derived from main.dart DSN:
// https://ca1fdf9272c12a6a64b3c1439620ffe5@o4511018683334656.ingest.us.sentry.io/4511018689167360
export const SENTRY_ORG     = "o4511018683334656";
export const SENTRY_PROJECT = "4511018689167360";
export const SENTRY_BASE    = "https://sentry.io/api/0";

export const LEVEL_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  fatal:   { bg: "bg-red-950",    text: "text-red-300",    dot: "bg-red-500"    },
  error:   { bg: "bg-orange-950", text: "text-orange-300", dot: "bg-orange-500" },
  warning: { bg: "bg-yellow-950", text: "text-yellow-300", dot: "bg-yellow-400" },
  info:    { bg: "bg-blue-950",   text: "text-blue-300",   dot: "bg-blue-400"   },
  debug:   { bg: "bg-slate-800",  text: "text-slate-400",  dot: "bg-slate-500"  },
};

export const STATUS_STYLES: Record<string, string> = {
  unresolved: "text-red-400 bg-red-950 border border-red-800",
  resolved:   "text-green-400 bg-green-950 border border-green-800",
  ignored:    "text-slate-400 bg-slate-800 border border-slate-600",
};

export const PERIOD_OPTIONS = [
  { value: "1h",  label: "Last 1 hour"  },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d",  label: "Last 7 days"  },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
] as const;