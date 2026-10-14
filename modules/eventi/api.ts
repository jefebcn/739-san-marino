import { supabaseBrowser } from "@/lib/supabase/browser";

// Proposte di eventi e eventi degli organizzatori (migrazione 0022): tutto passa dalle funzioni del database,
// che fanno i controlli e i limiti anti-spam.

/** Quello che il modulo manda: date e ore come ora di San Marino («2026-10-17T21:00») */
export type DatiProposta = {
  titolo: string;
  descrizione?: string;
  inizio: string;
  fine?: string;
  luogo_id?: string;
  indirizzo?: string;
  castello_id?: string;
  per_chi?: string;
  prezzo?: string;
  contatto?: string;
  organizzatore?: string;
  foto_url?: string;
  foto_credito?: string;
  pubblicato?: boolean;
};

export type MioEvento = {
  id: string;
  titolo: string;
  descrizione: string | null;
  inizio: string;
  fine: string | null;
  luogo_id: string | null;
  castello_id: number | null;
  organizzatore: string | null;
  pubblicato: boolean;
  per_chi: string | null;
  prezzo: string | null;
  foto_url: string | null;
  foto_credito: string | null;
  contatto: string | null;
  indirizzo: string | null;
  metri: number;
};

type ErroreDb = { code?: string; message: string } | null;

function messaggio(e: ErroreDb) {
  if (!e) return null;
  // Gli errori scritti dalle funzioni sono già in italiano e pensati per chi compila
  if (e.code === "P0001") return e.message;
  if (e.code === "PGRST202") return "Questa funzione non è ancora attiva nel database.";
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}

const db = () => supabaseBrowser();

const pulito = (d: DatiProposta) => Object.fromEntries(Object.entries(d).filter(([, v]) => v !== "" && v !== undefined));

export async function proponiEvento(d: DatiProposta) {
  const { error } = await db().rpc("proponi_evento", { p_dati: pulito(d) });
  return { errore: messaggio(error) };
}

/** Organizzatori: nuovo evento (id null) o modifica di uno dei propri. Restituisce l'id dell'evento. */
export async function salvaMioEvento(id: string | null, d: DatiProposta) {
  const { data, error } = await db().rpc("salva_mio_evento", { p_id: id, p_dati: pulito(d) });
  return { id: (data as string | null) ?? null, errore: messaggio(error) };
}

export async function mieiEventi() {
  const { data, error } = await db().rpc("miei_eventi");
  return { eventi: (data ?? []) as MioEvento[], errore: messaggio(error) };
}

/** Foto dell'evento nella cartella pubblica «eventi», sotto l'id di chi la carica. */
export async function caricaFoto(utente: string, file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { url: null, errore: "Usa una foto JPG, PNG o WebP." };
  if (file.size > 5 * 1024 * 1024) return { url: null, errore: "La foto è troppo grande: massimo 5 MB." };
  const estensione = file.type.split("/")[1].replace("jpeg", "jpg");
  const percorso = `${utente}/${Date.now()}.${estensione}`;
  const { error } = await db().storage.from("eventi").upload(percorso, file, { contentType: file.type, upsert: false });
  if (error) return { url: null, errore: /bucket/i.test(error.message) ? "Il caricamento delle foto non è ancora attivo (migrazione 0022)." : "La foto non si è caricata. Riprova." };
  return { url: db().storage.from("eventi").getPublicUrl(percorso).data.publicUrl, errore: null };
}

// ——— Check-in con QR e metri (migrazione 0023) ———

export type EsitoCheckin = { nuovo: boolean; metri: number; totale: number; titolo: string };
export type Movimento = { metri: number; motivo: string; creato_il: string; evento_id: string | null; titolo: string | null };

/** Il codice segreto del QR: solo redazione e organizzatore dell'evento (altrimenti errore). */
export async function codiceCheckin(evento: string) {
  const { data, error } = await db().rpc("codice_checkin", { p_evento: evento });
  return { codice: (data as string | null) ?? null, errore: messaggio(error) };
}

export async function faiCheckin(evento: string, codice: string) {
  const { data, error } = await db().rpc("fai_checkin", { p_evento: evento, p_codice: codice });
  return { esito: (data as EsitoCheckin | null) ?? null, errore: messaggio(error) };
}

export async function mieiMetri() {
  const { data, error } = await db().rpc("miei_metri");
  const d = data as { totale: number; movimenti: Movimento[] } | null;
  return { totale: d?.totale ?? 0, movimenti: d?.movimenti ?? [], errore: messaggio(error) };
}
