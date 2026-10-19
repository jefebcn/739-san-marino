import { supabaseBrowser } from "@/lib/supabase/browser";

// Volontari per le associazioni (migrazione 0051): l'associazione pubblica una chiamata, chi ha l'SMR ID si iscrive,
// dopo l'inizio l'associazione segna chi c'era e arrivano i metri (40 a turno, al massimo 120 al mese).

export const METRI_TURNO = 40;
export const METRI_MESE = 120;

export type StatoIscrizione = "iscritto" | "ritirato" | "presente" | "assente";
export type Chiamata = {
  id: string; luogo_id: string; luogo: string; castello_id: number | null; titolo: string; descrizione: string; inizio: string; fine: string;
  dove: string | null; posti: number; iscritti: number; mio_stato: StatoIscrizione | null;
};
export type DettaglioChiamata = Chiamata & { indirizzo: string | null; stato: "aperta" | "chiusa" | "annullata" };
export type Turno = { chiamata_id: string; titolo: string; luogo_id: string; luogo: string; inizio: string; fine: string; stato_chiamata: string; stato: StatoIscrizione; metri: number };
export type ChiamataLuogo = { id: string; titolo: string; descrizione: string; inizio: string; fine: string; dove: string | null; posti: number; stato: "aperta" | "chiusa" | "annullata"; iscritti: number; presenti: number };
export type Volontario = { iscrizione_id: string; nome: string | null; email: string; telefono: string | null; nota: string | null; stato: StatoIscrizione; metri: number; creato_il: string };

type ErroreDb = { code?: string; message: string } | null;
const messaggio = (e: ErroreDb) => (!e ? null : e.code === "P0001" ? e.message : e.code === "PGRST202" ? "I volontari non sono ancora attivi nel database." : "Qualcosa non ha funzionato. Riprova tra poco.");
const db = () => supabaseBrowser();

export async function chiamate() {
  const { data, error } = await db().rpc("chiamate_volontari", { p_limite: 60 });
  return { chiamate: (data ?? []) as Chiamata[], errore: messaggio(error) };
}

export async function chiamata(id: string) {
  const { data, error } = await db().rpc("chiamata_volontari", { p_id: id });
  return { chiamata: ((data ?? []) as DettaglioChiamata[])[0] ?? null, errore: messaggio(error) };
}

export async function iscriviti(id: string, telefono: string, nota: string) {
  const { error } = await db().rpc("iscriviti_volontario", { p_id: id, p_telefono: telefono || null, p_nota: nota || null });
  return { errore: messaggio(error) };
}

export async function ritirati(id: string) {
  const { error } = await db().rpc("ritirati_volontario", { p_id: id });
  return { errore: messaggio(error) };
}

export async function mieiTurni() {
  const { data, error } = await db().rpc("miei_turni");
  return { turni: (data ?? []) as Turno[], errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

export async function chiamateLuogo(luogo: string) {
  const { data, error } = await db().rpc("chiamate_luogo", { p_luogo: luogo });
  return { chiamate: (data ?? []) as ChiamataLuogo[], errore: messaggio(error) };
}

export async function salvaChiamata(luogo: string, id: string | null, c: { titolo: string; descrizione: string; inizio: string; fine: string; dove: string; posti: number; stato: ChiamataLuogo["stato"] }) {
  const { error } = await db().rpc("salva_chiamata", { p_luogo: luogo, p_id: id, p: c });
  if (!error) {
    await Promise.all(["/comunita/volontari", ...(id ? [`/comunita/volontari/${id}`] : [])].map((percorso) =>
      fetch("/api/rivalida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percorso }) }).catch(() => undefined)));
  }
  return { errore: messaggio(error) };
}

export async function volontari(chiamataId: string) {
  const { data, error } = await db().rpc("volontari_chiamata", { p_id: chiamataId });
  return { volontari: (data ?? []) as Volontario[], errore: messaggio(error) };
}

export async function segna(iscrizione: string, presente: boolean) {
  const { data, error } = await db().rpc("segna_volontario", { p_iscrizione: iscrizione, p_presente: presente });
  return { metri: (data as number | null) ?? 0, errore: messaggio(error) };
}

const ora = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });
const giorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
/** «sabato 25 ottobre, dalle 9:00 alle 12:00» */
export const quando = (inizio: string, fine: string) => `${giorno.format(new Date(inizio))}, dalle ${ora.format(new Date(inizio))} alle ${ora.format(new Date(fine))}`;
