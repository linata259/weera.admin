import React, { useEffect, useState } from 'react';

// ── colour tokens ──────────────────────────────────────────────────────
export const ORANGE = '#EA580C';
export const NAVY   = '#0F172A';
export const SLATE  = '#64748B';
export const BORDER = '#E2E8F0';
export const SKY    = '#0EA5E9';
export const GREEN  = '#16A34A';
export const AMBER  = '#B45309';
export const PURPLE = '#7C3AED';
export const RED    = '#DC2626';

// ── types ──────────────────────────────────────────────────────────────
export type GrowthPeriod = 'days' | 'weeks' | 'months';
export interface GrowthBucket { label: string; count: number; }
export interface DonutSegment  { value: number; color: string; label: string; }
export interface LineDataset   { label: string; color: string; data: GrowthBucket[]; }

// Shape of the pre-computed bid stats passed to BidAnalyticsTab
export interface BidStats {
  total: number;
  waiting: number;
  offerSent: number;
  offerAccepted: number;
  assigned: number;
  inProgress: number;
  inReview: number;
  completed: number;
  declined: number;
  withdrawn: number;
  conversionRate: number;
  avgValue: number;
  avgRating: number;
  ratedCount: number;
  topCategories: { name: string; count: number }[];
  topLocations:  { name: string; count: number }[];
}

export const PERIOD_OPTIONS: { value: GrowthPeriod; label: string }[] = [
  { value: 'days',   label: 'Last 14 Days'  },
  { value: 'weeks',  label: 'Last 8 Weeks'  },
  { value: 'months', label: 'Last 6 Months' },
];

// ── date helpers ───────────────────────────────────────────────────────
export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isoWeek(d: Date): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return `W${Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)}`;
}

export function buildGrowthBuckets<T>(
  items: T[], period: GrowthPeriod, getDate: (item: T) => string | null | undefined,
): GrowthBucket[] {
  const now = new Date();

  if (period === 'days') {
    type B = GrowthBucket & { _key: number };
    const buckets: B[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (13 - i));
      return { label: d.toLocaleString('default', { weekday: 'short', day: 'numeric' }), count: 0, _key: startOfDay(d).getTime() };
    });
    items.forEach(item => {
      const s = getDate(item); if (!s) return;
      const b = buckets.find(x => x._key === startOfDay(new Date(s)).getTime()); if (b) b.count++;
    });
    return buckets;
  }

  if (period === 'weeks') {
    const map = new Map<string, GrowthBucket>(); const labels: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      const lbl = isoWeek(d);
      if (!map.has(lbl)) { map.set(lbl, { label: lbl, count: 0 }); labels.push(lbl); }
    }
    items.forEach(item => { const s = getDate(item); if (!s) return; const b = map.get(isoWeek(new Date(s))); if (b) b.count++; });
    return labels.map(l => map.get(l)!);
  }

  type B = GrowthBucket & { _key: string };
  const buckets: B[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString('default', { month: 'short' }), count: 0, _key: `${d.getFullYear()}-${d.getMonth()}` };
  });
  items.forEach(item => {
    const s = getDate(item); if (!s) return;
    const d = new Date(s); const b = buckets.find(x => x._key === `${d.getFullYear()}-${d.getMonth()}`); if (b) b.count++;
  });
  return buckets;
}

// ── animated number ────────────────────────────────────────────────────
export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let cur = 0; const step = Math.ceil(value / 40) || 1;
    const t = setInterval(() => {
      cur += step;
      if (cur >= value) { setDisplay(value); clearInterval(t); } else setDisplay(cur);
    }, 20);
    return () => clearInterval(t);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

// ── stat card ──────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent }: { label: string; value: number; sub: string; accent: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '16px 16px 0 0' }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 800, color: NAVY, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        <AnimatedNumber value={value} />
      </span>
      <span style={{ fontSize: 12, color: SLATE }}>{sub}</span>
    </div>
  );
}

