export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  users_assigned?: number;
  modules_visible?: number;
}

export interface Permission {
  id: string;
  module: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

/** Editable matrix row used by the Add/Edit Role form */
export interface PermissionRow extends Permission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface AdminUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  role_id: string | null;
  role_name: string | null;
  created_at: string | null;
}

export interface CreateAdminUserInput {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role_id: string;
}

export interface CreateAdminUserResult {
  user_id: string;
  email: string;
  password: string;
  role: string;
  emailed: boolean;
}
