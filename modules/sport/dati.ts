import { supabase } from "@/lib/supabase";
import type { Partita, Sport } from "./tipi";

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

/** Partite in programma per la Home (lettura pubblica, senza dati personali). */
export async function getPartiteAperte(): Promise<Partita[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("elenco_partite", { p_sport: null });
  if (error) {
    console.error("partite", error.message);
    return [];
  }
  return ((data ?? []) as Partita[]).filter((p) => p.stato === "aperta").slice(0, 8);
}
