import { supabase } from "../../../services/supabaseClient";

export type FormSubmission = Record<string, unknown> & { id?: string | number };

const TABLE = "form_submissions";
const DATE_KEYS = ["created_at", "submitted_at", "inserted_at", "updated_at"];

export const fetchFormSubmissions = async (
  limit = 1000,
): Promise<FormSubmission[]> => {
  // Column set isn't fixed, so try the usual timestamp columns for ordering
  // and fall back to an unordered read if none exist.
  for (const key of DATE_KEYS) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order(key, { ascending: false })
      .limit(limit);
    if (!error) return (data ?? []) as FormSubmission[];
    if (error.code !== "42703" && !/column/i.test(error.message)) throw error;
  }
  const { data, error } = await supabase.from(TABLE).select("*").limit(limit);
  if (error) throw error;
  return (data ?? []) as FormSubmission[];
};
