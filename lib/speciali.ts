import { supabase } from "./supabase";
import { getContenuto, type Contenuto } from "./contenuti";
import { CAMPI_LUOGO, chiaveGiorno, type Evento, type Luogo } from "./data";
import { getParcheggi } from "./servizi";
import type { Avviso } from "./avvisi";

// Speciali (passo 1.4): contenuti di tipo «speciale» per le grandi occasioni (Natale delle Meraviglie, Giornate
// Medievali, 3 settembre). Non hanno date proprie: il periodo è quello degli eventi collegati, dal primo giorno
// all'ultimo. Così uno speciale è «in corso» da solo, senza altri campi nel database.

export type Periodo = { dal: string; al: string };

export type Speciale = {
  contenuto: Contenuto;
  periodo: Periodo | null;
  eventi: Evento[];
  luoghi: Luogo[];
  /** Parcheggi e navette: quelli collegati allo speciale, oppure tutti i parcheggi se la redazione non ne ha scelti */
  parcheggi: Luogo[];
  parcheggiScelti: boolean;
  avvisi: Avviso[];
};

const CAMPI_EVENTO =
  "id, titolo, descrizione, inizio, fine, metri, organizzatore, fonte, link_fonte, luogo:luoghi(id, nome, lat, lng), castello:castelli(id, slug, nome, colore)";
const CAMPI_AVVISO = "id, titolo, testo, tipo, castello_id, luogo_id, lat, lng, dal, al, gravita, fonte_nome, fonte_link, luogo:luoghi(id, nome, lat, lng)";

/** Primo e ultimo istante coperti dagli eventi (un evento senza fine dura fino a fine giornata) */
export function periodoDi(eventi: { inizio: string; fine: string | null }[]): Periodo | null {
  if (!eventi.length) return null;
  const inizi = eventi.map((e) => new Date(e.inizio).getTime());
  const fini = eventi.map((e) => new Date(e.fine ?? e.inizio).getTime());
  return { dal: new Date(Math.min(...inizi)).toISOString(), al: new Date(Math.max(...fini)).toISOString() };
}

/** In corso da mezzanotte del primo giorno alla fine dell'ultimo, ora di San Marino */
export function inCorso(p: Periodo | null, adesso = new Date()) {
  if (!p) return false;
  const oggi = chiaveGiorno(adesso.toISOString());
  return chiaveGiorno(p.dal) <= oggi && oggi <= chiaveGiorno(p.al);
}

const GIORNO = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
const SOLO_GIORNO = new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: "Europe/San_Marino" });

/** «12 dicembre», «dal 5 al 24 dicembre», «dal 28 novembre al 6 gennaio» */
export function testoPeriodo(p: Periodo) {
  const a = new Date(p.dal);
  const b = new Date(p.al);
  if (chiaveGiorno(p.dal) === chiaveGiorno(p.al)) return GIORNO.format(a);
  const stessoMese = GIORNO.format(a).split(" ")[1] === GIORNO.format(b).split(" ")[1];
  return stessoMese ? `dal ${SOLO_GIORNO.format(a)} al ${GIORNO.format(b)}` : `dal ${GIORNO.format(a)} al ${GIORNO.format(b)}`;
}

export async function getSpeciale(slug: string): Promise<Speciale | null> {
  const c = await getContenuto(slug);
  if (!c || c.tipo !== "speciale") return null;
  const db = supabase();
  if (!db) return null;

  const [ev, lu] = await Promise.all([
    c.eventi.length ? db.from("eventi").select(CAMPI_EVENTO).in("id", c.eventi).eq("pubblicato", true).order("inizio") : Promise.resolve({ data: [] }),
    c.luoghi.length ? db.from("luoghi").select(CAMPI_LUOGO).in("id", c.luoghi) : Promise.resolve({ data: [] }),
  ]);
  const eventi = (ev.data ?? []) as unknown as Evento[];
  const tutti = ((lu.data ?? []) as Luogo[]).sort((a, b) => c.luoghi.indexOf(a.id) - c.luoghi.indexOf(b.id));
  const periodo = periodoDi(eventi);

  // Parcheggi e navette scelti dalla redazione tra i luoghi collegati; altrimenti i parcheggi di sempre
  const scelti = tutti.filter((l) => l.categoria === "parcheggio" || l.categoria === "trasporti");
  const parcheggi = scelti.length ? scelti : await getParcheggi();
  const luoghi = tutti.filter((l) => !scelti.includes(l));

  // Avvisi che toccano il periodo dello speciale (o in corso adesso, se non ha ancora eventi)
  let avvisi: Avviso[] = [];
  const dal = periodo?.dal ?? new Date().toISOString();
  const al = periodo ? new Date(new Date(periodo.al).getTime() + 86_400_000).toISOString() : new Date().toISOString();
  const { data: av, error } = await db
    .from("avvisi")
    .select(CAMPI_AVVISO)
    .lte("dal", al)
    .or(`al.is.null,al.gt.${dal}`)
    .order("gravita")
    .order("dal")
    .limit(20);
  if (!error) avvisi = (av ?? []) as unknown as Avviso[];

  return { contenuto: c, periodo, eventi, luoghi, parcheggi, parcheggiScelti: scelti.length > 0, avvisi };
}

export type SpecialeBreve = Pick<Contenuto, "id" | "titolo" | "slug" | "sommario" | "foto_url" | "foto_credito"> & { periodo: Periodo; eventi: number };

/** Lo speciale in corso oggi, per Oggi (il più vicino alla fine, se ce ne sono due) */
export async function getSpecialeInCorso(): Promise<SpecialeBreve | null> {
  const db = supabase();
  if (!db) return null;
  const { data, error } = await db
    .from("contenuti")
    .select("id, titolo, slug, sommario, foto_url, foto_credito, eventi")
    .eq("tipo", "speciale")
    .order("pubblicato_il", { ascending: false })
    .limit(10);
  if (error || !data?.length) return null;
  const ids = [...new Set(data.flatMap((c) => (c.eventi as string[] | null) ?? []))];
  if (!ids.length) return null;
  const { data: ev } = await db.from("eventi").select("id, inizio, fine").in("id", ids).eq("pubblicato", true);
  const eventi = (ev ?? []) as { id: string; inizio: string; fine: string | null }[];

  const candidati = data
    .map((c) => {
      const suoi = eventi.filter((e) => ((c.eventi as string[] | null) ?? []).includes(e.id));
      return { c, periodo: periodoDi(suoi), n: suoi.length };
    })
    .filter((x): x is typeof x & { periodo: Periodo } => inCorso(x.periodo))
    .sort((a, b) => a.periodo.al.localeCompare(b.periodo.al));
  const primo = candidati[0];
  if (!primo) return null;
  const c = primo.c;
  return { id: c.id, titolo: c.titolo, slug: c.slug, sommario: c.sommario, foto_url: c.foto_url, foto_credito: c.foto_credito, periodo: primo.periodo, eventi: primo.n };
}

/** Gli eventi dello speciale divisi per giorno (chiave «2026-12-08»), nell'ordine */
export function perGiorno(eventi: Evento[]) {
  const giorni = new Map<string, Evento[]>();
  for (const e of eventi) {
    const k = chiaveGiorno(e.inizio);
    giorni.set(k, [...(giorni.get(k) ?? []), e]);
  }
  return [...giorni.entries()];
}
