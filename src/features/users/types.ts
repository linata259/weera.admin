// src/features/users/types.ts

export type UserStatus =
  | "active"
  | "pending"
  | "suspended"
  | "dormant";

export type UserRole =
  | "admin"
  | "driver"
  | "user";

export interface User {
  id: string;

  first_name?: string | null;
  last_name?: string | null;

  name: string;

  email?: string | null;
  phone?: string | null;

  image_url?: string | null;

  about_me?: string | null;
  professional_headline?: string | null;

  location?: string;
  location_names?: string[];

  location_id?: string[];
  user_type_id?: string[];

  user_type_names?: string[];

  skills_id?: string[];

  certifications?: string[];

  profile_attachments?: string[];

  location_allowed?: boolean | null;

  created_at?: string | null;
  updated_at?: string | null;

  is_active?: boolean | null;

  role?: UserRole;

  status?: UserStatus;
}

export interface Column {
  label: string;
  key: keyof User;
}

export function deriveStatus(user: User): UserStatus {
  if (user.is_active === false) {
    return "suspended";
  }

  return "active";
}