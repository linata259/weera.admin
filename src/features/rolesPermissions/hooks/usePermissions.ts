// Thin wrapper around the shared PermissionsContext so existing imports
// keep working. Permissions are fetched ONCE per login by the provider —
// components no longer race each other with independent fetches.
export type { ModulePermission } from "../PermissionsContext";
export { usePermissionsContext as usePermissions } from "../PermissionsContext";
