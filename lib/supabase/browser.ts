import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Client Supabase per il browser, con la sessione salvata nei cookie (Supabase Auth).
// Le letture pubbliche lato server restano su lib/supabase.ts.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://txjwvjcfubskvjxaelih.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_VrO6oO8gEvp0ETr39R2y3w_flQbadKk";

let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (!client) client = createBrowserClient(url, key);
  return client;
}
