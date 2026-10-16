import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Orari } from "@/modules/attivita/api";

// Prenotazioni di 739 (migrazione 0046): i centri senza un sistema di prenotazione preparano qui risorse, orari
// e regole; chi ha l'SMR ID prenota uno slot e il gestore conferma. Si paga sul posto. I controlli li fa il database.

export type Risorsa = { id: string; nome: string; descrizione: string | null; durata_min: number; orari?: Orari | null; attiva?: boolean; ordine?: number };
export type InfoPrenota = {
  conferma: "manuale" | "automatica"; nota: string | null; anticipo_ore: number; giorni_avanti: number; disdetta_ore: number; max_attive: number; risorse: Risorsa[];
};
export type Slot = { risorsa_id: string; inizio: string; fine: string; stato: "libero" | "occupato" | "passato" };
export type StatoPrenotazione = "richiesta" | "confermata" | "rifiutata" | "annullata" | "assente";
export type MiaPrenotazione = {
  id: string; luogo_id: string; luogo: string; risorsa: string; inizio: string; fine: string; stato: StatoPrenotazione;
  annullata_da: "cliente" | "gestore" | null; nota_gestore: string | null; disdetta_ore: number; nota_centro: string | null; telefono_centro: string | null;
};
export type Impostazioni = {
  attiva: boolean; conferma: "manuale" | "automatica"; orari: Orari | null; anticipo_ore: number; giorni_avanti: number; disdetta_ore: number; max_attive: number; nota: string | null;
};
export type Gestione = { impostazioni: Impostazioni; orari_scheda: Orari | null; risorse: Risorsa[]; in_attesa: number; oggi: number };
export type PrenotazioneCentro = {
  id: string; risorsa_id: string; risorsa: string; inizio: string; fine: string; stato: StatoPrenotazione; annullata_da: string | null;
  nome: string | null; email: string | null; telefono: string | null; nota: string | null; nota_gestore: string | null; creato_il: string;
};
export type Blocco = { id: string; risorsa_id: string | null; risorsa: string | null; dal: string; al: string; motivo: string | null };

export const STATI: Record<StatoPrenotazione, string> = {
  richiesta: "In attesa di conferma",
  confermata: "Confermata",
  rifiutata: "Non accettata",
  annullata: "Annullata",
  assente: "Non presentato",
};

type ErroreDb = { code?: string; message: string } | null;
function messaggio(e: ErroreDb) {
  if (!e) return null;
  if (e.code === "P0001") return e.message;
  if (e.code === "PGRST202") return "Le prenotazioni non sono ancora attive nel database.";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}
const db = () => supabaseBrowser();
const rigenera = (luogo: string) =>
  fetch("/api/rivalida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percorso: `/luoghi/${luogo}` }) }).catch(() => {});

/** Il giorno AAAA-MM-GG a San Marino, spostato di n giorni da oggi */
export function giornoSM(n = 0) {
  const oggi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());
  return new Date(Date.parse(`${oggi}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
const ora = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });
const giornoLungo = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
export const leggiOra = (iso: string) => ora.format(new Date(iso));
export const leggiGiorno = (iso: string) => giornoLungo.format(new Date(iso));

export async function infoPrenota(luogo: string) {
  const { data, error } = await db().rpc("prenota_info", { p_luogo: luogo });
  return { info: (data as InfoPrenota | null) ?? null, errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

export async function disponibilita(luogo: string, giorno: string) {
  const { data, error } = await db().rpc("prenota_disponibilita", { p_luogo: luogo, p_giorno: giorno });
  return { slot: (data ?? []) as Slot[], errore: messaggio(error) };
}

export async function prenota(risorsa: string, inizio: string, telefono: string, nota: string) {
  const { data, error } = await db().rpc("prenota", { p_risorsa: risorsa, p_inizio: inizio, p_telefono: telefono || null, p_nota: nota || null });
  return { esito: (data as { id: string; stato: StatoPrenotazione } | null) ?? null, errore: messaggio(error) };
}

export async function miePrenotazioni() {
  const { data, error } = await db().rpc("mie_prenotazioni");
  return { prenotazioni: (data ?? []) as MiaPrenotazione[], errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

export async function annullaPrenotazione(id: string) {
  const { error } = await db().rpc("annulla_prenotazione", { p_id: id });
  return { errore: messaggio(error) };
}

// ——— Il gestore ———

export async function gestione(luogo: string) {
  const { data, error } = await db().rpc("prenota_gestione", { p_luogo: luogo });
  return { gestione: (data as Gestione | null) ?? null, errore: messaggio(error) };
}

export async function salvaImpostazioni(luogo: string, i: Impostazioni) {
  const { error } = await db().rpc("salva_prenota_impostazioni", { p_luogo: luogo, p: i });
  if (!error) await rigenera(luogo);
  return { errore: messaggio(error) };
}

export async function salvaRisorsa(luogo: string, id: string | null, r: { nome: string; descrizione: string; durata_min: number; attiva: boolean; orari: Orari | null }) {
  const { error } = await db().rpc("salva_risorsa", { p_luogo: luogo, p_id: id, p: r });
  return { errore: messaggio(error) };
}

export async function prenotazioniCentro(luogo: string, da: string, giorni = 7) {
  const { data, error } = await db().rpc("prenotazioni_luogo", { p_luogo: luogo, p_da: da, p_giorni: giorni });
  return { prenotazioni: (data ?? []) as PrenotazioneCentro[], errore: messaggio(error) };
}

export async function decidi(id: string, stato: "confermata" | "rifiutata" | "annullata" | "assente", nota = "") {
  const { error } = await db().rpc("decidi_prenotazione", { p_id: id, p_stato: stato, p_nota: nota || null });
  return { errore: messaggio(error) };
}

export async function blocchi(luogo: string) {
  const { data, error } = await db().rpc("blocchi_luogo", { p_luogo: luogo });
  return { blocchi: (data ?? []) as Blocco[], errore: messaggio(error) };
}

export async function blocca(luogo: string, risorsa: string | null, dal: string, al: string, motivo: string) {
  const { error } = await db().rpc("blocca_orario", { p_luogo: luogo, p_risorsa: risorsa, p_dal: dal, p_al: al, p_motivo: motivo || null });
  return { errore: messaggio(error) };
}

export async function togliBlocco(id: string) {
  const { error } = await db().rpc("togli_blocco", { p_id: id });
  return { errore: messaggio(error) };
}

/** Da «giorno + ora di San Marino» all'istante ISO (per i blocchi scritti dal gestore) */
export function istanteSM(giorno: string, oraHHMM: string) {
  // L'offset di San Marino quel giorno (+01:00 o +02:00), preso dal fuso
  const prova = new Date(`${giorno}T12:00:00Z`);
  const parti = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/San_Marino", timeZoneName: "shortOffset" }).formatToParts(prova);
  const off = parti.find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+1";
  const [h, m = "0"] = off.replace("+", "").replace("-", "").split(":");
  const segno = off.startsWith("-") ? "-" : "+";
  return new Date(`${giorno}T${oraHHMM}:00${segno}${h.padStart(2, "0")}:${m.padStart(2, "0")}`).toISOString();
}
