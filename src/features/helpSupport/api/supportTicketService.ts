import { supabase } from "services/supabaseClient";
import type { SupportTicket as SupportTicketBase, SupportTicketUser } from "../types";

type SupportTicket = SupportTicketBase;

type SupportTicketRow = {
  id: string;
  user_id: string;
  description: string;
  attachment_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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

// const getString = (
//   row: Record<string, unknown>,
//   keys: string[],
//   fallback = ""
// ): string => {
//   for (const key of keys) {
//     const value = row[key];

//     if (typeof value === "string" && value.trim()) {
//       return value;
//     }

//     if (typeof value === "number") {
//       return String(value);
//     }
//   }

//   return fallback;
// };

// const getNullableString = (
//   row: Record<string, unknown>,
//   keys: string[]
// ): string | null => {
//   const value = getString(row, keys);
//   return value || null;
// };

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

const fetchUserTypeMap = async (): Promise<Map<string, string>> => {
  const { data, error } = await supabase.from("user_types").select("id, type");

  if (error) {
    console.warn("Supabase error fetching user_types:", error);
    return new Map();
  }

  return new Map(
    ((data ?? []) as UserTypeRow[]).map((row) => [
      row.id,
      titleCase(row.type || "User"),
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

// const getAttachmentUrl = (path: string | null): string | null => {
//   if (!path) return null;

//   if (path.startsWith("http://") || path.startsWith("https://")) {
//     return path;
//   }

//   const { data } = supabase.storage
//     .from("support-tickets")
//     .getPublicUrl(path);

//   return data.publicUrl;
// };

const mapTicket = (
  row: SupportTicketRow,
  profileMap: Map<string, SupportTicketUser>
): SupportTicket => {
  return {
    id: row.id,
    ticketId: makeDisplayId(row.id),
    userId: row.user_id,
    user: profileMap.get(row.user_id) ?? null,
    description: row.description,
    attachmentPath: row.attachment_path,
    status: row.status?.trim().toLowerCase() || "open",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// const mapTicket = (
//   row: SupportTicketRow,
//   profileMap: Map<string, SupportTicketUser>
// ): SupportTicket => {
//   const userId = getNullableString(row, [
//     "user_id",
//     "userId",
//     "profile_id",
//     "profileId",
//     "created_by",
//     "createdBy",
//   ]);
//   const status = getString(row, ["status", "ticket_status", "ticketStatus"], "open")
//     .trim()
//     .toLowerCase();

//   const rawAttachmentPath = getNullableString(row, [
//   "attachment_path",
//   "attachmentPath",
//   "attachment_url",
//   "attachmentUrl",
//   "attachment",
//   "file_url",
//   "fileUrl",
// ]);

// const ticketObj: SupportTicket = {
//   id: row.id,
//   ticketId: makeDisplayId(row.id),
//   userId,
//   user: userId ? profileMap.get(userId) ?? null : null,
//   description: getString(row, [
//     "description",
//     "message",
//     "content",
//     "body",
//     "details",
//     "issue",
//     "reason",
//   ]),
//   attachmentPath: getAttachmentUrl(rawAttachmentPath),
//   status: status || "open",
//   createdAt: getNullableString(row, ["created_at", "createdAt", "created_on", "createdOn"]),
//   updatedAt: getNullableString(row, ["updated_at", "updatedAt", "updated_on", "updatedOn"]),
// };

//   return ticketObj;
// };

export const fetchSupportTickets = async (): Promise<SupportTicket[]> => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select(`
      id,
      user_id,
      description,
      attachment_path,
      status,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error fetching support_tickets:", error);
    return [];
  }

  const tickets = (data ?? []) as SupportTicketRow[];

  console.log("Raw support tickets:", tickets);

  const userIds = tickets.map((ticket) => ticket.user_id).filter(Boolean);

  const userTypeMap = await fetchUserTypeMap();
  const profileMap = await fetchProfileMap(userIds, userTypeMap);

  const mappedTickets = tickets.map((ticket) => mapTicket(ticket, profileMap));

  console.log("Mapped support tickets:", mappedTickets);

  return mappedTickets;
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

// export const updateSupportTicketStatus = async (
//   ticketId: string,
//   status: string
// ): Promise<boolean> => {
//   const { error } = await supabase
//     .from("support_tickets")
//     .update({
//       status,
//     })
//     .eq("id", ticketId);

//   if (error) {
//     console.error("Supabase error updating support_tickets:", error);
//     return false;
//   }

//   return true;
// };
