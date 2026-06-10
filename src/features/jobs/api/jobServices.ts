import { supabase } from 'services/supabaseClient';
import type { Job } from '../pages/Jobs';

type DBJob = {
    id: string;
    [key: string]: unknown;
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

async function fetchLocationMap(): Promise<Map<string, string>> {
    const { data, error } = await supabase
        .from("locations")
        .select("id, location");

    if (error) {
        console.warn("Supabase error fetching locations:", error);
        return new Map();
    }

    return new Map(
        ((data ?? []) as { id: string; location: string }[]).map((row) => [
            row.id,
            row.location,
        ])
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

function getString(row: DBJob, keys: string[]): string | null {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }
    return null;
}

function getNumber(row: DBJob, key: string): number | null {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return null;
}

function getStringArray(row: DBJob, keys: string[]): string[] {
    for (const key of keys) {
        const value = row[key];
        if (Array.isArray(value)) {
            return value
                .map((item) => {
                    if (typeof item === "string") return item;
                    if (typeof item === "number") return String(item);
                    return "";
                })
                .filter(Boolean);
        }
        if (typeof value === "string" && value.trim()) {
            return value
                .split(/\r?\n|,/)
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }
    return [];
}

function mapDBJobToJob(
    row: DBJob,
    categoryMap: Map<string, string>,
    profileMap: Map<string, DBProfile>,
    locationMap: Map<string, string>
): Job {
    const categoriesId = getStringArray(row, ["categories", "category_ids"]);

    const categoryNames = categoriesId
        .map((id) => categoryMap.get(id) ?? id)
        .filter((name): name is string => Boolean(name));

    const postedByUserId = getString(row, [
        "posted_by_user_id",
        "posted_by",
        "user_id",
        "client_id",
    ]);

    const profile = postedByUserId
        ? profileMap.get(postedByUserId)
        : null;

    const postedByName = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
        : "";

    const locationIds = getStringArray(row, ["location_id", "location_ids", "locations"]);
    const locationFromIds = locationIds
        .map((id) => locationMap.get(id))
        .filter((name): name is string => Boolean(name))
        .join(", ");

    return {
        id: row.id,
        jobId: makeDisplayJobId(row.id),
        title: getString(row, ["title", "job_title"]) ?? "",
        jobType: categoryNames[0] ?? "General",
        categories: categoryNames,
        status: getString(row, ["status"]) ?? "pending",
        applicants: getNumber(row, "applicants") ?? 0,
        posted_at: getString(row, ["posted_at", "created_at"]) ?? null,
        description: getString(row, [
            "description",
            "job_description",
            "details",
            "job_details",
        ]) ?? "",
        specifications: getStringArray(row, [
            "specifications",
            "requirements",
            "job_specifications",
            "skills_required",
        ]),
        attachments: getStringArray(row, [
            "attachments",
            "job_attachments",
            "attachment_urls",
            "files",
        ]),
        location: getString(row, ["location", "location_name", "address"]) ?? locationFromIds,

        posted_by_user_id: postedByUserId,
        posted_by_name:
            postedByName ||
            getString(row, ["posted_by_name", "client_name", "poster_name"]) ||
            "Unknown",
        posted_by_image: profile?.image_url ?? null,
    };
}

export const fetchJobs = async (): Promise<Job[]> => {
    const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
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
                .map((job) =>
                    getString(job, [
                        "posted_by_user_id",
                        "posted_by",
                        "user_id",
                        "client_id",
                    ])
                )
                .filter((id): id is string => Boolean(id))
        )
    );

    const [categoryMap, profileMap, locationMap] = await Promise.all([
        fetchCategoryMap(),
        fetchProfileMap(userIds),
        fetchLocationMap(),
    ]);

    return jobs.map((job) => mapDBJobToJob(job, categoryMap, profileMap, locationMap));
};
