import { supabase } from "./supabase";
import { aPagine } from "./a-pagine";

export type Castello = { id: number; slug: string; nome: string; colore: string; metri?: number };
export type Luogo = {
  id: string;
  nome: string;
  categoria: string;
  descrizione: string | null;
  lat: number;
  lng: number;
  castello_id: number | null;
  indirizzo: string | null;
  telefono: string | null;
  orari: string | null;
  tariffa: string | null;
  posti: number | null;
  da_verificare: boolean;
  /** Orari settimanali: {"1": [["08:00","19:30"]], …} con 1 = lunedì */
  orari_settimana: Record<string, [string, string][]> | null;
  /** "manuale" se inserito da 739, "osm" se importato ogni notte da OpenStreetMap (migrazione 0010) */
  fonte: string;
} & Partial<CampiScheda>;

/** Una pratica che si fa in un luogo (uffici): «Cosa posso fare qui» */
export type Pratica = { titolo: string; testo?: string; documenti?: string[]; link?: string };

/** Campi della scheda unica (migrazione 0013) */
export type CampiScheda = {
  area: string | null;
  sottocategoria: string | null;
  sito: string | null;
  email: string | null;
  foto_url: string | null;
  foto_credito: string | null;
  fonte_nome: string | null;
  fonte_link: string | null;
  verificato_il: string | null;
  cosa_fare: Pratica[] | null;
};

export const CAMPI_LUOGO = "id, nome, categoria, descrizione, lat, lng, castello_id, indirizzo, telefono, orari, tariffa, posti, da_verificare, orari_settimana, fonte, sottocategoria";
export const CAMPI_SCHEDA = `${CAMPI_LUOGO}, area, sito, email, foto_url, foto_credito, fonte_nome, fonte_link, verificato_il, cosa_fare`;
export type Evento = {
  id: string;
  titolo: string;
  descrizione: string | null;
  inizio: string;
  fine: string | null;
  metri: number;
  organizzatore: string | null;
  luogo: { id: string; nome: string; lat: number; lng: number } | null;
  castello: { id: number; slug: string; nome: string; colore: string } | null;
  /** Da dove viene l'evento, se è arrivato dalla coda delle bozze (es. "Libertas") */
  fonte: string | null;
  link_fonte: string | null;
  /** Dalla migrazione 0022 (proposte e organizzatori): possono mancare */
  per_chi?: string | null;
  prezzo?: string | null;
  foto_url?: string | null;
  foto_credito?: string | null;
  contatto?: string | null;
  indirizzo?: string | null;
};

const CAMPI_BASE =
  "id, titolo, descrizione, inizio, fine, metri, organizzatore, fonte, link_fonte, luogo:luoghi(id, nome, lat, lng), castello:castelli(id, slug, nome, colore)";
const CAMPI_EVENTO = `${CAMPI_BASE}, per_chi, prezzo, foto_url, foto_credito, contatto, indirizzo`;

const TZ = "Europe/San_Marino";

function daOra() {
  return new Date(Date.now() - 6 * 3600 * 1000).toISOString();
}

export async function getEventi(limite = 50, castelloId?: number): Promise<Evento[]> {
  const db = supabase();
  if (!db) return [];
  const leggi = (campi: string) => {
    let q = db.from("eventi").select(campi).gte("inizio", daOra()).order("inizio", { ascending: true }).limit(limite);
    if (castelloId) q = q.eq("castello_id", castelloId);
    return q;
  };
  let { data, error } = await leggi(CAMPI_EVENTO);
  // Prima della 0022 i campi nuovi non ci sono: si leggono quelli di base
  if (error?.code === "42703") ({ data, error } = await leggi(CAMPI_BASE));
  if (error) {
    console.error("eventi", error.message);
    return [];
  }
  return (data ?? []) as unknown as Evento[];
}

/** I prossimi eventi per un pubblico (per_chi), per esempio fiere e convegni per chi lavora */
export async function getEventiPerChi(perChi: string, limite = 50): Promise<Evento[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.from("eventi").select(CAMPI_EVENTO).eq("per_chi", perChi).gte("inizio", daOra()).order("inizio", { ascending: true }).limit(limite);
  if (error) {
    if (error.code !== "42703") console.error("eventi per chi", error.message);
    return [];
  }
  return (data ?? []) as unknown as Evento[];
}

