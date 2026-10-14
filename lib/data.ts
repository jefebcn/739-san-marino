import { supabase } from "./supabase";

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
};

export const CAMPI_LUOGO = "id, nome, categoria, descrizione, lat, lng, castello_id, indirizzo, telefono, orari, tariffa, posti, da_verificare, orari_settimana, fonte";
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
};

const CAMPI_EVENTO =
  "id, titolo, descrizione, inizio, fine, metri, organizzatore, luogo:luoghi(id, nome, lat, lng), castello:castelli(id, slug, nome, colore)";

const TZ = "Europe/San_Marino";

function daOra() {
  return new Date(Date.now() - 6 * 3600 * 1000).toISOString();
}

export async function getEventi(limite = 50, castelloId?: number): Promise<Evento[]> {
  const db = supabase();
  if (!db) return [];
  let q = db.from("eventi").select(CAMPI_EVENTO).gte("inizio", daOra()).order("inizio", { ascending: true }).limit(limite);
  if (castelloId) q = q.eq("castello_id", castelloId);
  const { data, error } = await q;
  if (error) {
    console.error("eventi", error.message);
    return [];
  }
  return (data ?? []) as unknown as Evento[];
}

export async function getEvento(id: string): Promise<Evento | null> {
  const db = supabase();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db.from("eventi").select(CAMPI_EVENTO).eq("id", id).maybeSingle();
  if (error) {
    console.error("evento", error.message);
    return null;
  }
  return (data as unknown as Evento) ?? null;
}

export async function getLuoghi(castelloId?: number): Promise<Luogo[]> {
  const db = supabase();
  if (!db) return [];
  let q = db.from("luoghi").select(CAMPI_LUOGO).order("nome");
  if (castelloId) q = q.eq("castello_id", castelloId);
  const { data, error } = await q;
  if (error) {
    console.error("luoghi", error.message);
    return [];
  }
  return (data ?? []) as Luogo[];
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
};
