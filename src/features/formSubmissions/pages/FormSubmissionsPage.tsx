import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchFormSubmissions,
  FormSubmission,
} from "../api/formSubmissionsService";
// import { PageHeader } from "../../../components/PageHeader";
import {
  Ico,
  IconClose,
  IconFormSubmissions,
  IconPageNext,
  IconPagePrev,
  // IconRefreshAction,
  IconSearchControl,
  iconSize,
} from "../../../components/icons";
import { color, font, radius, shadow, space } from "../../../theme/tokens";
import { useIsMobile } from "../../../hooks/useIsMobile";

const PAGE_SIZE = 20;
const HIDDEN_KEYS = new Set(["id", "user_id", "updated_at"]);
const DATE_KEYS = ["created_at", "submitted_at", "inserted_at"];
const PREVIEW_GROUPS = [
  ["full_name", "name", "first_name", "fullname"],
  ["email", "email_address"],
  ["phone", "phone_number", "mobile"],
  ["subject", "form_type", "type", "category", "topic", "source"],
  ["message", "body", "description", "comments", "details"],
];

const css = `
.fs-row { cursor:pointer; transition:background .12s; }
.fs-row:hover { background:${color.surfaceAlt}; }
.fs-row.active { background:${color.primarySoft}; }
.fs-input { height:38px; padding:0 12px 0 34px; border-radius:${radius.md}px; border:1px solid ${color.border};
  font-size:13px; outline:none; font-family:inherit; color:${color.text}; width:100%; box-sizing:border-box; background:#fff; }
.fs-input:focus { border-color:${color.primary}; box-shadow:0 0 0 3px rgba(234,88,12,0.10); }
.fs-btn { height:38px; padding:0 14px; border-radius:${radius.md}px; border:1px solid ${color.border}; background:#fff;
  color:${color.text}; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-family:inherit; }
.fs-btn:hover:not(:disabled) { border-color:${color.primary}; color:${color.primary}; }
.fs-btn:disabled { opacity:.5; cursor:default; }
@keyframes fsSpin { to { transform: rotate(360deg) } }
`;

const labelize = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const isIsoDate = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);