export async function getEvento(id: string): Promise<Evento | null> {
  const db = supabase();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  let { data, error } = await db.from("eventi").select(CAMPI_EVENTO).eq("id", id).maybeSingle();
  if (error?.code === "42703") ({ data, error } = await db.from("eventi").select(CAMPI_BASE).eq("id", id).maybeSingle());
  if (error) {
    console.error("evento", error.message);
    return null;
  }
  return (data as unknown as Evento) ?? null;
}

export async function getLuoghi(castelloId?: number): Promise<Luogo[]> {
  const db = supabase();
  if (!db) return [];
  // Più di 1000 luoghi: a pagine (lib/a-pagine.ts). L'ordine per id a parità di nome tiene stabili le pagine
  const { data, error } = await aPagine((da, a) => {
    let q = db.from("luoghi").select(CAMPI_LUOGO).order("nome").order("id");
    if (castelloId) q = q.eq("castello_id", castelloId);
    return q.range(da, a);
  });
  if (error) {
    console.error("luoghi", error.message);
    return [];
  }
  return (data ?? []) as Luogo[];
}

/** 739 Pro di una scheda (migrazione 0035): menu, prenota e offerte in corso. null se non è Pro. */
export type DatiPro = { menu_url: string | null; prenota_url: string | null; offerte: { titolo: string; testo: string | null; al: string }[] };

export async function getPro(id: string): Promise<DatiPro | null> {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db.rpc("dati_pro", { p_luogo: id });
  return error ? null : ((data as DatiPro | null) ?? null);
}

/** Le offerte in corso delle schede Pro, per le liste delle sezioni */
export async function getOfferteInCorso(): Promise<Map<string, string>> {
  const db = supabase();
  if (!db) return new Map();
  const { data, error } = await db.rpc("offerte_in_corso");
  if (error || !data) return new Map();
  return new Map((data as { luogo_id: string; titolo: string }[]).map((o) => [o.luogo_id, o.titolo]));
}

/** La scheda è gestita dal titolare dell'attività? (migrazione 0034; prima della migrazione: no) */
export async function getGestito(id: string): Promise<boolean> {
  const db = supabase();
  if (!db) return false;
  const { data, error } = await db.rpc("luogo_gestito", { p_luogo: id });
  return !error && data === true;
}

/** Un luogo con tutti i campi della scheda. Finché la migrazione 0013 non c'è, legge solo i campi di base. */
export async function getLuogo(id: string): Promise<Luogo | null> {
  const db = supabase();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  let r = await db.from("luoghi").select(CAMPI_SCHEDA).eq("id", id).maybeSingle();
  if (r.error?.code === "42703") r = await db.from("luoghi").select(CAMPI_LUOGO).eq("id", id).maybeSingle();
  if (r.error) {
    console.error("luogo", r.error.message);
    return null;
  }
  return (r.data as Luogo | null) ?? null;
}

export type PraticaDi = Pratica & { luogo_id: string; luogo: string; indice: number };

/** Le pratiche («Cosa posso fare qui») dei luoghi di alcune categorie, per cercare «cosa devo fare». Vuoto finché non c'è la 0013. */
export async function getPratiche(categorie: string[]): Promise<PraticaDi[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.from("luoghi").select("id, nome, cosa_fare").in("categoria", categorie).not("cosa_fare", "is", null).order("nome");
  if (error) {
    if (error.code !== "42703") console.error("pratiche", error.message);
    return [];
  }
  return (data ?? []).flatMap((l: { id: string; nome: string; cosa_fare: unknown }) =>
    // Stesso ordine della scheda (solo le pratiche con titolo), così l'indice porta alla pratica giusta
    (Array.isArray(l.cosa_fare) ? (l.cosa_fare as Pratica[]) : [])
      .filter((p) => p?.titolo)
      .map((p, indice) => ({ ...p, luogo_id: l.id, luogo: l.nome, indice })),
  );
}

export async function getClassifica(): Promise<Castello[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("classifica_castelli_totali");
  if (error) {
    console.error("classifica", error.message);
    return [];
  }
  return (data ?? []).map((c: Castello & { metri: number | string }) => ({ ...c, metri: Number(c.metri) }));
}

