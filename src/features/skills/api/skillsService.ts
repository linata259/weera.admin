/* ─── src/features/skills/api/skillsService.ts ──────────────── */
import { supabase } from 'services/supabaseClient';
import { JobCategory, Skill } from '../types';

/* ── Categories ─────────────────────────────────────────────── */
export const fetchCategories = async (): Promise<JobCategory[]> => {
  const { data, error } = await supabase
    .from('job_categories')
    .select('id, name, created_at')
    .order('name', { ascending: true });
  if (error) { console.error('Supabase (job_categories):', error); return []; }
  return (data ?? []) as JobCategory[];
};

export const createCategory = async (name: string): Promise<JobCategory | null> => {
  const { data, error } = await supabase
    .from('job_categories')
    .insert({ name: name.trim() })
    .select('id, name, created_at')
    .single();
  if (error) { console.error('Supabase (create category):', error); return null; }
  return data as JobCategory;
};

export const updateCategory = async (id: string, name: string): Promise<boolean> => {
  const { error } = await supabase
    .from('job_categories')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) { console.error('Supabase (update category):', error); return false; }
  return true;
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('job_categories')
    .delete()
    .eq('id', id);
  if (error) { console.error('Supabase (delete category):', error); return false; }
  return true;
};

/* ── Skills ─────────────────────────────────────────────────── */
export const fetchSkills = async (): Promise<Skill[]> => {
  const { data, error } = await supabase
    .from('skills')
    .select('id, name, created_at')
    .order('name', { ascending: true });
  if (error) { console.error('Supabase (skills):', error); return []; }
  return (data ?? []) as Skill[];
};

export const createSkill = async (name: string): Promise<Skill | null> => {
  const { data, error } = await supabase
    .from('skills')
    .insert({ name: name.trim() })
    .select('id, name, created_at')
    .single();
  if (error) { console.error('Supabase (create skill):', error); return null; }
  return data as Skill;
};

export const updateSkill = async (id: string, name: string): Promise<boolean> => {
  const { error } = await supabase
    .from('skills')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) { console.error('Supabase (update skill):', error); return false; }
  return true;
};

export const deleteSkill = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id);
  if (error) { console.error('Supabase (delete skill):', error); return false; }
  return true;
};