import { supabaseBrowser } from "@/lib/supabase/browser";
import type { DocumentoFe, Parte, RigaEmessa } from "./fe-rsm";

// NeonUp, il gestionale di 739 per le aziende (migrazione 0052). Le letture passano dalle regole (RLS) del database:
// ognuno vede solo le aziende di cui fa parte. Numeri, emissione e stati solo dalle funzioni.

export type Ruolo = "titolare" | "amministrazione" | "vendite" | "lettura";
export const RUOLI: Record<Ruolo, string> = {
  titolare: "Titolare",
  amministrazione: "Amministrazione",
  vendite: "Vendite",
  lettura: "Solo lettura",
};
export const puoVendere = (r: Ruolo | null | undefined) => r === "titolare" || r === "amministrazione" || r === "vendite";
export const puoGestire = (r: Ruolo | null | undefined) => r === "titolare" || r === "amministrazione";

export type TipoDocumento = "preventivo" | "ordine" | "ddt" | "fattura" | "acconto" | "nota_credito" | "nota_debito";
export const TIPI: Record<TipoDocumento, { nome: string; plurale: string; fiscale: boolean }> = {
  fattura: { nome: "Fattura", plurale: "Fatture", fiscale: true },
  preventivo: { nome: "Preventivo", plurale: "Preventivi", fiscale: false },
  ordine: { nome: "Ordine", plurale: "Ordini", fiscale: false },
  ddt: { nome: "DDT", plurale: "DDT", fiscale: false },
  nota_credito: { nome: "Nota di credito", plurale: "Note di credito", fiscale: true },
  nota_debito: { nome: "Nota di debito", plurale: "Note di debito", fiscale: true },
  acconto: { nome: "Fattura d'acconto", plurale: "Fatture d'acconto", fiscale: true },
};

/** I Tipi Merce del regime monofase (Documento B, 2.4.5.1) */
export const TIPI_MERCE: { n: number; nome: string; breve: string }[] = [
  { n: 1, nome: "Materie prime", breve: "Materie prime" },
  { n: 4, nome: "Beni di consumo", breve: "Beni di consumo" },
  { n: 7, nome: "Beni strumentali", breve: "Beni strumentali" },
  { n: 2, nome: "Servizi conto lavoro con materie prime", breve: "Conto lavoro con MP" },
  { n: 3, nome: "Servizi conto lavoro senza materie prime e prestazioni di servizi (Legge 131/1991)", breve: "Servizi" },
];

export const PAGAMENTI: Record<string, string> = { MP01: "Contanti", MP02: "Assegno", MP05: "Bonifico", MP08: "Carta di pagamento" };

export const FE_STATI: Record<string, string> = {
  "": "File da preparare",
  da_inviare: "Da caricare su TribWEB",
  inviata: "Caricata, in attesa dell'esito",
  consegnata: "Consegnata",
  scartata: "Scartata: va rifatta",
};

export type Azienda = {
  id: string; denominazione: string; cod_oe: string | null; indirizzo: string | null; numero_civico: string | null; cap: string | null;
  comune: string | null; castello_id: number | null; telefono: string | null; email: string | null; domicilio_digitale: string | null;
  iban: string | null; fe_dal: string | null; luogo_id: string | null;
};
export type MiaAzienda = { id: string; denominazione: string; cod_oe: string | null; ruolo: Ruolo };
export type Persona = { utente_id: string; nome: string | null; email: string | null; ruolo: Ruolo; aggiunto_il: string };

export type Soggetto = {
  id: string; azienda_id: string; tipo: "cliente" | "fornitore" | "entrambi"; denominazione: string; nazione: string; cod_oe: string | null;
  partita_iva: string | null; codice_fiscale: string | null; indirizzo: string | null; numero_civico: string | null; cap: string | null;
  comune: string | null; provincia: string | null; email: string | null; telefono: string | null; pagamento: string | null;
  giorni_pagamento: number | null; note: string | null; attivo: boolean;
};
export type Articolo = {
  id: string; azienda_id: string; codice: string | null; descrizione: string; unita_misura: string | null; prezzo: number;
  tipo_merce: number | null; nomenclatura: string | null; attivo: boolean;
};

