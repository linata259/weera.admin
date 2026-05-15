import { User } from "features/users/pages/Users";


export type Status = "active" | "suspended" | "pending";
export type UserTypeFilter = "all" | "clients" | "bidders";
export type StatusFilter = "all" | "active" | "suspended" | "pending";

export interface Column {
  label: string;
  key: keyof User;
}

export function deriveStatus(user: User): Status {
  if (user.location_allowed === true) return "active";
  if (user.location_allowed === false) return "suspended";
  return "pending";
}