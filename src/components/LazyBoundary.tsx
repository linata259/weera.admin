import React, { Suspense } from "react";

/* ─── Lazy boundaries ─────────────────────────────────────────────────────────
 *
 * Routes were already split, but a route chunk still carried everything the
 * page *could* show: all four role dashboards, every tab of a tabbed page, the
 * charting library, the PDF engine. Splitting again at these boundaries means
 * a page downloads the part you are looking at and fetches the rest when you
 * ask for it.
 *
 * The fallbacks matter as much as the split. A chart that vanishes and
 * reappears reads as a bug; a box of the right size that fills in reads as
 * loading.
 */

const pulse = `@keyframes weera-lazy-pulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }`;

export const ChartSkeleton: React.FC<{ height?: number; label?: string }> = ({
  height = 260,
  label,
}) => (
  <div
    style={{
      width: "100%",
      height,
      borderRadius: 12,
      background: "#F1F5F9",
      animation: "weera-lazy-pulse 1.2s ease-in-out infinite",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#94A3B8",
      fontSize: 13,
    }}
  >
    <style>{pulse}</style>
    {label}
  </div>
);

export const BlockSkeleton: React.FC<{ minHeight?: number }> = ({
  minHeight = 320,
}) => (
  <div
    style={{
      minHeight,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: 4,
    }}
  >
    <style>{pulse}</style>
    {[100, 92, 84].map((w, i) => (
      <div
        key={i}
        style={{
          height: i === 0 ? 84 : 56,
          width: `${w}%`,
          borderRadius: 12,
          background: "#F1F5F9",
          animation: "weera-lazy-pulse 1.2s ease-in-out infinite",
        }}
      />
    ))}
  </div>
);

export const Spinner: React.FC<{ padding?: number }> = ({ padding = 64 }) => (
  <div style={{ display: "flex", justifyContent: "center", padding }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: "3px solid #E2E8F0",
        borderTopColor: "#EA580C",
        animation: "weera-lazy-spin 0.7s linear infinite",
      }}
    />
    <style>{`@keyframes weera-lazy-spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);

/** Wrap a lazily-imported subtree. `fallback` defaults to a block skeleton. */
export const LazyBoundary: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <Suspense fallback={fallback ?? <BlockSkeleton />}>{children}</Suspense>
);

/** Convenience wrapper for a single chart. */
export const LazyChart: React.FC<{
  children: React.ReactNode;
  height?: number;
}> = ({ children, height }) => (
  <Suspense fallback={<ChartSkeleton height={height} />}>{children}</Suspense>
);

export default LazyBoundary;
