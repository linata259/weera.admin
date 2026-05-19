import { createClient } from '@supabase/supabase-js';



// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
// const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

const supabaseUrl = 'https://mthheftteualuokxambr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aGhlZnR0ZXVhbHVva3hhbWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTM5MzcsImV4cCI6MjA4OTU2OTkzN30.GnyIsmMXdc_5832WscxEpjXClncireLNcKC-_2aj95E';

console.log("Supabase URL loaded:", !!supabaseUrl); 
console.log("Supabase Key loaded:", !!supabaseAnonKey);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);