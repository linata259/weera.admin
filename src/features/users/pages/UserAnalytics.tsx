import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { fetchUsers } from '../api/userServices';
import { User } from '../types';

// ── colour tokens ──────────────────────────────────────────────────────
const ORANGE  = '#EA580C';
const NAVY    = '#0F172A';
const SLATE   = '#64748B';
const SLATE_L = '#94A3B8';
const BORDER  = '#E2E8F0';
const BG      = '#F8FAFC';

// ── types ──────────────────────────────────────────────────────────────
type GrowthPeriod = 'days' | 'weeks' | 'months';

interface GrowthBucket {
  label: string;
  clients: number;
  bidders: number;
}

// ── helpers ────────────────────────────────────────────────────────────
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoWeek(d: Date): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `W${wk}`;
}

function buildGrowthBuckets(users: User[], period: GrowthPeriod): GrowthBucket[] {
  const now = new Date();

  if (period === 'days') {
    const buckets = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (13 - i));
      return {
        label: d.toLocaleString('default', { weekday: 'short', day: 'numeric' }),
        clients: 0, bidders: 0,
        _key: startOfDay(d).getTime(),
      };
    });
    users.forEach(u => {
      if (!u.created_at) return;
      const key = startOfDay(new Date(u.created_at)).getTime();
      const b = buckets.find(b => (b as any)._key === key);
      if (!b) return;
      const t = u.user_type_names ?? [];
      if (t.some((x: string) => x === 'hire talent')) b.clients++;
      if (t.some((x: string) => x === 'find work'))   b.bidders++;
    });
    return buckets;
  }

  if (period === 'weeks') {
    const map = new Map<string, GrowthBucket>();
    const labels: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      const lbl = isoWeek(d);
      if (!map.has(lbl)) { map.set(lbl, { label: lbl, clients: 0, bidders: 0 }); labels.push(lbl); }
    }
    users.forEach(u => {
      if (!u.created_at) return;
      const b = map.get(isoWeek(new Date(u.created_at)));
      if (!b) return;
      const t = u.user_type_names ?? [];
      if (t.some((x: string) => x === 'hire talent')) b.clients++;
      if (t.some((x: string) => x === 'find work'))   b.bidders++;
    });
    return labels.map(l => map.get(l)!);
  }

  // months – last 6
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleString('default', { month: 'short' }),
      clients: 0, bidders: 0,
      _key: `${d.getFullYear()}-${d.getMonth()}`,
    };
  });
  users.forEach(u => {
    if (!u.created_at) return;
    const d = new Date(u.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.find(b => (b as any)._key === key);
    if (!b) return;
    const t = u.user_type_names ?? [];
    if (t.some((x: string) => x === 'hire talent')) b.clients++;
    if (t.some((x: string) => x === 'find work'))   b.bidders++;
  });
  return buckets;
}

