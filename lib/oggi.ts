/* Le fasce di Oggi: la Home cambia con l'ora di San Marino (docs/piano.md, «Oggi, la porta»). Senza dipendenze dal server. */

import { adessoSM, dataOraSM } from "./orario";

export type Fascia = {
  /** mattina 5-12 Bollettino; pomeriggio 12-18; sera dalle 18 (e la notte); weekend da venerdì alle 12 a domenica alle 18 */
  tipo: "mattina" | "pomeriggio" | "sera" | "notte" | "weekend";
  titolo: string;
  /** Il programma va da adesso a questo istante (ISO) */
  al: string;
};

function piu(data: string, n: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Mezzanotte a San Marino n giorni dopo la data indicata */
const mezzanotte = (data: string, n: number) => dataOraSM(piu(data, n), "00:00");

export function fasciaDi(adesso: Date = new Date()): Fascia {
  const { dow, minuti, data } = adessoSM(adesso);
  const h = minuti / 60;
  if (h >= 5 && h < 12) return { tipo: "mattina", titolo: "Oggi", al: mezzanotte(data, 1) };
  const weekend = (dow === 5 && h >= 12) || dow === 6 || (dow === 7 && h < 18);
  if (weekend) return { tipo: "weekend", titolo: "Il weekend", al: mezzanotte(data, 8 - dow) };
  if (h >= 12 && h < 18) return { tipo: "pomeriggio", titolo: "Oggi pomeriggio e stasera", al: mezzanotte(data, 1) };
  if (h >= 18) return { tipo: "sera", titolo: "Stasera e domani", al: mezzanotte(data, 2) };
  // Dopo mezzanotte la serata è finita: resta la giornata appena cominciata
  return { tipo: "notte", titolo: "Oggi", al: mezzanotte(data, 1) };
}

/** Un evento o una partita cade nel periodo se non è già finito e comincia prima della fine. */
export function nelPeriodo(x: { inizio: string; fine?: string | null }, al: string, adesso: Date = new Date()) {
  const inizio = new Date(x.inizio).getTime();
  const fine = x.fine ? new Date(x.fine).getTime() : inizio + 2 * 3600_000;
  return fine > adesso.getTime() && inizio < new Date(al).getTime();
}

/** La prossima mezzanotte a San Marino: fine della giornata in corso. */
export function fineGiornata(adesso: Date = new Date()) {
  return mezzanotte(adessoSM(adesso).data, 1);
}

export type RubricaDelGiorno =
  | { tipo: "castello_settimana" | "come_si_fa" | "weekend" | "partite_settimana" }
  | { tipo: "vetta_mese"; giorno: string };

/**
 * Le rubriche del piano editoriale che toccano oggi (ora di San Marino): lunedì il castello della settimana,
 * mercoledì come si fa, giovedì il weekend dalla vetta, domenica dalle 18 le partite della settimana, l'ultimo giorno del mese
 * e il primo del mese dopo la vetta del mese (`giorno` è un giorno del mese di cui parlare).
 */
export function rubricheDelGiorno(adesso: Date = new Date()): RubricaDelGiorno[] {
  const { dow, minuti, data } = adessoSM(adesso);
  const r: RubricaDelGiorno[] = [];
  if (dow === 1) r.push({ tipo: "castello_settimana" });
  if (dow === 3) r.push({ tipo: "come_si_fa" });
  if (dow === 4) r.push({ tipo: "weekend" });
  if (dow === 7 && minuti >= 18 * 60) r.push({ tipo: "partite_settimana" });
  if (piu(data, 1).endsWith("-01")) r.push({ tipo: "vetta_mese", giorno: data });
  if (data.endsWith("-01")) r.push({ tipo: "vetta_mese", giorno: piu(data, -1) });
  return r;
}
