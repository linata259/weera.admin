import { useCallback, useEffect, useState } from 'react';
import { supabase } from 'services/supabaseClient';

export interface AppHealth {
    dbOnline: boolean;
    dbLatencyMs: number | null;
    lastJobAt: string | null;
    lastBidAt: string | null;

    activeJobs: number;
    expiredJobs: number;
    expiringSoon: number;   // within 48h
    pendingReview: number;
    jobs24h: number;
    bids24h: number;

    openJobReports: number;
    openMessageReports: number;
    suspendedUsers: number;

    skillsCount: number;
    countiesCount: number;
    wardsCount: number;
}

const count = async (build: (q: any) => any): Promise<number> => {
    try {
        const { count: c, error } = await build(
            supabase as any,
        );
        if (error) { console.warn('health count:', error.message); return 0; }
        return c ?? 0;
    } catch { return 0; }
};

export function useAppHealth() {
    const [health, setHealth] = useState<AppHealth | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        const nowIso = new Date().toISOString();
        const in48h = new Date(Date.now() + 48 * 3600_000).toISOString();
        const ago24h = new Date(Date.now() - 24 * 3600_000).toISOString();

        // DB reachability + latency (tiny head query)
        const t0 = performance.now();
        let dbOnline = true;
        try {
            const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' });
            if (error) dbOnline = false;
        } catch { dbOnline = false; }
        const dbLatencyMs = dbOnline ? Math.round(performance.now() - t0) : null;

        const [
            activeJobs, lapsedJobs, flaggedExpired, expiringSoon, pendingReview,
            jobs24h, bids24h, openJobReports, openMessageReports, suspendedUsers,
            skillsCount, countiesCount, wardsCount,
            lastJobRes, lastBidRes,
        ] = await Promise.all([
            count(s => s.from('jobs').select('id', { head: true, count: 'exact' })
                .in('status', ['pending', 'active']).gt('expires_at', nowIso)),
            count(s => s.from('jobs').select('id', { head: true, count: 'exact' })
                .in('status', ['pending', 'active']).lt('expires_at', nowIso)),
            count(s => s.from('jobs').select('id', { head: true, count: 'exact' })
                .eq('status', 'expired')),
            count(s => s.from('jobs').select('id', { head: true, count: 'exact' })
                .in('status', ['pending', 'active']).gt('expires_at', nowIso).lt('expires_at', in48h)),
            count(s => s.from('jobs').select('id', { head: true, count: 'exact' })
                .eq('status', 'pending_review')),
            count(s => s.from('jobs').select('id', { head: true, count: 'exact' })
                .gte('posted_at', ago24h)),
            count(s => s.from('bids').select('id', { head: true, count: 'exact' })
                .gte('submitted_at', ago24h)),
            count(s => s.from('job_reports').select('id', { head: true, count: 'exact' })
                .eq('status', 'pending')),
            count(s => s.from('message_reports').select('id', { head: true, count: 'exact' })
                .eq('status', 'pending')),
            count(s => s.from('profiles').select('id', { head: true, count: 'exact' })
                .eq('is_active', false)),
            count(s => s.from('skills').select('id', { head: true, count: 'exact' })),
            count(s => s.from('counties').select('id', { head: true, count: 'exact' })),
            count(s => s.from('wards').select('id', { head: true, count: 'exact' })),
            supabase.from('jobs').select('posted_at').order('posted_at', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('bids').select('submitted_at').order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        setHealth({
            dbOnline,
            dbLatencyMs,
            lastJobAt: (lastJobRes as any)?.data?.posted_at ?? null,
            lastBidAt: (lastBidRes as any)?.data?.submitted_at ?? null,
            activeJobs,
            expiredJobs: lapsedJobs + flaggedExpired,
            expiringSoon,
            pendingReview,
            jobs24h,
            bids24h,
            openJobReports,
            openMessageReports,
            suspendedUsers,
            skillsCount,
            countiesCount,
            wardsCount,
        });
        setIsLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    return { health, isLoading, refetch: load };
}
