import { supabase } from "@/lib/supabase";
import type { Sport } from "./tipi";

/** Elenco degli sport (lettura pubblica, lato server). */
export async function getSport(): Promise<Sport[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.from("sport").select("id, nome, giocatori_per_squadra, ordine").order("ordine");
  if (error) {
    console.error("sport", error.message);
    return [];
  }
  return data ?? [];
}
