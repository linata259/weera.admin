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
};

type DBProfile = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
};

type DBCategory = {
    id: string;
    name: string;
};

async function fetchCategoryMap(): Promise<Map<string, string>> {
    const { data, error } = await supabase
        .from("job_categories")
        .select("id, name");

    if (error) {
        console.warn("Supabase error fetching job_categories:", error);
        return new Map();
    }

    return new Map(
        ((data ?? []) as DBCategory[]).map((row) => [row.id, row.name])
    );
}

async function fetchProfileMap(userIds: string[]): Promise<Map<string, DBProfile>> {
    if (userIds.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, image_url")
        .in("id", userIds);

    if (error) {
        console.warn("Supabase error fetching profiles:", error);
        return new Map();
    }

    return new Map(
        ((data ?? []) as DBProfile[]).map((profile) => [profile.id, profile])
    );
}

function makeDisplayJobId(id: string): string {
    return id.replace(/[^0-9]/g, "").substring(0, 10).padStart(10, "0");
}

function mapDBJobToJob(
    row: DBJob,
    categoryMap: Map<string, string>,
    profileMap: Map<string, DBProfile>
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
    };
}

export const fetchJobs = async (): Promise<Job[]> => {
    const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select(`
            id,
            title,
            status,
            applicants,
            posted_at,
            posted_by_user_id,
            categories
        `)
        .order("posted_at", { ascending: false });

    console.log("=== JOBS FETCH ===");
    console.log("Error:", jobsError);
    console.log("Data:", jobsData);

    if (jobsError) {
        console.error("Supabase error fetching jobs:", jobsError);
        return [];
    }

    const jobs = (jobsData ?? []) as DBJob[];

    const userIds = Array.from(
        new Set(
            jobs
                .map((job) => job.posted_by_user_id)
                .filter((id): id is string => Boolean(id))
        )
    );

    const [categoryMap, profileMap] = await Promise.all([
        fetchCategoryMap(),
        fetchProfileMap(userIds),
    ]);

    return jobs.map((job) => mapDBJobToJob(job, categoryMap, profileMap));
};
