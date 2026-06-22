import { supabase } from 'services/supabaseClient';
import type { Job } from '../pages/Jobs';

type DBJob = {
    id: string;
    title: string | null;
    status: string | null;
    applicants: number | null;
    posted_at: string | null;
    posted_by_user_id: string | null;
    categories: string[] | null;
    description: string | null;
    location_id: string | null;
    location_type_id: string | null;
    budget: number | null;
    skills: string[] | null;
    project_timeline: string | null;
    payment_type_id: string | null;
    attachments: string[] | null;
    is_sponsored: boolean | null;
    is_deleted: boolean | null;
};

type DBProfile = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
};

type DBCategory = { id: string; name: string };
type DBLocation = { id: string; location: string };
type DBLocationType = { id: string; type: string };
type DBPaymentType = { id: string; type: string };
type DBProjectTimeline = { id: string; timeline: string };
type DBSkill = { id: string; name: string };

const ATTACHMENTS_BUCKET = "attachments";

// ─── TTL cache for static reference tables ────────────────────────────────────
// Categories, locations, skills etc. change very rarely. Cache them for 5 min
// so navigating away and back to Jobs costs zero extra round trips.
const _cache = new Map<string, { value: unknown; exp: number }>();

function withCache<T>(key: string, fn: () => Promise<T>, ttl = 300_000): Promise<T> {
    const hit = _cache.get(key);
    if (hit && Date.now() < hit.exp) return Promise.resolve(hit.value as T);
    return fn().then((v) => {
        _cache.set(key, { value: v, exp: Date.now() + ttl });
        return v;
    });
}

// ─── Reference table fetchers (all cached) ────────────────────────────────────

function fetchCategoryMap(): Promise<Map<string, string>> {
    return withCache("categories", async () => {
        const { data, error } = await supabase.from("job_categories").select("id, name");
        if (error) console.warn("Supabase error fetching job_categories:", error);
        return new Map(((data ?? []) as DBCategory[]).map((row) => [row.id, row.name]));
    });
}

function fetchLocationMap(): Promise<Map<string, string>> {
    return withCache("locations", async () => {
        const { data, error } = await supabase.from("locations").select("id, location");
        if (error) console.warn("Supabase error fetching locations:", error);
        return new Map(((data ?? []) as DBLocation[]).map((row) => [row.id, row.location]));
    });
}

function fetchLocationTypeMap(): Promise<Map<string, string>> {
    return withCache("location_types", async () => {
        const { data, error } = await supabase.from("location_types").select("id, type");
        if (error) console.warn("Supabase error fetching location_types:", error);
        return new Map(((data ?? []) as DBLocationType[]).map((row) => [row.id, row.type]));
    });
}

function fetchPaymentTypeMap(): Promise<Map<string, string>> {
    return withCache("payment_types", async () => {
        const { data, error } = await supabase.from("payment_types").select("id, type");
        if (error) console.warn("Supabase error fetching payment_types:", error);
        return new Map(((data ?? []) as DBPaymentType[]).map((row) => [row.id, row.type]));
    });
}

function fetchTimelineMap(): Promise<Map<string, string>> {
    return withCache("project_timeline", async () => {
        const { data, error } = await supabase.from("project_timeline").select("id, timeline");
        if (error) console.warn("Supabase error fetching project_timeline:", error);
        return new Map(((data ?? []) as DBProjectTimeline[]).map((row) => [row.id, row.timeline]));
    });
}

function fetchSkillMap(): Promise<Map<string, string>> {
    return withCache("skills", async () => {
        const { data, error } = await supabase.from("skills").select("id, name");
        if (error) console.warn("Supabase error fetching skills:", error);
        return new Map(((data ?? []) as DBSkill[]).map((row) => [row.id, row.name]));
    });
}

async function fetchProfileMap(userIds: string[]): Promise<Map<string, DBProfile>> {
    if (!userIds.length) return new Map();
    const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, image_url")
        .in("id", userIds);
    if (error) console.warn("Supabase error fetching profiles:", error);
    return new Map(((data ?? []) as DBProfile[]).map((profile) => [profile.id, profile]));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDisplayJobId(id: string): string {
    return id.replace(/[^0-9]/g, "").substring(0, 10).padStart(10, "0");
}

function cleanAttachmentFilename(path: string): string {
    const rawName = path.split("/").pop() ?? path;
    return rawName.replace(/^(\d+_)+/, "");
}

function resolveAttachment(path: string): { url: string; name: string } {
    const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, name: cleanAttachmentFilename(path) };
}

