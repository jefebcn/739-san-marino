import { supabaseBrowser } from "@/lib/supabase/browser";
import type { DettaglioPartita, Giocatore, Partita, RigaCastello, RigaClassifica } from "./tipi";

type ErroreDb = { code?: string; message: string } | null;

/** I messaggi scritti nelle funzioni del database (raise exception) sono già pensati per l'utente. */
function messaggio(e: ErroreDb) {
  if (!e) return null;
  if (e.code === "P0001") return e.message;
  if (e.code === "PGRST202") return "Questa azione non è ancora attiva. Riprova più tardi.";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}

const db = () => supabaseBrowser();

export async function elencoPartite(sport: string | null) {
  const { data, error } = await db().rpc("elenco_partite", { p_sport: sport });
  return { partite: (data ?? []) as Partita[], errore: messaggio(error) };
}

export async function dettaglioPartita(id: string) {
  const { data, error } = await db().rpc("dettaglio_partita", { p_partita: id });
  return { partita: ((data ?? [])[0] as DettaglioPartita | undefined) ?? null, errore: messaggio(error) };
}

export async function giocatoriPartita(id: string) {
  const { data, error } = await db().rpc("giocatori_partita", { p_partita: id });
  return { giocatori: (data ?? []) as Giocatore[], errore: messaggio(error) };
}

export async function creaPartita(dati: { sport: string; titolo: string; inizio: string; luogo: string; lat: number | null; lng: number | null }) {
  const { data, error } = await db().rpc("crea_partita", {
    p_sport: dati.sport,
    p_titolo: dati.titolo,
    p_inizio: dati.inizio,
    p_luogo: dati.luogo,
    p_lat: dati.lat,
    p_lng: dati.lng,
  });
  return { id: (data as string | null) ?? null, errore: messaggio(error) };
}

async function azione(nome: string, argomenti: Record<string, unknown>) {
  const { error } = await db().rpc(nome, argomenti);
  return { errore: messaggio(error) };
}

export const iscriviti = (id: string) => azione("iscriviti_partita", { p_partita: id });
export const ritirati = (id: string) => azione("ritirati_partita", { p_partita: id });
export const annulla = (id: string) => azione("annulla_partita", { p_partita: id });
export const formaSquadre = (id: string) => azione("forma_squadre", { p_partita: id });
export const registraRisultato = (id: string, a: number, b: number) => azione("registra_risultato", { p_partita: id, p_punti_a: a, p_punti_b: b });

export async function classificaSport(sport: string) {
  const { data, error } = await db().rpc("classifica_sport", { p_sport: sport });
  return { righe: (data ?? []) as RigaClassifica[], errore: messaggio(error) };
}

export async function classificaCastelli(sport: string) {
  const { data, error } = await db().rpc("classifica_castelli_sport", { p_sport: sport });
  return { righe: (data ?? []) as RigaCastello[], errore: messaggio(error) };
}

/** Il rating dello sport in cui ho giocato di più, per la Card SMR ID. */
export async function mioRating(utenteId: string) {
  const { data } = await db().from("rating_sport").select("rating, partite").eq("utente_id", utenteId).order("partite", { ascending: false }).limit(1);
  return (data?.[0]?.rating as number | undefined) ?? null;
}