// ── line chart ─────────────────────────────────────────────────────────
export function LineChart({ datasets }: { datasets: LineDataset[] }) {
  const W = 560, H = 190;
  const pad = { top: 16, right: 20, bottom: 38, left: 36 };
  const plotW = W - pad.left - pad.right, plotH = H - pad.top - pad.bottom;
  const allCounts = datasets.flatMap(d => d.data.map(b => b.count));
  const maxVal = Math.max(...allCounts, 1);
  const n = datasets[0]?.data.length ?? 0;

  if (n === 0) return (
    <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: 13 }}>
      No data for this period
    </div>
  );

  const xPos = (i: number) => n === 1 ? pad.left + plotW / 2 : pad.left + (i / (n - 1)) * plotW;
  const yPos = (v: number) => pad.top + plotH - Math.min(v / maxVal, 1) * plotH;
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i));
  const labelStep = n <= 8 ? 1 : n <= 14 ? 2 : Math.ceil(n / 7);
  const gradId = (lbl: string) => `lg_${lbl.replace(/[^a-z0-9]/gi, '_')}`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          {datasets.map(ds => (
            <linearGradient key={ds.label} id={gradId(ds.label)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={ds.color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={ds.color} stopOpacity={0}    />
            </linearGradient>
          ))}
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} y1={yPos(v)} x2={W - pad.right} y2={yPos(v)} stroke="#F1F5F9" strokeWidth={1} />
            {v > 0 && <text x={pad.left - 5} y={yPos(v) + 4} textAnchor="end" fontSize={8} fill="#94A3B8">{v}</text>}
          </g>
        ))}
        {n > 1 && datasets.map(ds => {
          const linePts = ds.data.map((b, i) => `${xPos(i).toFixed(1)},${yPos(b.count).toFixed(1)}`).join(' ');
          const areaPts = [
            ...ds.data.map((b, i) => `${xPos(i).toFixed(1)},${yPos(b.count).toFixed(1)}`),
            `${xPos(n - 1).toFixed(1)},${yPos(0).toFixed(1)}`,
            `${xPos(0).toFixed(1)},${yPos(0).toFixed(1)}`,
          ].join(' ');
          return (
            <g key={ds.label}>
              <polygon  points={areaPts} fill={`url(#${gradId(ds.label)})`} />
              <polyline points={linePts} fill="none" stroke={ds.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
        {datasets.map(ds => ds.data.map((b, i) => (
          <circle key={`${ds.label}-${i}`} cx={xPos(i)} cy={yPos(b.count)} r={3} fill={ds.color} stroke="#fff" strokeWidth={1.5} />
        )))}
        {datasets[0]?.data.map((b, i) => {
          if (i % labelStep !== 0 && i !== n - 1) return null;
          return <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94A3B8">{b.label}</text>;
        })}
      </svg>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 10 }}>
        {datasets.map(ds => (
          <div key={ds.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 2.5, borderRadius: 2, background: ds.color }} />
            <span style={{ fontSize: 11, color: SLATE }}>{ds.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── donut chart ────────────────────────────────────────────────────────
export function DonutChart({ segments, centerLabel, centerValue }: { segments: DonutSegment[]; centerLabel: string; centerValue: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 52, circ = 2 * Math.PI * r;
  const active = segments.filter(s => s.value > 0);
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={120} height={120} viewBox="0 0 130 130" style={{ flexShrink: 0 }}>
        <circle cx={65} cy={65} r={r} fill="none" stroke={BORDER} strokeWidth={18} />
        {active.map((seg, i) => {
          const dash = (seg.value / total) * circ;
          const el = (
            <circle key={i} cx={65} cy={65} r={r} fill="none" stroke={seg.color} strokeWidth={18}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="butt"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px', transition: 'stroke-dasharray 1s ease' }}
            />
          );
          offset += dash; return el;
        })}
        <text x={65} y={60} textAnchor="middle" fontSize={19} fontWeight={700} fill={NAVY}>{centerValue}</text>
        <text x={65} y={76} textAnchor="middle" fontSize={10} fill={SLATE}>{centerLabel}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {active.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: SLATE }}>{seg.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginLeft: 'auto', paddingLeft: 10 }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── horizontal bar ─────────────────────────────────────────────────────
export function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: SLATE, width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: BORDER, borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, width: 28, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

// ── hbars list ─────────────────────────────────────────────────────────
export function HBarList({ items, color, empty }: { items: { name: string; count: number }[]; color: string; empty: string }) {
  const max = Math.max(...items.map(t => t.count), 1);
  if (items.length === 0) return <span style={{ fontSize: 13, color: '#CBD5E1' }}>{empty}</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {items.map((t, i) => <HBar key={i} label={t.name} count={t.count} max={max} color={color} />)}
    </div>
  );
}

// ── chart card wrapper ─────────────────────────────────────────────────
export function ChartCard({ title, sub, children, action }: { title: string; sub: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{title}</div>
          <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>{sub}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── section head ───────────────────────────────────────────────────────
export function SectionHead({ title, sub, icon }: { title: string; sub: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, letterSpacing: -0.3 }}>{title}</div>
        <div style={{ fontSize: 11, color: SLATE, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── period dropdown ────────────────────────────────────────────────────
export function PeriodDropdown({ value, onChange }: { value: GrowthPeriod; onChange: (v: GrowthPeriod) => void }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value as GrowthPeriod)}
        style={{ fontSize: 11, fontWeight: 600, color: NAVY, background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '4px 28px 4px 10px', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
        {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <path d="M1 1L5 5L9 1" stroke={SLATE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── loading spinner ────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: SLATE, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${ORANGE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading analytics…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}