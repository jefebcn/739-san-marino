import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Contratto, Orario } from "@/lib/lavoro";

// Offerte di lavoro del titolare e della redazione (migrazione 0043). I permessi li controlla il database.

export type MiaOffertaLavoro = {
  id: string; titolo: string; contratto: Contratto; orario: Orario; descrizione: string; sede: string | null;
  email: string | null; link: string | null; telefono: string | null; scadenza: string;
  stato: "pubblicata" | "chiusa" | "ritirata"; nota_redazione: string | null; creato_il: string;
};
export type DatiOfferta = { titolo: string; contratto: Contratto; orario: Orario; descrizione: string; sede: string; email: string; link: string; telefono: string; scadenza: string };
export type OffertaRedazione = {
  id: string; luogo_id: string; attivita: string; titolo: string; contratto: Contratto; orario: Orario; descrizione: string;
  email: string | null; link: string | null; telefono: string | null; scadenza: string; stato: MiaOffertaLavoro["stato"];
  nota_redazione: string | null; autore_email: string | null; creato_il: string;
};

type ErroreDb = { code?: string; message: string } | null;
function messaggio(e: ErroreDb) {
  if (!e) return null;
  if (e.code === "P0001") return e.message;
  if (e.code === "PGRST202") return "Le offerte di lavoro non sono ancora attive nel database (migrazione 0043).";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}
const db = () => supabaseBrowser();
/** Elenco, pagina dell'offerta e scheda dell'attività sono in cache: dopo una modifica si fanno rigenerare */
const rigenera = (...percorsi: string[]) =>
  Promise.all(percorsi.map((percorso) => fetch("/api/rivalida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percorso }) }).catch(() => {})));

export async function mieOfferteLavoro(luogo: string) {
  const { data, error } = await db().rpc("mie_offerte_lavoro", { p_luogo: luogo });
  return { offerte: (data ?? []) as MiaOffertaLavoro[], errore: messaggio(error) };
}

export async function salvaOffertaLavoro(luogo: string, id: string | null, dati: DatiOfferta) {
  const { data, error } = await db().rpc("salva_offerta_lavoro", { p_luogo: luogo, p_id: id, p: dati });
  if (!error && data) await rigenera("/lavorare/lavoro", `/lavorare/lavoro/${data}`, `/luoghi/${luogo}`);
  return { id: (data as string | null) ?? null, errore: messaggio(error) };
}

export async function chiudiOffertaLavoro(id: string, luogo: string, chiusa: boolean) {
  const { error } = await db().rpc("chiudi_offerta_lavoro", { p_id: id, p_chiusa: chiusa });
  if (!error) await rigenera("/lavorare/lavoro", `/lavorare/lavoro/${id}`, `/luoghi/${luogo}`);
  return { errore: messaggio(error) };
}

export async function offerteLavoroRedazione(stato: MiaOffertaLavoro["stato"]) {
  const { data, error } = await db().rpc("offerte_lavoro_redazione", { p_stato: stato });
  return { offerte: (data ?? []) as OffertaRedazione[], errore: messaggio(error) };
}

export async function ritiraOffertaLavoro(o: { id: string; luogo_id: string }, nota: string, ritira: boolean) {
  const { error } = await db().rpc("ritira_offerta_lavoro", { p_id: o.id, p_nota: nota || null, p_ritira: ritira });
  if (!error) await rigenera("/lavorare/lavoro", `/lavorare/lavoro/${o.id}`, `/luoghi/${o.luogo_id}`);
  return { errore: messaggio(error) };
}