const formatDate = (v: unknown) => {
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toText = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "-";
  if (isIsoDate(v)) return formatDate(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const FieldValue: React.FC<{ k: string; v: unknown }> = ({ k, v }) => {
  if (v === null || v === undefined || v === "")
    return <span style={{ color: color.textFaint }}>-</span>;
  const key = k.toLowerCase();
  if (typeof v === "string" && key.includes("email"))
    return <a href={`mailto:${v}`} style={{ color: color.primary }}>{v}</a>;
  if (typeof v === "string" && (key.includes("phone") || key.includes("mobile")))
    return <a href={`tel:${v}`} style={{ color: color.primary }}>{v}</a>;
  if (typeof v === "string" && /^https?:\/\//.test(v))
    return (
      <a href={v} target="_blank" rel="noreferrer" style={{ color: color.primary, wordBreak: "break-all" }}>
        {v}
      </a>
    );
  if (typeof v === "object")
    return (
      <pre style={{
        margin: 0, padding: space.sm, background: color.surfaceAlt, borderRadius: radius.sm,
        fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{toText(v)}</span>;
};

function DetailPanel({
  row,
  dateKey,
  onClose,
  isMobile,
}: {
  row: FormSubmission;
  dateKey: string | null;
  onClose: () => void;
  isMobile: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const entries = Object.entries(row).filter(([k]) => k !== "id");

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 200 }}
      />
      <aside
        role="dialog"
        aria-label="Submission details"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: isMobile ? "100%" : 460, background: color.surface,
          boxShadow: shadow.overlay, zIndex: 201, display: "flex", flexDirection: "column",
          fontFamily: font.family,
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: space.md,
          padding: `${space.lg}px ${space.xl}px`, borderBottom: `1px solid ${color.border}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...font.sectionTitle, color: color.text }}>Submission details</div>
            <div style={{ ...font.caption, color: color.textMuted, marginTop: 2 }}>
              {row.id !== undefined ? `#${row.id}` : ""}
              {dateKey && row[dateKey] ? ` · ${formatDate(row[dateKey])}` : ""}
            </div>
          </div>
          <button className="fs-btn" onClick={onClose} aria-label="Close" style={{ width: 38, padding: 0, justifyContent: "center" }}>
            <Ico icon={IconClose} size={iconSize.md} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: `${space.md}px ${space.xl}px ${space.xl}px` }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ padding: `${space.md}px 0`, borderBottom: `1px solid ${color.divider}` }}>
              <div style={{ ...font.cardLabel, color: color.textFaint, marginBottom: 4 }}>{labelize(k)}</div>
              <div style={{ ...font.body, color: color.text }}>
                <FieldValue k={k} v={v} />
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

export default function FormSubmissionsPage() {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FormSubmission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchFormSubmissions());
    } catch (e: any) {
      console.error("Supabase (form_submissions):", e);
      setError(e?.message ?? "Failed to load form submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const keys = useMemo(() => {
    const set = new Set<string>();
    rows.slice(0, 50).forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [rows]);

  const dateKey = useMemo(() => DATE_KEYS.find((k) => keys.includes(k)) ?? null, [keys]);

  const columns = useMemo(() => {
    const picked: string[] = [];
    PREVIEW_GROUPS.forEach((group) => {
      const hit = group.find((k) => keys.includes(k));
      if (hit) picked.push(hit);
    });
    if (picked.length < 3) {
      keys
        .filter((k) => !HIDDEN_KEYS.has(k) && !DATE_KEYS.includes(k) && !picked.includes(k))
        .slice(0, 4 - picked.length)
        .forEach((k) => picked.push(k));
    }
    return isMobile ? picked.slice(0, 2) : picked;
  }, [keys, isMobile]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) =>
        v !== null && v !== undefined &&
        (typeof v === "object" ? JSON.stringify(v) : String(v)).toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

  useEffect(() => setPage(1), [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rowKey = (r: FormSubmission, i: number) => String(r.id ?? `${page}-${i}`);

  const thStyle: React.CSSProperties = {
    ...font.cardLabel, color: color.textMuted, textAlign: "left",
    padding: `${space.md}px ${space.lg}px`, background: color.surfaceAlt,
    borderBottom: `1px solid ${color.border}`, whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    ...font.small, color: color.text, padding: `${space.md}px ${space.lg}px`,
    borderBottom: `1px solid ${color.divider}`, maxWidth: 280,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  };

  return (
    <div style={{ fontFamily: font.family }}>
      <style>{css}</style>
      {/* <PageHeader
        title="Form Submissions"
        subtitle="Review what people have sent through the Weera forms."
        icon={IconFormSubmissions}
        actions={
          <button className="fs-btn" onClick={load} disabled={loading}>
            <Ico
              icon={IconRefreshAction}
              size={iconSize.md}
              style={loading ? { animation: "fsSpin 0.8s linear infinite" } : undefined}
            />
            Refresh
          </button>
        }
      /> */}

      <div style={{
        background: color.surface, border: `1px solid ${color.borderSoft}`,
        borderRadius: radius.lg, boxShadow: shadow.card, overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: space.md, flexWrap: "wrap",
          padding: space.lg, borderBottom: `1px solid ${color.border}`,
        }}>
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
            <span style={{ position: "absolute", left: 11, top: 11, color: color.textFaint }}>
              <Ico icon={IconSearchControl} size={iconSize.md} />
            </span>
            <input
              className="fs-input"
              placeholder="Search submissions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span style={{ ...font.caption, color: color.textMuted, marginLeft: "auto" }}>
            {filtered.length} {filtered.length === 1 ? "submission" : "submissions"}
          </span>
        </div>

        {error ? (
          <div style={{ padding: space.xxl, textAlign: "center", color: color.danger, ...font.small }}>
            {error}
          </div>
        ) : loading && rows.length === 0 ? (
          <div style={{ padding: space.xxl, display: "flex", justifyContent: "center" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", border: `3px solid ${color.border}`,
              borderTopColor: color.primary, animation: "fsSpin 0.7s linear infinite",
            }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: space.xxl, textAlign: "center", color: color.textMuted }}>
            <Ico icon={IconFormSubmissions} size={32} color={color.textFaint} />
            <div style={{ ...font.bodyStrong, color: color.text, marginTop: space.sm }}>
              {query ? "No matching submissions" : "No submissions yet"}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} style={thStyle}>{labelize(c)}</th>
                  ))}
                  {dateKey && <th style={thStyle}>Submitted</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr
                    key={rowKey(r, i)}
                    className={`fs-row${selected === r ? " active" : ""}`}
                    onClick={() => setSelected(r)}
                  >
                    {columns.map((c, ci) => (
                      <td
                        key={c}
                        title={toText(r[c])}
                        style={{ ...tdStyle, fontWeight: ci === 0 ? 600 : 400 }}
                      >
                        {toText(r[c])}
                      </td>
                    ))}
                    {dateKey && (
                      <td style={{ ...tdStyle, color: color.textMuted }}>{formatDate(r[dateKey])}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && filtered.length > PAGE_SIZE && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: space.sm,
            padding: `${space.md}px ${space.lg}px`, borderTop: `1px solid ${color.border}`,
          }}>
            <span style={{ ...font.caption, color: color.textMuted, marginRight: space.sm }}>
              Page {page} of {totalPages}
            </span>
            <button className="fs-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <Ico icon={IconPagePrev} size={iconSize.md} />
            </button>
            <button className="fs-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <Ico icon={IconPageNext} size={iconSize.md} />
            </button>
          </div>
        )}
      </div>

      {selected && (
        <DetailPanel
          row={selected}
          dateKey={dateKey}
          onClose={() => setSelected(null)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