export type Riga = {
  codice?: string | null; descrizione: string; quantita: number | string; unita_misura?: string | null; prezzo: number | string;
  sconto?: number | string; tipo_merce?: number | null; nonrimb?: boolean; articolo_id?: string | null; totale?: number; n?: number;
  /** Magazzino (0054): variante e lotto dell'articolo, deposito da cui esce, reso che rientra (note di credito) */
  variante?: string | null; lotto?: string | null; deposito_id?: string | null; rientra?: boolean;
};
export type Ddt = { numero: string; data: string; righe?: number[] };
export type Documento = {
  id: string; azienda_id: string; tipo: TipoDocumento; soggetto_id: string | null; data: string | null; righe: Riga[]; ddt: Ddt[];
  collegato_id: string | null; causale: string | null; tipo_cessione: number | null; pagamento: { modalita?: string; scadenza?: string } | null;
  note: string | null; stato: "bozza" | "emesso" | "annullato" | "eliminato"; anno: number | null; numero: string | null;
  td: DocumentoFe["td"] | null; elettronica: boolean; cedente: Parte | null; cessionario: Parte | null; totale: number | null;
  emesso_il: string | null; fe_stato: keyof typeof FE_STATI; fe_file: string | null; fe_nota: string | null; incassato_il: string | null;
  creato_il: string;
};

type ErroreDb = { code?: string; message: string } | null;
const messaggio = (e: ErroreDb) =>
  !e ? null : e.code === "P0001" ? e.message : e.code === "PGRST202" || e.code === "42P01" ? "NeonUp non è ancora attivo nel database."
    : e.code === "23505" ? "C'è già un documento con questo numero." : "Qualcosa non ha funzionato. Riprova tra poco.";
const db = () => supabaseBrowser();

export async function mieAziende() {
  const { data, error } = await db().rpc("neon_mie_aziende");
  return { aziende: (data ?? []) as MiaAzienda[], errore: messaggio(error) };
}

export async function azienda(id: string) {
  const { data, error } = await db().from("neon_aziende").select("*").eq("id", id).maybeSingle();
  return { azienda: data as Azienda | null, errore: messaggio(error) };
}

export async function salvaAzienda(id: string | null, a: Partial<Azienda>) {
  const { data, error } = await db().rpc("neon_salva_azienda", { p_id: id, p: a });
  return { id: data as string | null, errore: messaggio(error) };
}

export async function persone(id: string) {
  const { data, error } = await db().rpc("neon_persone", { p_azienda: id });
  return { persone: (data ?? []) as Persona[], errore: messaggio(error) };
}

export async function aggiungiPersona(id: string, tessera: string, ruolo: Ruolo) {
  const { error } = await db().rpc("neon_aggiungi_persona", { p_azienda: id, p_tessera: tessera, p_ruolo: ruolo });
  return { errore: messaggio(error) };
}

export async function soggetti(azienda: string) {
  const { data, error } = await db().from("neon_soggetti").select("*").eq("azienda_id", azienda).order("denominazione").limit(2000);
  return { soggetti: (data ?? []) as Soggetto[], errore: messaggio(error) };
}

const CAMPI_SOGGETTO = ["tipo", "denominazione", "nazione", "cod_oe", "partita_iva", "codice_fiscale", "indirizzo", "numero_civico", "cap", "comune",
  "provincia", "email", "telefono", "pagamento", "giorni_pagamento", "note", "attivo"] as const;
const CAMPI_ARTICOLO = ["codice", "descrizione", "unita_misura", "prezzo", "tipo_merce", "nomenclatura", "attivo"] as const;
/** Solo le colonne che il browser può scrivere (permessi per colonna della 0052) */
const solo = <T extends object>(o: T, campi: readonly string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => campi.includes(k)));

