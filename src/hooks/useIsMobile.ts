import { useEffect, useState } from "react";

/**
 * Single source of truth for the mobile breakpoint.
 *
 * Five components had their own copy of this effect, each with the same
 * 768px literal inline. Changing the breakpoint meant finding all five.
 */
export const MOBILE_BREAKPOINT = 768;

/** matchMedia is missing in jsdom and in any non-browser render, and reading it
 *  unguarded turns a layout preference into a crash. Absent means "not mobile". */
function query(breakpoint: number): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(`(max-width: ${breakpoint}px)`);
}

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(
    () => query(breakpoint)?.matches ?? false,
  );

  useEffect(() => {
    const mq = query(breakpoint);
    if (!mq) return;
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
