import { supabaseBrowser } from "@/lib/supabase/browser";

// La Bacheca di Comunità (migrazione 0048): annunci di chi vive qui, con SMR ID, approvati dalla redazione.
// Il contatto lo restituisce il database solo a chi è entrato.

export type TipoAnnuncio = "cerco" | "offro" | "regalo" | "perso" | "trovato" | "iniziativa";
export const TIPI_ANNUNCIO: Record<TipoAnnuncio, { nome: string; riga: string }> = {
  cerco: { nome: "Cerco", riga: "Una cosa, un aiuto, un passaggio" },
  offro: { nome: "Offro", riga: "Una mano, ripetizioni, un passaggio" },
  regalo: { nome: "Regalo", riga: "Cose che non usi più, gratis" },
  perso: { nome: "Perso", riga: "Chiavi, documenti, animali" },
  trovato: { nome: "Trovato", riga: "Qualcosa che hai trovato" },
  iniziativa: { nome: "Iniziative", riga: "Raccolte, pulizie, incontri di quartiere" },
};
export const DURATE = [7, 15, 30, 60] as const;

export type Annuncio = { id: string; tipo: TipoAnnuncio; titolo: string; testo: string; castello_id: number | null; contatto: string | null; scade: string; pubblicato_il: string; mio: boolean };
export type StatoAnnuncio = "in_attesa" | "pubblicato" | "rifiutato" | "chiuso" | "ritirato";
export type MioAnnuncio = { id: string; tipo: TipoAnnuncio; titolo: string; testo: string; castello_id: number | null; contatto: string; stato: StatoAnnuncio; nota_redazione: string | null; scade: string; creato_il: string };
export type AnnuncioRedazione = MioAnnuncio & { autore_nome: string | null };
export const STATI_ANNUNCIO: Record<StatoAnnuncio, string> = {
  in_attesa: "In attesa della redazione",
  pubblicato: "In bacheca",
  rifiutato: "Non pubblicato",
  chiuso: "Chiuso da te",
  ritirato: "Ritirato dalla redazione",
};

type ErroreDb = { code?: string; message: string } | null;
const messaggio = (e: ErroreDb) => (!e ? null : e.code === "P0001" ? e.message : e.code === "PGRST202" ? "La bacheca non è ancora attiva nel database." : "Qualcosa non ha funzionato. Riprova tra poco.");
const db = () => supabaseBrowser();

export async function annunci(tipo: TipoAnnuncio | null, castello: number | null) {
  const { data, error } = await db().rpc("annunci_bacheca", { p_tipo: tipo, p_castello: castello, p_limite: 150 });
  return { annunci: (data ?? []) as Annuncio[], errore: messaggio(error) };
}

export async function proponiAnnuncio(a: { tipo: TipoAnnuncio; titolo: string; testo: string; castello_id: number | null; contatto: string; giorni: number }) {
  const { error } = await db().rpc("proponi_annuncio", { p: a });
  return { errore: messaggio(error) };
}

export async function mieiAnnunci() {
  const { data, error } = await db().rpc("miei_annunci");
  return { annunci: (data ?? []) as MioAnnuncio[], errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

export async function chiudiAnnuncio(id: string) {
  const { error } = await db().rpc("chiudi_annuncio", { p_id: id });
  return { errore: messaggio(error) };
}

export async function annunciRedazione(stato: StatoAnnuncio) {
  const { data, error } = await db().rpc("bacheca_redazione", { p_stato: stato });
  return { annunci: (data ?? []) as AnnuncioRedazione[], errore: messaggio(error) };
}

export async function conteggioBacheca() {
  const { data, error } = await db().rpc("conteggio_bacheca");
  return error ? null : ((data as number | null) ?? 0);
}

export async function decidiAnnuncio(id: string, stato: "pubblicato" | "rifiutato" | "ritirato", nota = "") {
  const { error } = await db().rpc("decidi_annuncio", { p_id: id, p_stato: stato, p_nota: nota || null });
  return { errore: messaggio(error) };
}

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
export const leggiGiorno = (iso: string) => giorno.format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
