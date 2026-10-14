import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Formato, RigaGirone, Torneo, TorneoDiPartita } from "./tornei";

// Tornei di castello (migrazione 0025): letture e azioni passano dalle funzioni del database, che fanno i controlli.

type ErroreDb = { code?: string; message: string } | null;

function messaggio(e: ErroreDb) {
  if (!e) return null;
  if (e.code === "P0001") return e.message;
  if (e.code === "PGRST202") return "I tornei non sono ancora attivi nel database (migrazione 0025).";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}

const db = () => supabaseBrowser();

export async function dettaglioTorneo(id: string) {
  const { data, error } = await db().rpc("dettaglio_torneo", { p_torneo: id });
  return { torneo: (data as Torneo | null) ?? null, errore: messaggio(error) };
}

export async function classificaGirone(id: string) {
  const { data, error } = await db().rpc("classifica_girone", { p_torneo: id });
  return { righe: (data ?? []) as RigaGirone[], errore: messaggio(error) };
}

export async function torneoDiPartita(partita: string) {
  const { data } = await db().rpc("torneo_di_partita", { p_partita: partita });
  return (data as TorneoDiPartita | null) ?? null;
}

export type DatiTorneo = {
  titolo: string;
  descrizione?: string;
  sport_id: string;
  formato: Formato;
  dal: string;
  al?: string;
  luogo_id?: string;
  luogo_nome?: string;
  metri: number;
};

export async function creaTorneo(d: DatiTorneo) {
  const { data, error } = await db().rpc("crea_torneo", { p_dati: d });
  return { id: (data as string | null) ?? null, errore: messaggio(error) };
}

export async function iscriviSquadra(torneo: string, nome: string) {
  const { data, error } = await db().rpc("iscrivi_squadra", { p_torneo: torneo, p_nome: nome });
  return { codice: (data as string | null) ?? null, errore: messaggio(error) };
}

export async function unisciti(codice: string) {
  const { error } = await db().rpc("unisciti_squadra", { p_codice: codice });
  return { errore: messaggio(error) };
}

export async function programmaIncontro(incontro: string, inizio: string, luogo: string) {
  const { data, error } = await db().rpc("programma_incontro", { p_incontro: incontro, p_inizio: inizio, p_luogo: luogo });
  return { partita: (data as string | null) ?? null, errore: messaggio(error) };
}

async function azione(nome: string, argomenti: Record<string, unknown>) {
  const { error } = await db().rpc(nome, argomenti);
  return { errore: messaggio(error) };
}

export const lasciaSquadra = (torneo: string) => azione("lascia_squadra", { p_torneo: torneo });
export const avviaTorneo = (torneo: string) => azione("avvia_torneo", { p_torneo: torneo });
export const annullaTorneo = (torneo: string) => azione("annulla_torneo", { p_torneo: torneo });
