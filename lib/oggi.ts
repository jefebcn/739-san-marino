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
