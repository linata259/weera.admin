// src/features/users/api/userServices.ts

import { supabase } from 'services/supabaseClient';

export const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('profiles') // your public users table
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);

    return [];
  }

  return data ?? [];
};