export async function salvaSoggetto(azienda: string, id: string | null, s: Partial<Soggetto>) {
  const campi = solo(s, CAMPI_SOGGETTO);
  const q = id
    ? db().from("neon_soggetti").update({ ...campi, aggiornato_il: new Date().toISOString() }).eq("id", id).select("id").single()
    : db().from("neon_soggetti").insert({ ...campi, azienda_id: azienda }).select("id").single();
  const { data, error } = await q;
  return { id: (data as { id: string } | null)?.id ?? null, errore: error?.code === "23514" ? "Controlla i campi: qualcosa è troppo lungo o nel formato sbagliato." : messaggio(error) };
}

export async function articoli(azienda: string) {
  const { data, error } = await db().from("neon_articoli").select("*").eq("azienda_id", azienda).order("descrizione").limit(5000);
  return { articoli: (data ?? []) as Articolo[], errore: messaggio(error) };
}

export async function salvaArticolo(azienda: string, id: string | null, a: Partial<Articolo>) {
  const campi = solo(a, CAMPI_ARTICOLO);
  const q = id
    ? db().from("neon_articoli").update({ ...campi, aggiornato_il: new Date().toISOString() }).eq("id", id).select("id").single()
    : db().from("neon_articoli").insert({ ...campi, azienda_id: azienda }).select("id").single();
  const { data, error } = await q;
  return { id: (data as { id: string } | null)?.id ?? null, errore: error?.code === "23514" ? "Controlla i campi: qualcosa è troppo lungo o nel formato sbagliato." : messaggio(error) };
}

const CAMPI_ELENCO = "id, azienda_id, tipo, soggetto_id, data, stato, anno, numero, td, elettronica, cessionario, totale, emesso_il, fe_stato, fe_file, incassato_il, pagamento, creato_il, collegato_id, ddt";
export type VoceDocumento = Pick<Documento, "id" | "azienda_id" | "tipo" | "soggetto_id" | "data" | "stato" | "anno" | "numero" | "td" | "elettronica" | "cessionario" | "totale" | "emesso_il" | "fe_stato" | "fe_file" | "incassato_il" | "pagamento" | "creato_il" | "collegato_id" | "ddt">;

export async function documenti(azienda: string, dal?: string) {
  let q = db().from("neon_documenti").select(CAMPI_ELENCO).eq("azienda_id", azienda).in("stato", ["bozza", "emesso", "annullato"])
    .order("creato_il", { ascending: false }).limit(1000);
  if (dal) q = q.gte("creato_il", dal);
  const { data, error } = await q;
  return { documenti: (data ?? []) as unknown as VoceDocumento[], errore: messaggio(error) };
}

export async function documento(id: string) {
  const { data, error } = await db().from("neon_documenti").select("*").eq("id", id).maybeSingle();
  return { documento: data as Documento | null, errore: messaggio(error) };
}

export async function nuovoDocumento(azienda: string, d: Partial<Documento>) {
  const { data: u } = await db().auth.getUser();
  const { data, error } = await db().from("neon_documenti").insert({
    azienda_id: azienda, tipo: d.tipo, soggetto_id: d.soggetto_id ?? null, righe: d.righe ?? [], ddt: d.ddt ?? [],
    collegato_id: d.collegato_id ?? null, causale: d.causale ?? null, tipo_cessione: d.tipo_cessione ?? null,
    pagamento: d.pagamento ?? null, note: d.note ?? null, creato_da: u.user?.id ?? null,
  }).select("id").single();
  return { id: (data as { id: string } | null)?.id ?? null, errore: messaggio(error) };
}

export async function salvaBozza(id: string, d: Partial<Documento>) {
  const { error } = await db().from("neon_documenti").update({
    tipo: d.tipo, soggetto_id: d.soggetto_id ?? null, data: d.data || null, righe: d.righe ?? [], ddt: d.ddt ?? [],
    collegato_id: d.collegato_id ?? null, causale: d.causale || null, tipo_cessione: d.tipo_cessione ?? null,
    pagamento: d.pagamento ?? null, note: d.note || null, aggiornato_il: new Date().toISOString(),
  }).eq("id", id);
  return { errore: error?.code === "23514" ? "Controlla i campi: qualcosa è troppo lungo o nel formato sbagliato." : messaggio(error) };
}

