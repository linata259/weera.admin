import { supabase } from "services/supabaseClient";
import type { SupportTicket, SupportTicketUser } from "../types";

type SupportTicketRow = {
  id: string;
  [key: string]: unknown;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  phone: string | null;
  user_type_id: string[] | null;
};

type UserTypeRow = {
  id: string;
  type: string;
};

const getString = (
  row: Record<string, unknown>,
  keys: string[],
  fallback = ""
): string => {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
};

const getNullableString = (
  row: Record<string, unknown>,
  keys: string[]
): string | null => {
  const value = getString(row, keys);
  return value || null;
};

const getStringArray = (value: unknown): string[] => {
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
    return [value];
  }

  return [];
};

const makeDisplayId = (id: string): string => {
  const digits = id.replace(/[^0-9]/g, "");
  if (digits) return digits.substring(0, 10).padStart(10, "0");
  return id.slice(0, 10);
};

const titleCase = (value: string): string => {
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatUserType = (value: string): string => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "find work") {
    return "Bidder";
  }

  if (normalized === "hire talent") {
    return "Client";
  }

  return titleCase(value || "User");
};

const inferCategory = (description: string): string => {
  const value = description.toLowerCase();

  if (value.includes("pay") || value.includes("wallet") || value.includes("payout")) {
    return "Payments";
  }

  if (value.includes("job") || value.includes("bid") || value.includes("client")) {
    return "Jobs";
  }

  if (value.includes("login") || value.includes("account") || value.includes("profile")) {
    return "Account";
  }

  if (value.includes("bug") || value.includes("error") || value.includes("crash")) {
    return "Technical";
  }

  return "General";
};

const inferPriority = (
  description: string,
  status: string
): SupportTicket["priority"] => {
  const value = description.toLowerCase();

  if (
    value.includes("urgent") ||
    value.includes("emergency") ||
    value.includes("blocked") ||
    value.includes("can't access") ||
    value.includes("cannot access")
  ) {
    return "urgent";
  }

  if (
    status === "open" &&
    (value.includes("payment") || value.includes("payout") || value.includes("refund"))
  ) {
    return "high";
  }

  if (status === "resolved" || status === "closed") {
    return "low";
  }

  return "normal";
};

const getAttachmentUrl = (attachmentPath: string | null): string | null => {
  if (!attachmentPath) return null;

  if (attachmentPath.startsWith("http://") || attachmentPath.startsWith("https://")) {
    return attachmentPath;
  }

  const [bucket, ...pathParts] = attachmentPath.split("/");
  const path = pathParts.join("/");

  if (!bucket || !path) {
    return attachmentPath;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

const fetchUserTypeMap = async (): Promise<Map<string, string>> => {
  const { data, error } = await supabase.from("user_types").select("id, type");

  if (error) {
    console.warn("Supabase error fetching user_types:", error);
    return new Map();
  }

  return new Map(
    ((data ?? []) as UserTypeRow[]).map((row) => [
      row.id,
      formatUserType(row.type || "User"),
    ])
  );
};

const fetchProfileMap = async (
  userIds: string[],
  userTypeMap: Map<string, string>
): Promise<Map<string, SupportTicketUser>> => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, image_url, phone, user_type_id")
    .in("id", uniqueUserIds);

  if (error) {
    console.warn("Supabase error fetching support ticket profiles:", error);
    return new Map();
  }

  return new Map(
    ((data ?? []) as ProfileRow[]).map((profile) => {
      const firstName = profile.first_name ?? "";
      const lastName = profile.last_name ?? "";
      const name = [firstName, lastName].filter(Boolean).join(" ") || "Unknown User";
      const userTypeIds = getStringArray(profile.user_type_id);
      const userType = userTypeIds.map((id) => userTypeMap.get(id)).find(Boolean) ?? "User";

      return [
        profile.id,
        {
          id: profile.id,
          name,
          imageUrl: profile.image_url ?? null,
          phone: profile.phone ?? null,
          userType,
        },
      ];
    })
  );
};

const mapTicket = (
  row: SupportTicketRow,
  profileMap: Map<string, SupportTicketUser>,
  savedNotes: Record<string, string>
): SupportTicket => {
  const userId = getNullableString(row, ["user_id", "userId", "profile_id", "created_by"]);
  const description = getString(row, ["description", "message", "content", "body"]);
  const status = getString(row, ["status", "ticket_status"], "open").toLowerCase();
  const attachmentPath = getNullableString(row, [
    "attachment_path",
    "attachment_url",
    "attachment",
    "file_url",
  ]);

  return {
    id: row.id,
    ticketId: makeDisplayId(row.id),
    userId,
    user: userId ? profileMap.get(userId) ?? null : null,
    description,
    attachmentPath,
    attachmentUrl: getAttachmentUrl(attachmentPath),
    status: status || "open",
    priority: getString(row, ["priority"], inferPriority(description, status)).toLowerCase(),
    category: titleCase(getString(row, ["category", "type"], inferCategory(description))),
    adminNotes: getString(row, ["admin_notes", "adminNotes", "notes"], savedNotes[row.id] ?? ""),
    createdAt: getNullableString(row, ["created_at", "createdAt", "created_on"]),
    updatedAt: getNullableString(row, ["updated_at", "updatedAt", "updated_on"]),
  };
};

export const fetchSupportTickets = async (
  savedNotes: Record<string, string> = {}
): Promise<SupportTicket[]> => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error fetching support_tickets:", error);
    return [];
  }

  const tickets = (data ?? []) as SupportTicketRow[];
  const userIds = tickets
    .map((ticket) => getNullableString(ticket, ["user_id", "userId", "profile_id", "created_by"]))
    .filter((id): id is string => Boolean(id));

  const userTypeMap = await fetchUserTypeMap();
  const profileMap = await fetchProfileMap(userIds, userTypeMap);

  return tickets.map((ticket) => mapTicket(ticket, profileMap, savedNotes));
};

export const updateSupportTicketStatus = async (
  ticketId: string,
  status: string
): Promise<boolean> => {
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    console.error("Supabase error updating support_tickets:", error);
    return false;
  }

  return true;
};
