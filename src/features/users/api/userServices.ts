// src/features/users/api/userServices.ts

import { supabase } from 'services/supabaseClient';
import type { User } from '../pages/Users';

/** Fetch the user_types lookup table and return an id → type name map. */
async function fetchUserTypeMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('user_types')
    .select('id, type');

  if (error) {
    console.error('Supabase error (user_types):', error);
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.id as string, (row.type as string).toLowerCase()]));
}

/** Fetch the locations lookup table and return an id → location name map. */
async function fetchLocationMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, location');
    console.log('Fetched locations:', data);

  if (error) {
    console.error('Supabase error (locations):', error);
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.id as string, row.location as string]));
}

/** Converts a raw profiles row into a typed User, adding computed display helpers. */
function mapProfileToUser(
  row: Record<string, unknown>,
  userTypeMap: Map<string, string>,
  locationMap: Map<string, string>,
): User {
  const firstName = (row.first_name as string | null) ?? '';
  const lastName  = (row.last_name  as string | null) ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || '—';

  const locationId: string[] = Array.isArray(row.location_id)
    ? (row.location_id as string[])
    : [];

  const userTypeId: string[] = Array.isArray(row.user_type_id)
    ? (row.user_type_id as string[])
    : [];

  // Resolve location UUIDs → human-readable location names
  const locationNames: string[] = locationId
    .map((id) => locationMap.get(id))
    .filter((t): t is string => !!t);

  // Resolve UUIDs → human-readable type names, e.g. ["hire talent"], ["find work"]
  const userTypeNames: string[] = userTypeId
    .map((id) => userTypeMap.get(id))
    .filter((t): t is string => !!t);

  return {
    id:                    (row.id as string) ?? '',
    first_name:            firstName || null,
    last_name:             lastName  || null,
    image_url:             (row.image_url             as string | null) ?? null,
    about_me:              (row.about_me              as string | null) ?? null,
    professional_headline: (row.professional_headline as string | null) ?? null,
    location_allowed:      (row.location_allowed      as boolean | null) ?? null,
    certifications:        Array.isArray(row.certifications)      ? (row.certifications      as string[]) : [],
    location_id:           locationId,
    user_type_id:          userTypeId,
    user_type_names:       userTypeNames,  // ← resolved names for filtering
    skills_id:             Array.isArray(row.skills_id)           ? (row.skills_id           as string[]) : [],
    profile_attachments:   Array.isArray(row.profile_attachments) ? (row.profile_attachments as string[]) : [],
    phone:                 (row.phone      as string | null) ?? null,
    created_at:            (row.created_at as string | null) ?? null,
    updated_at:            (row.updated_at as string | null) ?? null,

    // Computed display helpers
    name,
    location: locationNames[0] ?? '—',  // resolved from locations table
    location_names: locationNames,
  };
}

export const fetchUsers = async (): Promise<User[]> => {
  // Fetch all three in parallel
  const [userTypeMap, locationMap, profilesResult] = await Promise.all([
    fetchUserTypeMap(),
    fetchLocationMap(),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
  ]);

  if (profilesResult.error) {
    console.error('Supabase error (profiles):', profilesResult.error);
    return [];
  }

  return (profilesResult.data ?? []).map((row) =>
    mapProfileToUser(row as Record<string, unknown>, userTypeMap, locationMap)
  );
};