export async function emetti(id: string) {
  const { data, error } = await db().rpc("neon_emetti", { p_id: id });
  return { esito: data as { numero: number; data: string; elettronica: boolean } | null, errore: messaggio(error) };
}

export async function fileFattura(id: string) {
  const { data, error } = await db().rpc("neon_file_fattura", { p_id: id });
  return { nome: data as string | null, errore: messaggio(error) };
}

export async function esitoFattura(id: string, stato: string, nota: string | null) {
  const { error } = await db().rpc("neon_esito_fattura", { p_id: id, p_stato: stato, p_nota: nota });
  return { errore: messaggio(error) };
}

export async function incasso(id: string, data: string | null) {
  const { error } = await db().rpc("neon_incasso", { p_id: id, p_data: data });
  return { errore: messaggio(error) };
}

export async function annulla(id: string) {
  const { error } = await db().rpc("neon_annulla", { p_id: id });
  return { errore: messaggio(error) };
}

/** Il documento emesso nella forma che serve al file XML */
export function perFe(d: Documento, collegata: Pick<Documento, "numero" | "data"> | null): DocumentoFe | null {
  if (!d.td || !d.numero || !d.data || !d.cedente || !d.cessionario) return null;
  return {
    td: d.td, numero: d.numero, data: d.data, totale: Number(d.totale ?? 0), cedente: d.cedente, cessionario: d.cessionario,
    righe: d.righe as RigaEmessa[], ddt: d.ddt, collegata: collegata?.numero && collegata.data ? { numero: collegata.numero, data: collegata.data } : null,
    causale: d.causale, tipo_cessione: d.tipo_cessione, pagamento: d.pagamento,
  };
}

/** Totale di una riga come lo calcola il database: prezzo meno sconto, per quantità, arrotondato al centesimo */
export function totaleRiga(r: Riga) {
  const q = Number(r.quantita || 1), p = Number(r.prezzo || 0), s = Number(r.sconto || 0);
  return Math.round(p * (1 - s / 100) * q * 100) / 100;
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const soldi = (n: number | null | undefined) => euro.format(Number(n ?? 0));
const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const data = (d: string | null | undefined) => (d ? giorno.format(new Date(`${d.slice(0, 10)}T12:00:00Z`)) : "");
export const oggiSM = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());

/** «Fattura 12/2026» o «Bozza di fattura» */
export const titoloDocumento = (d: Pick<Documento, "tipo" | "stato" | "numero" | "anno">) =>
  d.stato === "bozza" ? `Bozza: ${TIPI[d.tipo].nome.toLowerCase()}` : `${TIPI[d.tipo].nome} ${d.numero}/${d.anno}`;

/** Termine di trasmissione (Documento B 2.4.8): fine del mese due mesi dopo il DDT (beni) o la fattura (servizi), poi il primo giorno non festivo; qui senza i festivi */
export function termineTrasmissione(d: Pick<Documento, "data" | "ddt">) {
  const base = d.ddt?.length ? d.ddt.map((x) => x.data).sort()[0] : d.data;
  if (!base) return null;
  const [y, m] = base.split("-").map(Number);
  const fine = new Date(Date.UTC(y, m + 2, 0));
  while (fine.getUTCDay() === 0 || fine.getUTCDay() === 6) fine.setUTCDate(fine.getUTCDate() + 1);
  return fine.toISOString().slice(0, 10);
}

/* ———— Fase 2: HUB-SM (migrazione 0053) ———— */

