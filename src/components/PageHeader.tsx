import React, { useEffect } from "react";
import { useNavbar } from "../hooks/Navbarcontext";
import { TablerIcon } from "./icons";
import { color, font, space } from "../theme/tokens";

/* ─── Page header ─────────────────────────────────────────────────────────────
 *
 * Page titles were set inline on every screen and had drifted to three
 * different sizes — 20/700 on the roles pages, 22/800 on Jobs and Skills,
 * 28/800 on Help & Support — with different spacing under each. Navigating the
 * app, the title moved and changed weight from screen to screen.
 *
 * One header, one type scale, an actions slot on the right for whatever that
 * page needs to put there.
 */

export interface Crumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

export const PageHeader: React.FC<{
  title: string;
  /** Kept for call-site compatibility; no longer rendered. */
  subtitle?: string;
  icon?: TablerIcon;
  breadcrumbs?: Crumb[];
  /** Buttons, filters, exports — right-aligned, wraps under on narrow screens. */
  actions?: React.ReactNode;
  /** Rendered flush under the header, inside the same block (tab strips). */
  below?: React.ReactNode;
}> = ({ title, actions, below }) => {
  // The page title lives in the top navbar only.
  const { setBreadcrumb } = useNavbar();
  useEffect(() => {
    setBreadcrumb({ parent: "", current: title });
    return () => setBreadcrumb(null);
  }, [title, setBreadcrumb]);

  if (!actions && !below) return null;

  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space.md,
        fontFamily: font.family,
        marginBottom: space.lg,
      }}
    >
      {actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: space.sm,
            flexWrap: "wrap",
          }}
        >
          {actions}
        </div>
      )}
      {below}
    </header>
  );
};

/* ── Section heading ────────────────────────────────────────────────────────
 * The smaller title used inside a card or above a table. Same orange marker
 * the dashboard cards use, so a section reads the same everywhere.
 */
export const SectionTitle: React.FC<{
  title: string;
  hint?: string;
  actions?: React.ReactNode;
}> = ({ title, hint, actions }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: space.md,
      marginBottom: space.md,
      flexWrap: "wrap",
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 3,
            background: color.primary,
            flexShrink: 0,
          }}
        />
        <h2 style={{ margin: 0, ...font.sectionTitle, color: color.text }}>
          {title}
        </h2>
      </div>
      {hint && (
        <p
          style={{
            margin: `${space.xs}px 0 0 ${space.lg}px`,
            ...font.caption,
            color: color.textMuted,
          }}
        >
          {hint}
        </p>
      )}
    </div>
    {actions}
  </div>
);

export default PageHeader;
