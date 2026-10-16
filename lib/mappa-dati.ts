// I dati della mappa grande, chiesti dal telefono per l'area che si sta guardando (migrazione 0037).
// Finché la 0037 non è applicata le funzioni RPC non esistono: si ripiega sui filtri normali di lat e lng,
// che danno gli stessi luoghi (senza indice spaziale né ricerca tollerante agli errori).
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CAMPI_LUOGO, type Luogo } from "@/lib/data";
import { aPagine } from "@/lib/a-pagine";

/** Il minimo per disegnare un luogo sulla mappa e nell'elenco */
export type PuntoMappa = {
  id: string; nome: string; categoria: string; sottocategoria: string | null;
  lat: number; lng: number; indirizzo: string | null; fonte: string; distanza_m?: number | null;
};
/** [ovest, sud, est, nord] */
export type Riquadro = [number, number, number, number];

const CAMPI_PUNTO = "id, nome, categoria, sottocategoria, lat, lng, indirizzo, fonte";
export const LIMITE_RIQUADRO = 3000;
// Il territorio di San Marino con un po' di margine: fuori non c'è niente da chiedere
export const TERRITORIO: Riquadro = [12.39, 43.88, 12.53, 44.0];

let senzaRpc = false;
const manca = (e: { code?: string } | null) => e?.code === "PGRST202" || e?.code === "42883";

/** Allarga il riquadro di una frazione per lato e lo arrotonda verso l'esterno: meno richieste quando si sposta poco */
export function allarga([o, s, e, n]: Riquadro, quanto = 0.3): Riquadro {
  const dx = (e - o) * quanto, dy = (n - s) * quanto, r = 0.005;
  const giu = (v: number) => Math.floor(v / r) * r, su = (v: number) => Math.ceil(v / r) * r;
  return [
    Math.max(giu(o - dx), TERRITORIO[0]), Math.max(giu(s - dy), TERRITORIO[1]),
    Math.min(su(e + dx), TERRITORIO[2]), Math.min(su(n + dy), TERRITORIO[3]),
  ];
}

export const contiene = (a: Riquadro, b: Riquadro) => a[0] <= b[0] && a[1] <= b[1] && a[2] >= b[2] && a[3] >= b[3];
export const dentro = (r: Riquadro, p: { lat: number; lng: number }) => p.lng >= r[0] && p.lng <= r[2] && p.lat >= r[1] && p.lat <= r[3];

/** Tutto il territorio, dalla cache della CDN (app/api/luoghi-mappa): la prima cosa che chiede la mappa */
export async function luoghiDelTerritorio(segnale: AbortSignal): Promise<{ punti: PuntoMappa[]; completo: boolean }> {
  const r = await fetch("/api/luoghi-mappa", { signal: segnale });
  if (!r.ok) throw new Error(`luoghi-mappa ${r.status}`);
  return (await r.json()) as { punti: PuntoMappa[]; completo: boolean };
}

/** I luoghi di un riquadro. `completo` è falso se il riquadro ne ha più del limite. */
export async function luoghiNelRiquadro([o, s, e, n]: Riquadro, segnale: AbortSignal): Promise<{ punti: PuntoMappa[]; completo: boolean }> {
  const db = supabaseBrowser();
  if (!senzaRpc) {
    // Al massimo 1000 righe per richiesta (Supabase): le altre a pagine
    const { data, error } = await aPagine<PuntoMappa>((da, a) => db.rpc("luoghi_mappa", { p_ovest: o, p_sud: s, p_est: e, p_nord: n, p_limite: LIMITE_RIQUADRO }).order("nome").order("id").range(da, a).abortSignal(segnale), LIMITE_RIQUADRO);
    if (!error) {
      const punti = (data ?? []) as PuntoMappa[];
      return { punti, completo: punti.length < LIMITE_RIQUADRO };
    }
    if (!manca(error)) throw new Error(error.message);
    senzaRpc = true;
  }
  const { data, error } = await aPagine<PuntoMappa>((da, a) => db.from("luoghi").select(CAMPI_PUNTO)
    .gte("lng", o).lte("lng", e).gte("lat", s).lte("lat", n)
    .order("nome").order("id").range(da, a).abortSignal(segnale), LIMITE_RIQUADRO);
  if (error) throw new Error(error.message);
  const punti = (data ?? []) as PuntoMappa[];
  return { punti, completo: punti.length < LIMITE_RIQUADRO };
}

/** Ricerca per nome (senza accenti e con errori di battitura dopo la 0037), i più vicini prima se c'è una posizione */
export async function cercaLuoghi(testo: string, posizione: { lat: number; lng: number } | null, segnale: AbortSignal): Promise<PuntoMappa[]> {
  const q = testo.trim().slice(0, 80);
  if (q.length < 2) return [];
  const db = supabaseBrowser();
  if (!senzaRpc) {
    const { data, error } = await db.rpc("cerca_luoghi", { p_testo: q, p_lat: posizione?.lat ?? null, p_lng: posizione?.lng ?? null, p_limite: 12 }).abortSignal(segnale);
    if (!error) return (data ?? []) as PuntoMappa[];
    if (!manca(error)) throw new Error(error.message);
    senzaRpc = true;
  }
  // Senza 0037: «contiene il testo», ignorando maiuscole (gli accenti contano)
  const { data, error } = await db.from("luoghi").select(CAMPI_PUNTO).ilike("nome", `%${q.replace(/[%_,()]/g, " ")}%`).order("nome").limit(12).abortSignal(segnale);
  if (error) throw new Error(error.message);
  return (data ?? []) as PuntoMappa[];
}

/** Tutti i campi di un luogo, per il pannello quando lo si tocca sulla mappa */
const schede = new Map<string, Luogo>();
export async function dettaglioLuogo(id: string): Promise<Luogo | null> {
  const giaVisto = schede.get(id);
  if (giaVisto) return giaVisto;
  const { data, error } = await supabaseBrowser().from("luoghi").select(CAMPI_LUOGO).eq("id", id).maybeSingle();
  if (error || !data) return null;
  schede.set(id, data as Luogo);
  return data as Luogo;
}

export type Indirizzo = { nome: string; dettaglio: string; lat: number; lng: number };

/** Vie, piazze e località di San Marino (Photon, tramite /api/indirizzi) */
export async function cercaIndirizzi(testo: string, segnale: AbortSignal): Promise<Indirizzo[]> {
  const q = testo.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  if (q.length < 3) return [];
  const r = await fetch(`/api/indirizzi?q=${encodeURIComponent(q)}`, { signal: segnale });
  if (!r.ok) return [];
  return ((await r.json()) as { indirizzi: Indirizzo[] }).indirizzi ?? [];
}

/** Distanza in metri tra due punti (formula dell'emisenoverso, basta per un territorio piccolo) */
export function distanzaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180, R = 6371000;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export const leggiDistanza = (m: number, lingua: "it" | "en" = "it") =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace(".", lingua === "en" ? "." : ",")} km`;