function mapDBJobToJob(
    row: DBJob,
    categoryMap: Map<string, string>,
    profileMap: Map<string, DBProfile>,
    locationMap: Map<string, string>,
    locationTypeMap: Map<string, string>,
    paymentTypeMap: Map<string, string>,
    timelineMap: Map<string, string>,
    skillMap: Map<string, string>
): Job {
    const categoriesId = Array.isArray(row.categories) ? row.categories : [];
    const categoryNames = categoriesId
        .map((id) => categoryMap.get(id))
        .filter((name): name is string => Boolean(name));

    const profile = row.posted_by_user_id
        ? profileMap.get(row.posted_by_user_id)
        : null;

    const postedByName = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
        : "";

    const attachments = Array.isArray(row.attachments)
        ? row.attachments.map(resolveAttachment)
        : [];

    const skillIds = Array.isArray(row.skills) ? row.skills : [];
    const skillNames = skillIds
        .map((id) => skillMap.get(id))
        .filter((name): name is string => Boolean(name));

    return {
        id: row.id,
        jobId: makeDisplayJobId(row.id),
        title: row.title ?? "",
        jobType: categoryNames[0] ?? "General",
        categories: categoryNames,
        status: row.status ?? "pending",
        applicants: row.applicants ?? 0,
        posted_at: row.posted_at ?? null,
        posted_by_user_id: row.posted_by_user_id ?? null,
        posted_by_name: postedByName || "Unknown",
        posted_by_image: profile?.image_url ?? null,
        description: row.description ?? "",
        location: row.location_id ? locationMap.get(row.location_id) ?? "" : "",
        locationType: row.location_type_id ? locationTypeMap.get(row.location_type_id) ?? "" : "",
        budget: row.budget ?? null,
        skills: skillNames,
        paymentType: row.payment_type_id ? paymentTypeMap.get(row.payment_type_id) ?? "" : "",
        timeline: row.project_timeline ? timelineMap.get(row.project_timeline) ?? "" : "",
        attachments,
        isSponsored: row.is_sponsored ?? false,
    };
}

// ─── fetchJobs ────────────────────────────────────────────────────────────────
// Key change: jobs fetch + all 6 static lookup tables fire in parallel.
// Previously: jobs → [7 parallel lookups]. The static tables have no dependency
// on job data, so they were waiting for nothing.
// Now:  [jobs + 6 static maps] → [profiles only]  (profiles need job user IDs)

export const fetchJobs = async (): Promise<Job[]> => {
    const [jobsRes, categoryMap, locationMap, locationTypeMap, paymentTypeMap, timelineMap, skillMap] =
        await Promise.all([
            supabase
                .from("jobs")
                .select(`
                    id,
                    title,
                    status,
                    applicants,
                    posted_at,
                    posted_by_user_id,
                    categories,
                    description,
                    location_id,
                    location_type_id,
                    budget,
                    skills,
                    project_timeline,
                    payment_type_id,
                    attachments,
                    is_sponsored,
                    is_deleted
                `)
                .eq("is_deleted", false)
                .order("posted_at", { ascending: false }),
            fetchCategoryMap(),
            fetchLocationMap(),
            fetchLocationTypeMap(),
            fetchPaymentTypeMap(),
            fetchTimelineMap(),
            fetchSkillMap(),
        ]);

    if (jobsRes.error) {
        console.error(
            "Supabase error fetching jobs:",
            jobsRes.error.message,
            jobsRes.error.details,
            jobsRes.error.hint
        );
        return [];
    }

    const jobs = (jobsRes.data ?? []) as DBJob[];

    const userIds = Array.from(
        new Set(
            jobs
                .map((job) => job.posted_by_user_id)
                .filter((id): id is string => Boolean(id))
        )
    );

    // Only profiles still require a second round trip — they depend on the
    // user IDs extracted from the jobs result above.
    const profileMap = await fetchProfileMap(userIds);

    return jobs.map((job) =>
        mapDBJobToJob(job, categoryMap, profileMap, locationMap, locationTypeMap, paymentTypeMap, timelineMap, skillMap)
    );
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function toggleJobSponsorship(jobId: string, sponsored: boolean): Promise<boolean> {
    const { error } = await supabase
        .from("jobs")
        .update({ is_sponsored: sponsored })
        .eq("id", jobId);
    if (error) {
        console.error("Supabase error updating sponsorship:", error.message);
        return false;
    }
    return true;
}

export async function softDeleteJob(jobId: string): Promise<boolean> {
    const { error } = await supabase
        .from("jobs")
        .update({ is_deleted: true })
        .eq("id", jobId);
    if (error) {
        console.error("Supabase error soft-deleting job:", error.message);
        return false;
    }
    return true;
}

export async function banJob(jobId: string, reason: string): Promise<boolean> {
    const { error } = await supabase
        .from("jobs")
        .update({ status: "banned", ban_reason: reason })
        .eq("id", jobId);
    if (error) {
        console.error("Supabase error banning job:", error.message);
        return false;
    }
    return true;
}

export async function fetchBids() {
    const { data, error } = await supabase
        .from('bids')
        .select('*, jobs!inner(title, location_id(location))')
        .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}