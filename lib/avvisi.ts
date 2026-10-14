import { supabase } from "./supabase";
import type { NomeIcona } from "@/components/Icona";

// Avvisi (migrazione 0018): strade chiuse, servizi sospesi, allerte meteo, cambi di programma.

export type Avviso = {
  id: string;
  titolo: string;
  testo: string | null;
  tipo: "strada" | "servizio" | "meteo" | "evento" | "altro";
  castello_id: number | null;
  luogo_id: string | null;
  lat: number | null;
  lng: number | null;
  dal: string;
  al: string | null;
  gravita: "info" | "attenzione";
  fonte_nome: string | null;
  fonte_link: string | null;
  luogo: { id: string; nome: string; lat: number; lng: number } | null;
};

export const TIPI_AVVISO: Record<Avviso["tipo"], { nome: string; icona: NomeIcona }> = {
  strada: { nome: "Strade", icona: "strada" },
  servizio: { nome: "Servizi", icona: "allerta" },
  meteo: { nome: "Meteo", icona: "pioggia" },
  evento: { nome: "Eventi", icona: "eventi" },
  altro: { nome: "Avviso", icona: "avvisi" },
};

const CAMPI = "id, titolo, testo, tipo, castello_id, luogo_id, lat, lng, dal, al, gravita, fonte_nome, fonte_link, luogo:luoghi(id, nome, lat, lng)";

/** Avvisi in corso adesso e, con `giorni`, anche quelli che iniziano nei prossimi giorni. Prima quelli di attenzione. */
export async function getAvvisi({ giorni = 0 }: { giorni?: number } = {}): Promise<Avviso[]> {
  const db = supabase();
  if (!db) return [];
  const adesso = new Date().toISOString();
  const fino = new Date(Date.now() + giorni * 86_400_000).toISOString();
  const { data, error } = await db
    .from("avvisi")
    .select(CAMPI)
    .lte("dal", giorni ? fino : adesso)
    .or(`al.is.null,al.gt.${adesso}`)
    .order("gravita", { ascending: true })
    .order("dal", { ascending: false })
    .limit(50);
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("avvisi", error.message);
    return [];
  }
  return (data ?? []) as unknown as Avviso[];
}

export const inCorso = (a: Avviso, ora = Date.now()) => new Date(a.dal).getTime() <= ora && (!a.al || new Date(a.al).getTime() > ora);
