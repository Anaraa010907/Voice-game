import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);

export const supabase = createClient(url ?? "http://localhost", key ?? "missing", {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Нэвтрээгүй бол нэргүй (anonymous) хэрэглэгч үүсгэнэ. */
export async function ensureUser() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user;
  const { data: res, error } = await supabase.auth.signInAnonymously();
  if (error || !res.user) throw new Error(error?.message ?? "Нэвтэрч чадсангүй");
  return res.user;
}
