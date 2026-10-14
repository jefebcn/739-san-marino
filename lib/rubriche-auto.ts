import { supabase } from "./supabase";

// Le rubriche che si scrivono da sole (passo 1.5, migrazione 0028): solo totali e partite, nessun nome di persona.

export type PartitaSettimana = {
  id: string;
  sport_id: string;
  titolo: string;
  inizio: string;
  luogo_nome: string;
  punteggio_a: number | null;
  punteggio_b: number | null;
  torneo: string | null;
};

export type Settimana = {
  dal: string;
  al: string;
  partite: PartitaSettimana[];
  tornei: { id: string; titolo: string; sport_id: string; castello: number | null }[];
  castelli: { castello_id: number; metri: number }[];
};

export type RigaVetta = { castello_id: number; metri: number; persone: number; posizione: number };

/** La settimana (lunedì-domenica) che contiene il giorno «2026-10-18»; senza giorno, quella in corso */
export async function getPartiteSettimana(giorno?: string): Promise<Settimana | null> {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db.rpc("partite_settimana", { p_giorno: giorno ?? null });
  if (error) {
    if (error.code !== "PGRST202") console.error("partite_settimana", error.message);
    return null;
  }
  return data as Settimana;
}

/** I metri dei castelli nel mese che contiene il giorno; senza giorno, il mese in corso */
export async function getVettaMese(giorno?: string): Promise<RigaVetta[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("vetta_mese", { p_giorno: giorno ?? null });
  if (error) {
    if (error.code !== "PGRST202") console.error("vetta_mese", error.message);
    return [];
  }
  return (data ?? []) as RigaVetta[];
}