export type HubStato = {
  stato: "scollegato" | "da_verificare" | "ok" | "errore"; ambiente?: "test" | "produzione"; messaggio?: string | null;
  scade?: string | null; verificato_il?: string | null; ultime_ricevute_il?: string | null; in_coda?: number;
};
export type VoceCoda = { id: number; azione: string; stato: "attesa" | "fatto" | "errore"; tentativi: number; prossimo: string; codice: number | null; messaggio: string | null; creato_il: string; fatto_il: string | null };
export type RicevutaHub = { id: number; nome: string; tipo: "consegna" | "scarto" | "altro"; xml: string; ricevuta_il: string };
export type FilePartito = { id: number; nome: string; ambiente: string; hash: string | null; inviato_il: string | null; creato_il: string };
export type Passiva = {
  id: string; ambiente: string; nome: string; xml: string | null; td: string | null; cedente: string | null; cedente_cod_oe: string | null;
  numero: string | null; data: string | null; totale: number | null; confermata_il: string | null; stato: "nuova" | "vista" | "registrata" | "rettifica";
  nota: string | null; scaricata_il: string;
};

export async function hubStato(azienda: string) {
  const { data, error } = await db().rpc("neon_hub_stato", { p_azienda: azienda });
  return { hub: (data as HubStato | null) ?? null, errore: error?.code === "PGRST202" ? null : messaggio(error), attivo: error?.code !== "PGRST202" };
}

export async function hubCollega(azienda: string, token: string, ambiente: "test" | "produzione") {
  const { error } = await db().rpc("neon_hub_collega", { p_azienda: azienda, p_token: token, p_ambiente: ambiente });
  return { errore: messaggio(error) };
}

export async function hubScollega(azienda: string) {
  const { error } = await db().rpc("neon_hub_scollega", { p_azienda: azienda });
  return { errore: messaggio(error) };
}

export async function hubInvia(documento: string, xml: string) {
  const { error } = await db().rpc("neon_hub_invia", { p_documento: documento, p_xml: xml });
  return { errore: messaggio(error) };
}

export async function hubControlla(documento: string) {
  const { error } = await db().rpc("neon_hub_controlla", { p_documento: documento });
  return { errore: messaggio(error) };
}

export async function hubCercaRicevute(azienda: string) {
  const { error } = await db().rpc("neon_hub_cerca_ricevute", { p_azienda: azienda });
  return { errore: messaggio(error) };
}

/** Le richieste all'HUB-SM di un documento, le più recenti prima */
export async function codaDocumento(documento: string) {
  const { data } = await db().from("neon_hub_coda").select("id, azione, stato, tentativi, prossimo, codice, messaggio, creato_il, fatto_il")
    .eq("documento_id", documento).order("id", { ascending: false }).limit(20);
  return (data ?? []) as VoceCoda[];
}

export async function ricevuteDocumento(documento: string) {
  const { data } = await db().from("neon_hub_ricevute").select("id, nome, tipo, xml, ricevuta_il").eq("documento_id", documento).order("id", { ascending: false });
  return (data ?? []) as RicevutaHub[];
}

export async function filePartiti(documento: string) {
  const { data } = await db().from("neon_hub_file").select("id, nome, ambiente, hash, inviato_il, creato_il").eq("documento_id", documento).order("id", { ascending: false });
  return (data ?? []) as FilePartito[];
}

export async function passive(azienda: string) {
  const { data, error } = await db().from("neon_passive")
    .select("id, ambiente, nome, xml, td, cedente, cedente_cod_oe, numero, data, totale, confermata_il, stato, nota, scaricata_il")
    .eq("azienda_id", azienda).order("scaricata_il", { ascending: false }).limit(500);
  return { passive: (data ?? []) as Passiva[], errore: error?.code === "42P01" ? null : messaggio(error) };
}

export async function passivaSegna(id: string, stato: Passiva["stato"], nota?: string) {
  const { error } = await db().rpc("neon_passiva_segna", { p_id: id, p_stato: stato, p_nota: nota ?? null });
  return { errore: messaggio(error) };
}

