import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Valori pubblici del progetto Supabase "739-san-marino": la chiave publishable è fatta per stare nel browser.
// Le regole di sicurezza (RLS) del database decidono cosa si può leggere e scrivere.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://txjwvjcfubskvjxaelih.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_VrO6oO8gEvp0ETr39R2y3w_flQbadKk";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