// ── icons ──────────────────────────────────────────────────────────────
const UsersIcon = (c: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const ClientIcon = (c: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const BidderIcon = (c: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const SuspendIcon = (c: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ── stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accentColor }: {
  label: string; value: number; icon: React.ReactNode; accentColor: string;
}) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: '18px 20px', display: 'flex', flexDirection: 'column',
      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: SLATE }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${accentColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <span style={{
        fontSize: 30, fontWeight: 700, color: NAVY,
        lineHeight: 1.1, marginTop: 10, fontVariantNumeric: 'tabular-nums',
      }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// ── custom tooltip ─────────────────────────────────────────────────────
function GrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(15,23,42,0.08)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
      <p style={{ margin: 0, fontWeight: 600, color: NAVY }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: '2px 0 0', color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ── donut chart ────────────────────────────────────────────────────────
function DonutChart({ clients, bidders, suspended }: { clients: number; bidders: number; suspended: number }) {
  const total = clients + bidders + suspended || 1;
  const r = 68, circ = 2 * Math.PI * r, cx = 88, cy = 88;

  const segments = [
    { value: clients,   color: ORANGE,    label: 'Clients',   count: clients },
    { value: bidders,   color: NAVY,      label: 'Bidders',   count: bidders },
    { value: suspended, color: '#CBD5E1', label: 'Suspended', count: suspended },
  ];

  let offset = 0;
  const arcs = segments.map(seg => {
    const dash = (seg.value / total) * circ;
    const el = { ...seg, dash, offset };
    offset += dash;
    return el;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width={176} height={176} viewBox="0 0 176 176" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={BORDER} strokeWidth={22} />
        {arcs.map((seg, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={22}
            strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
            strokeDashoffset={-seg.offset} strokeLinecap="butt"
            style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={26} fontWeight={700} fill={NAVY} fontFamily="Inter,sans-serif">
          {Math.round((clients / total) * 100)}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={12} fill={SLATE} fontFamily="Inter,sans-serif">
          Clients
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: SLATE, minWidth: 72 }}>{seg.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── horizontal bar ─────────────────────────────────────────────────────
function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: SLATE, width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 7, background: BORDER, borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${Math.max((count / max) * 100, 2)}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: NAVY, width: 24, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

const PERIOD_OPTIONS: { value: GrowthPeriod; label: string }[] = [
  { value: 'days',   label: 'Last 14 Days' },
  { value: 'weeks',  label: 'Last 8 Weeks' },
  { value: 'months', label: 'Last 6 Months' },
];

// ── main ───────────────────────────────────────────────────────────────
const UserAnalytics: React.FC = () => {
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<GrowthPeriod>('months');

  useEffect(() => {
    fetchUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    let clients = 0, bidders = 0, suspended = 0;
    const locationCount: Record<string, number> = {};
    const skillCount:    Record<string, number> = {};

    users.forEach(u => {
      const types = u.user_type_names ?? [];
      if (types.some((t: string) => t === 'hire talent')) clients++;
      if (types.some((t: string) => t === 'find work'))   bidders++;

      (u.location_names ?? [u.location].filter(Boolean)).forEach((loc) => {
        if (loc && loc !== '—') locationCount[loc] = (locationCount[loc] || 0) + 1;
      });
      (u.skills_id ?? []).forEach((skill) => {
        if (skill) skillCount[skill] = (skillCount[skill] || 0) + 1;
      });
    });

    return {
      total: users.length, clients, bidders, suspended,
      topLocations: Object.entries(locationCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,count]) => ({name,count})),
      topSkills:    Object.entries(skillCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,count]) => ({name,count})),
    };
  }, [users]);

  const growthData = useMemo(() => buildGrowthBuckets(users, period), [users, period]);
  const maxLoc   = Math.max(...stats.topLocations.map(l => l.count), 1);
  const maxSkill = Math.max(...stats.topSkills.map(s => s.count), 1);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: SLATE, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${ORANGE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading analytics…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", color: NAVY, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="Total Users" value={stats.total}     icon={UsersIcon(NAVY)}           accentColor={NAVY} />
        <StatCard label="Clients"     value={stats.clients}   icon={ClientIcon(ORANGE)}         accentColor={ORANGE} />
        <StatCard label="Bidders"     value={stats.bidders}   icon={BidderIcon(NAVY)}           accentColor={NAVY} />
        <StatCard label="Suspended"   value={stats.suspended} icon={SuspendIcon(SLATE_L)}       accentColor={SLATE_L} />
      </div>

      {/* charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

        {/* Growth Over Time */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Growth Over Time</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {[{ color: ORANGE, label: 'Clients' }, { color: NAVY, label: 'Bidders' }].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 11, color: SLATE_L }}>{label}</span>
                </div>
              ))}
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as GrowthPeriod)}
                style={{
                  fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: 'inherit',
                  background: BG, border: `1px solid ${BORDER}`, borderRadius: 7,
                  padding: '4px 24px 4px 10px', cursor: 'pointer', outline: 'none', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                }}
              >
                {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={growthData} barCategoryGap="35%" barGap={3} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: SLATE_L, fontFamily: 'Inter,sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: SLATE_L, fontFamily: 'Inter,sans-serif' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip content={<GrowthTooltip />} cursor={{ fill: '#F8FAFC' }} />
              <Bar dataKey="clients" name="Clients" fill={ORANGE} radius={[4,4,0,0]}>
                {growthData.map((_, i) => <Cell key={i} fill={ORANGE} />)}
              </Bar>
              <Bar dataKey="bidders" name="Bidders" fill={NAVY} radius={[4,4,0,0]}>
                {growthData.map((_, i) => <Cell key={i} fill={NAVY} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Breakdown */}
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 16 }}>User Breakdown</span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <DonutChart clients={stats.clients} bidders={stats.bidders} suspended={stats.suspended} />
          </div>
        </div>
      </div>

      {/* bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 16 }}>Top Locations</span>
          {stats.topLocations.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.topLocations.map((l, i) => <HBar key={i} label={l.name} count={l.count} max={maxLoc} color={ORANGE} />)}
              </div>
            : <span style={{ fontSize: 13, color: SLATE_L }}>No location data yet</span>}
        </div>

        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 16 }}>Top Skills</span>
          {stats.topSkills.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.topSkills.map((s, i) => <HBar key={i} label={s.name} count={s.count} max={maxSkill} color={NAVY} />)}
              </div>
            : <span style={{ fontSize: 13, color: SLATE_L }}>No skill data yet</span>}
        </div>
      </div>

    </div>
  );
};

export default UserAnalytics;