/** Fa scaricare un testo come file */
export function scaricaTesto(nome: string, testo: string, tipo = "application/xml") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([testo], { type: tipo }));
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Dopo uno scarto: riprende i dati di azienda e cliente corretti nelle anagrafiche */
export async function aggiornaScartata(documento: string) {
  const { error } = await db().rpc("neon_aggiorna_scartata", { p_documento: documento });
  return { errore: messaggio(error) };
}

/* ———— Fase 3: magazzino (migrazione 0054) ———— */

export type Deposito = { id: string; azienda_id: string; nome: string; predefinito: boolean; attivo: boolean };
export type MagArticolo = { articolo_id: string; gestito: boolean; scorta_minima: number | null; varianti: string[]; lotti: boolean };
export type Giacenza = { articolo_id: string; deposito_id: string; variante: string; lotto: string; scadenza: string | null; quantita: number };
export type CostoArticolo = { articolo_id: string; costo_medio: number | null; ultimo: string | null };
export type TipoOperazione = "carico" | "scarico" | "rettifica" | "trasferimento" | "inventario" | "vendita" | "reso" | "storno";
export const OPERAZIONI: Record<TipoOperazione, string> = {
  carico: "Carico", scarico: "Scarico", rettifica: "Rettifica", trasferimento: "Trasferimento", inventario: "Inventario",
  vendita: "Uscita per vendita", reso: "Reso del cliente", storno: "Storno",
};
export type Operazione = {
  id: string; tipo: TipoOperazione; data: string; soggetto_id: string | null; riferimento: string | null; documento_id: string | null;
  passiva_id: string | null; storno_di: string | null; stornata: boolean; nota: string | null; creato_il: string;
};
export type Movimento = {
  id: number; operazione_id: string; deposito_id: string; articolo_id: string; variante: string; lotto: string; scadenza: string | null;
  quantita: number; costo: number | null; riga: number | null;
};
export type RigaMagazzino = { articolo_id: string; variante?: string; lotto?: string; scadenza?: string; quantita: number; costo?: number | null };

/** Crea il deposito predefinito se manca (serve a chi può vendere) */
export async function magAvvia(azienda: string) {
  const { error } = await db().rpc("neon_mag_avvia", { p_azienda: azienda });
  return { errore: messaggio(error) };
}

export async function depositi(azienda: string) {
  const { data, error } = await db().from("neon_depositi").select("id, azienda_id, nome, predefinito, attivo").eq("azienda_id", azienda)
    .order("predefinito", { ascending: false }).order("nome");
  return { depositi: (data ?? []) as Deposito[], errore: messaggio(error), attivo: error?.code !== "42P01" };
}

export async function salvaDeposito(azienda: string, id: string | null, nome: string, predefinito: boolean, attivo: boolean) {
  const { error } = await db().rpc("neon_salva_deposito", { p_azienda: azienda, p_id: id, p_nome: nome, p_predefinito: predefinito, p_attivo: attivo });
  return { errore: messaggio(error) };
}

export async function magArticoli(azienda: string) {
  const { data, error } = await db().from("neon_mag_articoli").select("articolo_id, gestito, scorta_minima, varianti, lotti").eq("azienda_id", azienda).limit(5000);
  return { impostazioni: (data ?? []) as MagArticolo[], errore: error?.code === "42P01" ? null : messaggio(error) };
}

export async function salvaMagArticolo(articolo: string, m: Omit<MagArticolo, "articolo_id">) {
  const { error } = await db().rpc("neon_salva_mag_articolo", { p_articolo: articolo, p: m });
  return { errore: messaggio(error) };
}

export async function giacenze(azienda: string) {
  const { data, error } = await db().rpc("neon_mag_giacenze", { p_azienda: azienda });
  return { giacenze: ((data ?? []) as Giacenza[]).map((g) => ({ ...g, quantita: Number(g.quantita) })), errore: error?.code === "PGRST202" ? null : messaggio(error) };
}

