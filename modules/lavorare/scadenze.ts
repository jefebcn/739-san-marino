import { supabase } from "@/lib/supabase";

// Scadenze, bandi e novità per le attività (Lavorare, migrazione 0044). Le scrive la redazione, sempre con la
// fonte ufficiale; 739 non inventa date. Qui anche i servizi online dello Stato per le attività, presi da gov.sm.

export const TIPI_SCADENZA = {
  fisco: "Fisco",
  contributi: "Contributi ISS",
  lavoro: "Lavoro",
  bando: "Bando",
  norme: "Nuove regole",
  altro: "Altro",
} as const;
export type TipoScadenza = keyof typeof TIPI_SCADENZA;

export type Scadenza = {
  id: string; tipo: TipoScadenza; titolo: string; testo: string | null; per_chi: string | null;
  giorno: string; dal: string | null; fonte_nome: string; fonte_link: string;
  stato?: "bozza" | "pubblicata";
};

export const oggiSM = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());

/** Le scadenze pubblicate dal giorno indicato in avanti (o tutte quelle di un tipo), dalla più vicina */
export async function getScadenze({ tipo, da }: { tipo?: TipoScadenza; da?: string } = {}): Promise<Scadenza[]> {
  const db = supabase();
  if (!db) return [];
  let q = db.from("scadenze").select("id, tipo, titolo, testo, per_chi, giorno, dal, fonte_nome, fonte_link").eq("stato", "pubblicata").order("giorno").limit(200);
  if (tipo) q = q.eq("tipo", tipo);
  if (da) q = q.gte("giorno", da);
  const { data, error } = await q;
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("scadenze", error.message);
    return [];
  }
  return (data ?? []) as Scadenza[];
}

/**
 * I servizi online dello Stato per le attività, come li elenca gov.sm (Servizi online della Pubblica Amministrazione,
 * Area Attività Economiche e Area Finanze e Bilancio). Controllati il 16/10/2026: si entra con utente e password del portale PA.
 */
export const SERVIZI_STATO: { nome: string; riga: string; link: string }[] = [
  { nome: "TRIB", riga: "Imposte indirette e fatturazione elettronica", link: "https://www.gov.sm/pub2/GovSM/Servizi-online-Pubblica-Amministrazione/Area-Finanze-e-Bilancio/TRIB---Gestione-Imposte-Indirette---Fatturazione-Elettronica.html" },
  { nome: "IGR", riga: "Imposte dirette e patrimoniale", link: "https://www.gov.sm/pub1/GovSM/Servizi-online-Pubblica-Amministrazione/Area-Finanze-e-Bilancio/IGR%C2%A0--Gestione-Imposte-dirette---Patrimoniale.html" },
  { nome: "Pagamento tributi online", riga: "Pagare i tributi dal portale", link: "https://www.gov.sm/pub2/GovSM/Servizi-online-Pubblica-Amministrazione/Area-Finanze-e-Bilancio/Pagamento-Tributi-OnLine.html" },
  { nome: "SMAC, dichiarazione dei ricavi", riga: "Trasmissione dei ricavi (ADTR)", link: "https://www.gov.sm/pub2/GovSM/Servizi-online-Pubblica-Amministrazione/SMAC---Dichiarazione-Trasmissione-Ricavi-ADTR.html" },
  { nome: "CONTRISS", riga: "Contributi ISS: cedolini, CIG, regolarità contributiva, rateizzazioni", link: "https://www.gov.sm/pub2/GovSM/Servizi-online-Pubblica-Amministrazione/Area-Attivita-Economiche/CONTRISS---Gestione-Contributi-ISS.html" },
  { nome: "LABOR", riga: "Servizi per il lavoro", link: "https://www.gov.sm/pub2/GovSM/Servizi-online-Pubblica-Amministrazione/Area-Attivita-Economiche/LABOR---Servizi-per-il-Lavoro.html" },
  { nome: "OPEC", riga: "Procedura operatori economici", link: "https://www.gov.sm/pub2/GovSM/Servizi-online-Pubblica-Amministrazione/Area-Attivita-Economiche/OPEC---Procedura-Operatori-Economici.html" },
  { nome: "Norme e circolari delle Finanze", riga: "L'archivio della Segreteria di Stato per le Finanze e il Bilancio", link: "https://www.finanze.sm/pub2/FinanzeSM/Comunicazione/Circolari/CircolariSegreteria.html" },
];

/** Parole che dicono che una notizia di economia o politica interessa chi ha un'attività */
const PAROLE = /impost|\bigr\b|contribut|fattur|monofase|\btass[ae]|fiscal|tribut|aliquot|operatori economici|\bimpres|incentiv|\bband[oi]\b|smac|sanzion|cassa integrazione|salario|stipend/i;
export const notiziaPerAttivita = (n: { titolo: string; sommario: string; categoria: string }) =>
  n.categoria === "economia" || (n.categoria === "politica" && PAROLE.test(`${n.titolo} ${n.sommario}`));
