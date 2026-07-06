import { useNavigate } from 'react-router-dom';
import { AppHealth } from '../hooks/useAppHealth';

const NAVY = '#0F172A';
const SLATE = '#64748B';
const BORDER = '#E2E8F0';
const GREEN = '#16A34A';
const AMBER = '#D97706';
const RED = '#DC2626';
const ORANGE = '#EA580C';
const SKY = '#0EA5E9';
const PURPLE = '#7C3AED';

function timeAgo(iso: string | null): string {
    if (!iso) return '—';
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function Pill({ dot, label, value, tone }: { dot: string; label: string; value: string; tone?: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20,
            padding: '5px 12px', fontSize: 12,
        }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
            <span style={{ color: SLATE }}>{label}</span>
            <span style={{ fontWeight: 700, color: tone ?? NAVY }}>{value}</span>
        </div>
    );
}

interface Tile {
    label: string;
    value: number;
    sub: string;
    path: string;
    accent: string;
    /** value > 0 means this needs admin attention */
    alert?: boolean;
}

export function HealthOverview({ health, isLoading }: { health: AppHealth | null; isLoading: boolean }) {
    const navigate = useNavigate();

    if (isLoading || !health) {
        return (
            <div style={{
                height: 150, borderRadius: 12, background: '#F1F5F9',
                animation: 'dashboardSkeletonPulse 1.5s ease-in-out infinite',
            }} />
        );
    }

    const latency = health.dbLatencyMs;
    const latencyTone = !health.dbOnline ? RED : latency! < 400 ? GREEN : latency! < 900 ? AMBER : RED;

    const tiles: Tile[] = [
        { label: 'Active Jobs', value: health.activeJobs, sub: 'open for bidding', path: '/jobs', accent: GREEN },
        { label: 'Expired Jobs', value: health.expiredJobs, sub: 'lapsed after 7 days', path: '/jobs', accent: RED, alert: true },
        { label: 'Expiring ≤ 48h', value: health.expiringSoon, sub: 'need bids soon', path: '/jobs', accent: AMBER, alert: true },
        { label: 'Pending Review', value: health.pendingReview, sub: 'awaiting client approval', path: '/jobs', accent: PURPLE, alert: true },
        { label: 'Jobs (24h)', value: health.jobs24h, sub: 'posted today', path: '/jobs/analytics', accent: ORANGE },
        { label: 'Bids (24h)', value: health.bids24h, sub: 'submitted today', path: '/jobs/analytics', accent: SKY },
        { label: 'Job Reports', value: health.openJobReports, sub: 'open reports', path: '/jobs/reports', accent: RED, alert: true },
        { label: 'Msg Reports', value: health.openMessageReports, sub: 'open reports', path: '/jobs/reports', accent: RED, alert: true },
        { label: 'Suspended Users', value: health.suspendedUsers, sub: 'deactivated accounts', path: '/users', accent: SLATE, alert: true },
        { label: 'Skills', value: health.skillsCount, sub: 'in catalogue', path: '/skills', accent: NAVY },
        { label: 'Locations', value: health.wardsCount, sub: `wards in ${health.countiesCount} county${health.countiesCount === 1 ? '' : 'ies'}`, path: '/locations', accent: NAVY },
    ];

    return (
        <div style={{
            borderRadius: 12, border: `1px solid ${BORDER}`, background: '#fff', padding: 20,
        }}>
            {/* header + liveness pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: NAVY }}>Platform Health</h2>
                    <span style={{ fontSize: 11.5, color: SLATE }}>Live snapshot across every module — click a tile to jump in</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
                    <Pill
                        dot={latencyTone}
                        label="Database"
                        value={health.dbOnline ? `Online · ${latency}ms` : 'Unreachable'}
                        tone={latencyTone}
                    />
                    <Pill dot={ORANGE} label="Last job" value={timeAgo(health.lastJobAt)} />
                    <Pill dot={SKY} label="Last bid" value={timeAgo(health.lastBidAt)} />
                </div>
            </div>

            {/* monitor tiles */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 10,
            }}>
                {tiles.map(t => {
                    const hot = t.alert && t.value > 0;
                    return (
                        <button
                            key={t.label}
                            onClick={() => navigate(t.path)}
                            style={{
                                textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                                border: `1px solid ${hot ? `${t.accent}55` : '#EEF2F6'}`,
                                background: hot ? `${t.accent}0D` : '#FAFBFC',
                                borderRadius: 12, padding: '12px 14px',
                                display: 'flex', flexDirection: 'column', gap: 3,
                                transition: 'transform 0.12s, box-shadow 0.12s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.08)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: hot ? t.accent : SLATE }}>
                                {t.label}
                            </span>
                            <span style={{ fontSize: 24, fontWeight: 800, color: NAVY, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                                {t.value.toLocaleString()}
                            </span>
                            <span style={{ fontSize: 10.5, color: '#94A3B8' }}>{t.sub}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
