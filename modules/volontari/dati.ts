import { supabase } from "@/lib/supabase";
import type { Chiamata, DettaglioChiamata } from "./api";

// Le chiamate di volontari lette dal server senza accesso (migrazione 0051)

export async function getChiamate(): Promise<Chiamata[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("chiamate_volontari", { p_limite: 60 });
  if (error) {
    if (error.code !== "PGRST202") console.error("volontari", error.message);
    return [];
  }
  return (data ?? []) as Chiamata[];
}

export async function getChiamata(id: string): Promise<DettaglioChiamata | null> {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db.rpc("chiamata_volontari", { p_id: id });
  if (error) return null;
  return ((data ?? []) as DettaglioChiamata[])[0] ?? null;
}
