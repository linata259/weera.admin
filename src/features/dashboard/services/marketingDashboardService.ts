import { supabase } from "services/supabaseClient";
import { KpiTrend } from "./superAdminService";

export interface MarketingKpis {
  newUsersMtd: number;
  newUsersTrend: KpiTrend;
  totalUsers: number;
  jobsPostedMtd: number;
  jobsTrend: KpiTrend;
  bidsMtd: number;
  bidsTrend: KpiTrend;
  /** avg bids per job this month — engagement proxy */
  avgBidsPerJob: number;
}

const trend = (current: number, previous: number): KpiTrend => {
  if (previous <= 0) {
    return current > 0
      ? { changePercent: 100, direction: "up" }
      : { changePercent: 0, direction: "flat" };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    changePercent: Math.round(Math.abs(pct) * 10) / 10,
    direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat",
  };
};

const safeCount = async (build: (s: typeof supabase) => any): Promise<number> => {
  try {
    const { count, error } = await build(supabase);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
};

export async function fetchMarketingKpis(): Promise<MarketingKpis> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthSamePoint = new Date(
    now.getFullYear(), now.getMonth() - 1, now.getDate(), now.getHours(),
  ).toISOString();

  const [
    totalUsers,
    usersMtd, usersPrev,
    jobsMtd, jobsPrev,
    bidsMtd, bidsPrev,
  ] = await Promise.all([
    safeCount((s) =>
      s.from("profiles").select("id", { head: true, count: "exact" })
        .or("role.is.null,role.neq.admin"),
    ),
    safeCount((s) =>
      s.from("profiles").select("id", { head: true, count: "exact" })
        .or("role.is.null,role.neq.admin").gte("created_at", monthStart),
    ),
    safeCount((s) =>
      s.from("profiles").select("id", { head: true, count: "exact" })
        .or("role.is.null,role.neq.admin")
        .gte("created_at", prevMonthStart).lt("created_at", prevMonthSamePoint),
    ),
    safeCount((s) =>
      s.from("jobs").select("id", { head: true, count: "exact" })
        .gte("posted_at", monthStart),
    ),
    safeCount((s) =>
      s.from("jobs").select("id", { head: true, count: "exact" })
        .gte("posted_at", prevMonthStart).lt("posted_at", prevMonthSamePoint),
    ),
    safeCount((s) =>
      s.from("bids").select("id", { head: true, count: "exact" })
        .gte("submitted_at", monthStart),
    ),
    safeCount((s) =>
      s.from("bids").select("id", { head: true, count: "exact" })
        .gte("submitted_at", prevMonthStart).lt("submitted_at", prevMonthSamePoint),
    ),
  ]);

  return {
    newUsersMtd: usersMtd,
    newUsersTrend: trend(usersMtd, usersPrev),
    totalUsers,
    jobsPostedMtd: jobsMtd,
    jobsTrend: trend(jobsMtd, jobsPrev),
    bidsMtd,
    bidsTrend: trend(bidsMtd, bidsPrev),
    avgBidsPerJob: jobsMtd > 0 ? Math.round((bidsMtd / jobsMtd) * 10) / 10 : 0,
  };
}