export async function costi(azienda: string) {
  const { data } = await db().rpc("neon_mag_costi", { p_azienda: azienda });
  return (data ?? []) as CostoArticolo[];
}

export async function operazioni(azienda: string, limite = 200) {
  const { data, error } = await db().from("neon_mag_operazioni")
    .select("id, tipo, data, soggetto_id, riferimento, documento_id, passiva_id, storno_di, stornata, nota, creato_il")
    .eq("azienda_id", azienda).order("data", { ascending: false }).order("creato_il", { ascending: false }).limit(limite);
  return { operazioni: (data ?? []) as Operazione[], errore: messaggio(error) };
}

export async function movimenti(operazioni: string[]) {
  if (!operazioni.length) return [] as Movimento[];
  const { data } = await db().from("neon_mag_movimenti")
    .select("id, operazione_id, deposito_id, articolo_id, variante, lotto, scadenza, quantita, costo, riga")
    .in("operazione_id", operazioni).order("id").limit(5000);
  return ((data ?? []) as Movimento[]).map((m) => ({ ...m, quantita: Number(m.quantita) }));
}

export async function operazioniDocumento(documento: string) {
  const { data } = await db().from("neon_mag_operazioni").select("id, tipo, data, soggetto_id, riferimento, documento_id, passiva_id, storno_di, stornata, nota, creato_il")
    .eq("documento_id", documento).order("creato_il");
  return (data ?? []) as Operazione[];
}

/** Le fatture ricevute già caricate in magazzino (carichi non stornati) */
export async function passiveCaricate(azienda: string) {
  const { data } = await db().from("neon_mag_operazioni").select("passiva_id, data").eq("azienda_id", azienda).not("passiva_id", "is", null).eq("stornata", false);
  return new Map(((data ?? []) as { passiva_id: string; data: string }[]).map((x) => [x.passiva_id, x.data]));
}

export async function registraMagazzino(azienda: string, p: {
  tipo: "carico" | "scarico" | "rettifica" | "trasferimento"; data?: string | null; deposito_id?: string | null; deposito_a?: string | null;
  soggetto_id?: string | null; riferimento?: string | null; passiva_id?: string | null; nota?: string | null; righe: RigaMagazzino[];
}) {
  const { data, error } = await db().rpc("neon_mag_registra", { p_azienda: azienda, p });
  return { id: data as string | null, errore: messaggio(error) };
}

export async function inventario(azienda: string, deposito: string, righe: { articolo_id: string; variante: string; lotto: string; contati: number }[], nota?: string) {
  const { data, error } = await db().rpc("neon_mag_inventario", { p_azienda: azienda, p_deposito: deposito, p_righe: righe, p_nota: nota ?? null });
  return { differenze: data as number | null, errore: messaggio(error) };
}

export async function storna(operazione: string, nota?: string) {
  const { error } = await db().rpc("neon_mag_storna", { p_operazione: operazione, p_nota: nota ?? null });
  return { errore: messaggio(error) };
}

const qta = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 3 });
/** «12», «2,5 kg» */
export const quantita = (n: number | null | undefined, um?: string | null) => `${qta.format(Number(n ?? 0))}${um ? ` ${um}` : ""}`;

/** Le righe di una fattura ricevuta (XML FPR12), per prepararne il carico: codice, descrizione, quantità, prezzo unitario */
export function righeFattura(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const figlio = (el: Element, nome: string) => [...el.children].find((c) => c.localName === nome)?.textContent?.trim() ?? "";
  return [...doc.getElementsByTagNameNS("*", "DettaglioLinee")].map((l) => {
    const cod = [...l.children].find((c) => c.localName === "CodiceArticolo");
    return {
      codice: cod ? figlio(cod, "CodiceValore") : "",
      descrizione: figlio(l, "Descrizione"),
      quantita: Number(figlio(l, "Quantita") || 1),
      prezzo: Number(figlio(l, "PrezzoUnitario") || 0),
      unita: figlio(l, "UnitaMisura"),
    };
  }).filter((r) => r.descrizione);
}
