import { supabaseBrowser } from "@/lib/supabase/browser";

// Coda delle bozze (motore dati): tutto passa dalle funzioni del database (migrazione 0012),
// che controllano da sole se chi chiama è un amministratore.

export type StatoBozza = "nuovo" | "approvato" | "scartato";

export type DatiEvento = {
  titolo?: string;
  descrizione?: string | null;
  /** Ora di San Marino, «2026-10-17T21:00» */
  inizio?: string;
  fine?: string;
  luogo_id?: string;
  castello_id?: string;
  organizzatore?: string;
  metri?: string;
  /** Solo dalle fonti RSS */
  pubblicato_il?: string;
  categorie?: string[];
};

export type Bozza = {
  id: string;
  tipo: "evento" | "luogo" | "avviso";
  dati: DatiEvento;
  fonte: string;
  link_fonte: string | null;
  canale: string;
  stato: "nuovo" | "approvato" | "scartato" | "duplicato";
  nota: string | null;
  creato_il: string;
  deciso_il: string | null;
  elemento_id: string | null;
  simile_id: string | null;
  simile_titolo: string | null;
  simile_inizio: string | null;
};

export type Conteggio = Record<StatoBozza, number>;

type ErroreDb = { code?: string; message: string } | null;

/** I messaggi scritti nelle funzioni del database (raise exception) sono già pensati per chi legge. */
function messaggio(e: ErroreDb) {
  if (!e) return null;
  if (e.code === "P0001") return e.message;
  if (e.code === "PGRST202") return "La coda non è ancora attiva: manca la migrazione 0012 nel database.";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}

const db = () => supabaseBrowser();

export async function sonoAmministratore() {
  const { data, error } = await db().rpc("e_amministratore");
  return !error && data === true;
}

export async function codaBozze(stato: StatoBozza) {
  const { data, error } = await db().rpc("coda_bozze", { p_stato: stato });
  return { bozze: (data ?? []) as Bozza[], errore: messaggio(error) };
}

export async function conteggioBozze() {
  const { data, error } = await db().rpc("conteggio_bozze");
  return { conteggio: (data as Conteggio | null) ?? null, errore: messaggio(error) };
}

export async function approvaBozza(id: string, dati: DatiEvento) {
  const { data, error } = await db().rpc("approva_bozza", { p_id: id, p_dati: dati });
  return { evento: (data as string | null) ?? null, errore: messaggio(error) };
}

export async function scartaBozza(id: string, nota: string | null, doppioneDi: string | null = null) {
  const { error } = await db().rpc("scarta_bozza", { p_id: id, p_nota: nota, p_doppione_di: doppioneDi });
  return { errore: messaggio(error) };
}

export async function ripristinaBozza(id: string) {
  const { error } = await db().rpc("ripristina_bozza", { p_id: id });
  return { errore: messaggio(error) };
}
