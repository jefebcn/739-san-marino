import { supabase } from "@/lib/supabase";
import type { PremioAttivo } from "./api";

/** I premi aperti, letti dal server senza accesso (per la scheda del luogo e la pagina dei premi) */
export async function getPremi(luogo: string | null = null): Promise<PremioAttivo[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("premi_attivi", { p_luogo: luogo });
  if (error) {
    if (error.code !== "PGRST202") console.error("premi", error.message);
    return [];
  }
  return (data ?? []) as PremioAttivo[];
}
