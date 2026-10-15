import { supabaseBrowser } from "@/lib/supabase/browser";
import { CAMPI_SCHEDA, type Luogo } from "@/lib/data";

// Profilo base delle attività (Fase 2, migrazione 0034): il titolare chiede la scheda, la redazione verifica,
// poi il titolare la aggiorna. Tutto passa dalle funzioni del database, che controllano chi può fare cosa.

/** Le categorie di luoghi che sono attività private (come categoria_attivita() nel database) */
export const CATEGORIE_ATTIVITA = new Set(["locale", "negozio", "carburante"]);

export type MiaAttivita = { id: string; luogo_id: string; nome: string; categoria: string; sottocategoria: string | null; stato: StatoRichiesta; piano: string; nota_redazione: string | null; creato_il: string };
export type StatoRichiesta = "richiesta" | "approvata" | "rifiutata" | "revocata";
export type Richiesta = {
  id: string; luogo_id: string; nome: string; categoria: string; indirizzo: string | null; telefono_scheda: string | null;
  chi: string; telefono: string; nota: string | null; email: string | null; stato: StatoRichiesta; nota_redazione: string | null; creato_il: string;
};
export type Orari = Record<string, [string, string][]>;
export type DatiAttivita = {
  descrizione?: string; indirizzo?: string; telefono?: string; email?: string; sito?: string;
  orari?: string; orari_settimana?: Orari; foto_url?: string; foto_credito?: string;
};

type ErroreDb = { code?: string; message: string } | null;
function messaggio(e: ErroreDb) {
  if (!e) return null;
  if (e.code === "P0001") return e.message;
  if (e.code === "PGRST202") return "Questa funzione non è ancora attiva nel database (migrazione 0034).";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}
const db = () => supabaseBrowser();

export async function chiediAttivita(luogo: string, chi: string, telefono: string, nota: string) {
  const { error } = await db().rpc("chiedi_attivita", { p_luogo: luogo, p_chi: chi, p_telefono: telefono, p_nota: nota || null });
  return { errore: messaggio(error) };
}

export async function mieAttivita() {
  const { data, error } = await db().rpc("mie_attivita");
  return { attivita: (data ?? []) as MiaAttivita[], errore: messaggio(error) };
}

export async function luogoDaModificare(id: string) {
  const { data, error } = await db().from("luoghi").select(CAMPI_SCHEDA).eq("id", id).maybeSingle();
  return { luogo: (data as Luogo | null) ?? null, errore: error ? "La scheda non si è caricata. Riprova." : null };
}

export async function salvaMiaAttivita(luogo: string, dati: DatiAttivita) {
  const { error } = await db().rpc("salva_mia_attivita", { p_luogo: luogo, p_dati: dati });
  return { errore: messaggio(error) };
}

export async function richiesteAttivita(stato: StatoRichiesta) {
  const { data, error } = await db().rpc("richieste_attivita", { p_stato: stato });
  return { richieste: (data ?? []) as Richiesta[], errore: messaggio(error) };
}

export async function conteggioRichieste() {
  const { data } = await db().rpc("conteggio_richieste_attivita");
  return typeof data === "number" ? data : null;
}

export async function decidiAttivita(id: string, stato: "approvata" | "rifiutata" | "revocata", nota: string) {
  const { error } = await db().rpc("decidi_attivita", { p_id: id, p_stato: stato, p_nota: nota || null });
  return { errore: messaggio(error) };
}
