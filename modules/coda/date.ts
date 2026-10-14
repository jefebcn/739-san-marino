// Prima data e ora citate in un testo in italiano («venerdì 16 ottobre, alle ore 21», «dal 10 al 18 ottobre 2026»).
// Servono solo a precompilare il modulo del pannello: chi approva le controlla sempre.

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const RE_DATA = new RegExp(
  // «10 e domenica 11 ottobre», «7 all’11 ottobre», «10-12 ottobre»: vale il primo giorno
  `\\b(\\d{1,2})(?:°|º)?(?:\\s*(?:e|al|all[’']|-|–)\\s*(?:(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\\s+)?\\d{1,2})?\\s+(${MESI.join("|")})(?:\\s+(\\d{4}))?`,
  "i",
);
const RE_ORA = /\b(?:alle\s+(?:ore\s+)?|ore\s+|dalle\s+(?:ore\s+)?)(\d{1,2})(?:[.:,](\d{2}))?\b/i;

const due = (n: number) => String(n).padStart(2, "0");

/** `riferimento` è la data dell'articolo: un giorno senza anno cade nell'anno che lo rende più vicino a quella data. */
export function suggerisciData(testo: string, riferimento?: string): { data: string | null; ora: string | null } {
  let data: string | null = null;
  const d = testo.match(RE_DATA);
  if (d) {
    const giorno = Number(d[1]);
    const mese = MESI.indexOf(d[2].toLowerCase());
    const base = riferimento ? new Date(riferimento) : new Date();
    let anno = d[3] ? Number(d[3]) : base.getFullYear();
    // Un articolo di dicembre che parla di «6 gennaio» intende l'anno dopo
    if (!d[3] && Date.UTC(anno, mese, giorno) < base.getTime() - 60 * 86_400_000) anno += 1;
    if (giorno >= 1 && giorno <= 31) data = `${anno}-${due(mese + 1)}-${due(giorno)}`;
  }

  let ora: string | null = null;
  const o = testo.match(RE_ORA);
  if (o) {
    const h = Number(o[1]);
    const m = o[2] ? Number(o[2]) : 0;
    if (h <= 23 && m <= 59) ora = `${due(h)}:${due(m)}`;
  }
  return { data, ora };
}
