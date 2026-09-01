// Lightweight localStorage cache for dashboard data.
//
// Pattern: a hook/page reads the last-cached value synchronously on mount
// (so the UI can render instantly instead of a loading skeleton), then
// fetches fresh data in the background and overwrites both state and the
// cache once it arrives. This avoids the "loading again" flash when a
// user switches back to the tab and the page remounts.

const PREFIX = "weera_admin_cache::";

export function readDashboardCache<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeDashboardCache<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage unavailable or full — caching is a nice-to-have, so
    // silently skip rather than breaking the page.
  }
}
