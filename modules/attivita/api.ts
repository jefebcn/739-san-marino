import { supabaseBrowser } from "@/lib/supabase/browser";
import { CAMPI_SCHEDA, type Luogo } from "@/lib/data";

// Profilo base delle attività (Fase 2, migrazione 0034): il titolare chiede la scheda, la redazione verifica,
// poi il titolare la aggiorna. Tutto passa dalle funzioni del database, che controllano chi può fare cosa.

/** Le categorie di luoghi che sono attività private (come categoria_attivita() nel database) */
export const CATEGORIE_ATTIVITA = new Set(["locale", "negozio", "carburante", "azienda", "professionista", "artigiano", "animali", "associazione"]);

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
/** La scheda pubblica è in cache: dopo un salvataggio si fa rigenerare subito (app/api/rivalida) */
const rigenera = (luogo: string) =>
  fetch("/api/rivalida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percorso: `/luoghi/${luogo}` }) }).catch(() => {});

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
  if (!error) await rigenera(luogo);
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

// ——— 739 Pro (migrazione 0035): 3,99 € al mese o 39 € all'anno, attivato da un amministratore ———

export const PREZZO_PRO = "3,99 € al mese, oppure 39 € all'anno";
export type Offerta = { id: string; titolo: string; testo: string | null; dal: string; al: string };
export type MioPro = { attivo: boolean; fino: string | null; menu_url: string | null; prenota_url: string | null; offerte: Offerta[] };
export type Numero = { tipo: string; totale: number; ultimi7: number };

export async function mioPro(luogo: string) {
  const { data, error } = await db().rpc("mio_pro", { p_luogo: luogo });
  return { pro: (data as MioPro | null) ?? null, errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

export async function salvaPro(luogo: string, menu: string, prenota: string) {
  const { error } = await db().rpc("salva_pro", { p_luogo: luogo, p_menu: menu, p_prenota: prenota });
  if (!error) await rigenera(luogo);
  return { errore: messaggio(error) };
}

export async function salvaOfferta(luogo: string, o: { id: string | null; titolo: string; testo: string; dal: string; al: string }) {
  const { error } = await db().rpc("salva_offerta", { p_luogo: luogo, p_id: o.id, p_titolo: o.titolo, p_testo: o.testo, p_dal: o.dal, p_al: o.al });
  if (!error) await rigenera(luogo);
  return { errore: messaggio(error) };
}

export async function togliOfferta(id: string, luogo: string) {
  const { error } = await db().rpc("togli_offerta", { p_id: id });
  if (!error) await rigenera(luogo);
  return { errore: messaggio(error) };
}

export async function numeriScheda(luogo: string, giorni = 30) {
  const { data, error } = await db().rpc("numeri_scheda", { p_luogo: luogo, p_giorni: giorni });
  return { numeri: (data ?? []) as Numero[], errore: messaggio(error) };
}

export async function impostaPro(luogo: string, fino: string | null) {
  const { error } = await db().rpc("imposta_pro", { p_luogo: luogo, p_fino: fino });
  if (!error) await rigenera(luogo);
  return { errore: messaggio(error) };
}

export async function elencoPro() {
  const { data, error } = await db().rpc("elenco_pro");
  return { pro: new Map(((data ?? []) as { luogo_id: string; fino: string }[]).map((p) => [p.luogo_id, p.fino])), errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

// ——— Aggiungi la tua attività (migrazione 0036): il titolare propone una scheda nuova, la redazione la crea ———

export type NuovaAttivita = {
  nome: string; categoria: string; sottocategoria: string; castello_id: string; indirizzo: string; lat: number | null; lng: number | null;
  descrizione: string; telefono: string; email: string; sito: string; chi: string; telefono_verifica: string; nota: string;
};
export type MiaProposta = { id: string; nome: string; categoria: string; sottocategoria: string; stato: "richiesta" | "rifiutata"; nota_redazione: string | null; creato_il: string };
export type Proposta = {
  id: string; nome: string; categoria: string; sottocategoria: string; castello_id: number | null; indirizzo: string; lat: number; lng: number;
  descrizione: string | null; telefono: string | null; email_attivita: string | null; sito: string | null; chi: string; telefono_verifica: string;
  nota: string | null; email: string | null; stato: "richiesta" | "approvata" | "rifiutata"; nota_redazione: string | null; luogo_id: string | null; creato_il: string;
};

export async function proponiAttivita(dati: NuovaAttivita) {
  const { error } = await db().rpc("proponi_attivita", { p: dati });
  return { errore: error?.code === "PGRST202" ? "Questa funzione non è ancora attiva nel database (migrazione 0036)." : messaggio(error) };
}

export async function mieProposte() {
  const { data, error } = await db().rpc("mie_proposte_attivita");
  // Prima della migrazione 0036 la funzione non c'è: nessuna proposta
  return { proposte: (data ?? []) as MiaProposta[], errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

export async function proposteAttivita(stato: Proposta["stato"]) {
  const { data, error } = await db().rpc("proposte_attivita", { p_stato: stato });
  return { proposte: (data ?? []) as Proposta[], errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

export async function decidiProposta(id: string, stato: "approvata" | "rifiutata", nota: string) {
  const { data, error } = await db().rpc("decidi_proposta_attivita", { p_id: id, p_stato: stato, p_nota: nota || null });
  return { luogo: (data as string | null) ?? null, errore: messaggio(error) };
}
