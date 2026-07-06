/* ─── src/features/locations/api/locationsService.ts ─────────────
   CRUD for the administrative-area tables used by the Weera app:
   counties → subcounties → wards (jobs reference these for on-site
   locations).                                                      */
import { supabase } from 'services/supabaseClient';
import { County, SubCounty, Ward } from '../types';

/* ── Fetch ──────────────────────────────────────────────────── */
export const fetchCounties = async (): Promise<County[]> => {
    const { data, error } = await supabase
        .from('counties')
        .select('id, name, created_at')
        .order('name', { ascending: true });
    if (error) { console.error('Supabase (counties):', error); return []; }
    return (data ?? []) as County[];
};

export const fetchSubcounties = async (): Promise<SubCounty[]> => {
    const { data, error } = await supabase
        .from('subcounties')
        .select('id, county_id, name, created_at')
        .order('name', { ascending: true });
    if (error) { console.error('Supabase (subcounties):', error); return []; }
    return (data ?? []) as SubCounty[];
};

export const fetchWards = async (): Promise<Ward[]> => {
    const { data, error } = await supabase
        .from('wards')
        .select('id, subcounty_id, name, created_at')
        .order('name', { ascending: true });
    if (error) { console.error('Supabase (wards):', error); return []; }
    return (data ?? []) as Ward[];
};

/* ── Counties ───────────────────────────────────────────────── */
export const createCounty = async (name: string): Promise<County | null> => {
    const { data, error } = await supabase
        .from('counties')
        .insert({ name: name.trim() })
        .select('id, name, created_at')
        .single();
    if (error) { console.error('Supabase (create county):', error); return null; }
    return data as County;
};

export const updateCounty = async (id: string, name: string): Promise<boolean> => {
    const { error } = await supabase.from('counties').update({ name: name.trim() }).eq('id', id);
    if (error) { console.error('Supabase (update county):', error); return false; }
    return true;
};

export const deleteCounty = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('counties').delete().eq('id', id);
    if (error) { console.error('Supabase (delete county):', error); return false; }
    return true;
};

/* ── Subcounties ────────────────────────────────────────────── */
export const createSubcounty = async (countyId: string, name: string): Promise<SubCounty | null> => {
    const { data, error } = await supabase
        .from('subcounties')
        .insert({ county_id: countyId, name: name.trim() })
        .select('id, county_id, name, created_at')
        .single();
    if (error) { console.error('Supabase (create subcounty):', error); return null; }
    return data as SubCounty;
};

export const updateSubcounty = async (id: string, name: string): Promise<boolean> => {
    const { error } = await supabase.from('subcounties').update({ name: name.trim() }).eq('id', id);
    if (error) { console.error('Supabase (update subcounty):', error); return false; }
    return true;
};

export const deleteSubcounty = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('subcounties').delete().eq('id', id);
    if (error) { console.error('Supabase (delete subcounty):', error); return false; }
    return true;
};

/* ── Wards ──────────────────────────────────────────────────── */
export const createWard = async (subcountyId: string, name: string): Promise<Ward | null> => {
    const { data, error } = await supabase
        .from('wards')
        .insert({ subcounty_id: subcountyId, name: name.trim() })
        .select('id, subcounty_id, name, created_at')
        .single();
    if (error) { console.error('Supabase (create ward):', error); return null; }
    return data as Ward;
};

export const updateWard = async (id: string, name: string): Promise<boolean> => {
    const { error } = await supabase.from('wards').update({ name: name.trim() }).eq('id', id);
    if (error) { console.error('Supabase (update ward):', error); return false; }
    return true;
};

export const deleteWard = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('wards').delete().eq('id', id);
    if (error) { console.error('Supabase (delete ward):', error); return false; }
    return true;
};
