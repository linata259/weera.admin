/* ─── Design tokens ───────────────────────────────────────────────────────────
 *
 * Every screen in this app defined its own `const ORANGE = "#EA580C"` at the
 * top of the file — and they had drifted: three greys for the same border,
 * two navies for the same heading, card radii of 12, 14 and 16 side by side.
 * One definition each, here, so "consistent" is something the code enforces
 * rather than something each file remembers to do.
 */

export const color = {
  /* Brand */
  primary: "#EA580C",
  primarySoft: "#FFF7ED",
  primaryBorder: "#FED7AA",

  /* Text */
  text: "#0F172A", // headings, primary values
  textMuted: "#64748B", // labels, secondary copy
  textFaint: "#94A3B8", // captions, placeholders, disabled
  textOnDark: "#FFFFFF",

  /* Surfaces */
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC", // page background, table headers, toolbars
  border: "#E2E8F0", // component borders
  borderSoft: "#EEF2F6", // card outlines, hairlines
  divider: "#F1F5F9", // row separators

  /* Status — value colour and its tint, always used as a pair */
  success: "#16A34A",
  successBg: "#DCFCE7",
  warning: "#CA8A04",
  warningBg: "#FEF9C3",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  info: "#2563EB",
  infoBg: "#DBEAFE",
  accent: "#7C3AED",
  accentBg: "#EDE9FE",
  neutral: "#64748B",
  neutralBg: "#F1F5F9",
} as const;

/** Chart series colours, in the order a chart should consume them. */
export const chartColor = [
  color.primary,
  color.text,
  color.info,
  color.accent,
  color.success,
  color.textMuted,
] as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const font = {
  family: "'Inter','Helvetica Neue',sans-serif",
  /* One scale, named by role rather than by size, so a heading stays a
   * heading when the number changes. */
  pageTitle: { fontSize: 20, fontWeight: 700, letterSpacing: -0.2 },
  sectionTitle: { fontSize: 15, fontWeight: 700, letterSpacing: -0.1 },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  statValue: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 },
  body: { fontSize: 14, fontWeight: 400 },
  bodyStrong: { fontSize: 14, fontWeight: 600 },
  small: { fontSize: 13, fontWeight: 400 },
  caption: { fontSize: 12, fontWeight: 400 },
} as const;

export const shadow = {
  card: "0 1px 3px rgba(15,23,42,0.05)",
  raised: "0 4px 16px rgba(15,23,42,0.08)",
  overlay: "0 20px 48px rgba(15,23,42,0.18)",
} as const;

/** Icon sizes. Tabler renders on a 24px grid; these are the four we use. */
export const iconSize = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
} as const;

/** Default stroke for Tabler icons — 1.75 reads better at 14–18px than the
 *  library default of 2, which looks heavy next to 13px label text. */
export const ICON_STROKE = 1.75;

export const breakpoint = {
  mobile: 768,
  tablet: 1024,
} as const;
