import dati from "./dati/sentieri.json";

// I sentieri di San Marino da OpenStreetMap (scripts/sentieri.mjs scrive dati/sentieri.json, niente database).
// Tracciati © OpenStreetMap contributors (ODbL), tramite Waymarked Trails; quote dal modello EU-DEM tramite OpenTopoData.

export type Sentiero = {
  /** Relazione di OpenStreetMap */
  id: number;
  slug: string;
  /** Il numero sui cartelli (2, 10a…) */
  numero: string | null;
  nome: string;
  da: string | null;
  a: string | null;
  via: string | null;
  lunghezza_m: number;
  anello: boolean;
  /** Un solo tratto: si può calcolare salita e profilo */
  continuo: boolean;
  /** Su OSM il tracciato ha dei pezzi mancanti o una nota da sistemare */
  tratti_mancanti: boolean;
  /** false quando su OSM è scritto «non segnalato» */
  segnalato: false | null;
  difficolta: "facile" | "medio-facile" | "media" | "medio-difficile" | "impegnativo" | null;
  /** Tempo scritto su OSM, in minuti */
  durata_min: number | null;
  descrizione: string | null;
  gestore: string | null;
  sito: string | null;
  mappa_pdf: string | null;
  /** Castelli attraversati, dal tratto più lungo */
  castelli: number[];
  in_sm: number;
  quota_min: number | null;
  quota_max: number | null;
  salita_m: number | null;
  discesa_m: number | null;
  /** [metri dalla partenza, quota] */
  profilo: [number, number][] | null;
  inizio: [number, number];
  bbox: [number, number, number, number];
  /** Tratti del percorso, [lng, lat] */
  linee: [number, number][][];
};

export const SENTIERI = dati.sentieri as Sentiero[];
export const AGGIORNATO_IL = dati.aggiornato_il;

export const sentiero = (slug: string) => SENTIERI.find((s) => s.slug === slug) ?? null;

/** Il numero senza la lettera della variante: 10a → 10 */
export const numeroBase = (s: Sentiero) => s.numero?.match(/^\d+/)?.[0] ?? null;

/** Gli altri sentieri con lo stesso numero (il principale e le varianti) */
export function collegati(s: Sentiero) {
  const base = numeroBase(s);
  return base ? SENTIERI.filter((x) => x.id !== s.id && numeroBase(x) === base) : [];
}

export const km = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);

/** Il dislivello: nel verso più faticoso se il tracciato è continuo, se no tra il punto più basso e il più alto */
export function dislivello(s: Sentiero) {
  if (s.continuo && s.salita_m !== null && s.discesa_m !== null) return s.anello ? s.salita_m : Math.max(s.salita_m, s.discesa_m);
  return s.quota_max !== null && s.quota_min !== null ? s.quota_max - s.quota_min : null;
}

/** Il tempo: quello scritto su OSM, se no una stima (4 km/h in piano, 400 m/h in salita), arrotondata a 5 minuti */
export function tempo(s: Sentiero): { minuti: number; stima: boolean } {
  if (s.durata_min) return { minuti: s.durata_min, stima: false };
  const minuti = (s.lunghezza_m / 4000) * 60 + ((dislivello(s) ?? 0) / 400) * 60;
  return { minuti: Math.max(5, Math.round(minuti / 5) * 5), stima: true };
}

export function durata(minuti: number) {
  const h = Math.floor(minuti / 60), m = minuti % 60;
  return h ? `${h} h${m ? ` ${m}` : ""}` : `${m} min`;
}

export type Fascia = "breve" | "media" | "lunga";
export const fascia = (s: Sentiero): Fascia => (s.lunghezza_m < 1500 ? "breve" : s.lunghezza_m <= 3000 ? "media" : "lunga");

export const DIFFICOLTA: Record<NonNullable<Sentiero["difficolta"]>, string> = {
  facile: "Facile",
  "medio-facile": "Medio-facile",
  media: "Media",
  "medio-difficile": "Medio-difficile",
  impegnativo: "Impegnativo",
};

/** La riga sotto il nome: da dove a dove, o anello */
export function percorso(s: Sentiero) {
  if (s.anello) return s.via ? `Anello: ${s.via.replace(/\s+-\s+/g, ", ")}` : "Anello";
  if (s.da && s.a) return `Da ${s.da} a ${s.a}`;
  return s.via ? s.via.replace(/\s+-\s+/g, ", ") : null;
}

export const titolo = (s: Sentiero) => (s.numero ? `Sentiero ${s.numero}, ${s.nome}` : s.nome);