/* Date e orari, sempre nel fuso di San Marino */

function parti(d: Date) {
  const p = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${v("year")}-${v("month")}-${v("day")}`;
}

export function chiaveGiorno(iso: string) {
  return parti(new Date(iso));
}

export function etichettaGiorno(iso: string) {
  const oggi = parti(new Date());
  const domani = parti(new Date(Date.now() + 86400000));
  const k = chiaveGiorno(iso);
  if (k === oggi) return "Oggi";
  if (k === domani) return "Domani";
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

export function ora(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function giornoNumero(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, day: "numeric" }).format(new Date(iso));
}

export function meseBreve(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, month: "short" }).format(new Date(iso)).replace(".", "");
}

export function formatData(iso: string) {
  return `${etichettaGiorno(iso)} · ${ora(iso)}`;
}

export function oggiLungo() {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

export function saluto() {
  const h = Number(new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  if (h < 5) return "Buonanotte";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export function linkCalendario(e: Evento) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const inizio = new Date(e.inizio);
  const fine = e.fine ? new Date(e.fine) : new Date(inizio.getTime() + 2 * 3600 * 1000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titolo,
    dates: `${f(inizio)}/${f(fine)}`,
    details: e.descrizione ?? "",
    location: e.luogo ? `${e.luogo.nome}, San Marino` : "San Marino",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function linkIndicazioni(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export { testoSu } from "./colore";

export const CATEGORIE: Record<string, string> = {
  luogo: "Luoghi",
  trasporti: "Trasporti",
  parcheggio: "Parcheggi",
  farmacia: "Farmacie",
  impianto: "Sport",
  locale: "Locali",
  servizio: "Servizi",
  cultura: "Musei e monumenti",
  panorama: "Panorami",
  bagni: "Bagni pubblici",
  acqua: "Fontanelle",
  ricarica: "Ricarica auto",
  avviso: "Avvisi",
  ufficio: "Uffici pubblici",
  salute: "Salute",
  posta: "Uffici postali",
  banca: "Banche e bancomat",
  carburante: "Distributori di carburante",
  scuola: "Scuole",
  chiesa: "Chiese",
  negozio: "Negozi",
  azienda: "Aziende",
  professionista: "Professionisti",
  artigiano: "Artigiani",
  animali: "Animali",
  associazione: "Associazioni",
  dormire: "Dormire",
};

/** Come si legge il tipo di un luogo nella sua scheda, quando non basta la parola della sottocategoria */
export const TIPI_LEGGIBILI: Record<string, string> = {
  casa: "Casa e fai da te",
  servizi: "Servizi",
  auto: "Auto e moto",
  "libri e giochi": "Libri, musica e giochi",
  // Lavorare (migrazione 0036)
  informatica: "Informatica e web",
  edilizia: "Edilizia e immobili",
  industria: "Industria e produzione",
  commercio: "Commercio e distribuzione",
  finanza: "Finanza e assicurazioni",
  turismo: "Turismo e ospitalità",
  comunicazione: "Comunicazione e marketing",
  edile: "Impresa edile",
  meccanico: "Meccanico e carrozziere",
  parrucchiere: "Parrucchiere ed estetista",
  // Animali e associazioni (migrazione 0039)
  rifugio: "Rifugio per animali",
  addestramento: "Centro cinofilo",
  pensione: "Pensione per animali",
  culturale: "Associazione culturale",
  volontariato: "Associazione di volontariato",
  sportiva: "Società sportiva",
  ricreativa: "Circolo e associazione ricreativa",
  religiosa: "Associazione religiosa",
  "di categoria": "Associazione di categoria",
  // Dormire (migrazione 0041)
  hotel: "Hotel",
  "bed and breakfast": "Bed and breakfast",
  residence: "Residence",
  campeggio: "Campeggio",
  agriturismo: "Agriturismo",
};

/** Il nome di una categoria per una sola scheda, quando il tipo è «altro» */
export const CATEGORIA_SINGOLA: Record<string, string> = {
  azienda: "Azienda", professionista: "Studio professionale", artigiano: "Artigiano", animali: "Servizi per animali", associazione: "Associazione", dormire: "Struttura ricettiva",
};
