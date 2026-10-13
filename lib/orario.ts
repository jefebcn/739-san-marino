/* Orari dei servizi calcolati nel fuso di San Marino. Senza dipendenze: si usa anche nel browser. */

const TZ = "Europe/San_Marino";

export type Partenza = { linea_id: string; direzione: string; ora: string; giorni: number[]; dal: string | null; al: string | null };

export const GIORNI_BREVI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
export const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

/** Giorno della settimana (1 = lunedì … 7 = domenica), minuti dalla mezzanotte e data, a San Marino. */
export function adessoSM(d: Date = new Date()) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(v("weekday")) + 1;
  return { dow, minuti: Number(v("hour")) * 60 + Number(v("minute")), data: `${v("year")}-${v("month")}-${v("day")}` };
}

function minuti(ora: string) {
  const [h, m] = ora.split(":").map(Number);
  return h * 60 + m;
}

function aggiungiGiorni(data: string, n: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function valida(p: Partenza, data: string, dow: number) {
  return p.giorni.includes(dow) && (!p.dal || data >= p.dal) && (!p.al || data <= p.al);
}

/** Prossime partenze da adesso, guardando anche a domani se oggi sono finite. */
export function prossimePartenze(partenze: Partenza[], quante = 6, ora: Date = new Date()) {
  const { dow, minuti: adesso, data } = adessoSM(ora);
  const out: { p: Partenza; tra: number; domani: boolean }[] = [];
  for (let g = 0; g < 2 && out.length < quante; g++) {
    const giorno = aggiungiGiorni(data, g);
    const dowG = ((dow - 1 + g) % 7) + 1;
    const lista = partenze
      .filter((p) => valida(p, giorno, dowG))
      .map((p) => ({ p, tra: minuti(p.ora) - adesso + g * 1440, domani: g === 1 }))
      .filter((x) => x.tra >= 0)
      .sort((a, b) => a.tra - b.tra);
    out.push(...lista.slice(0, quante - out.length));
  }
  return out;
}

/** Aperto adesso secondo gli orari settimanali? Dice anche quando chiude o quando riapre. */
export function apertura(orari: Record<string, [string, string][]> | null, ora: Date = new Date()) {
  if (!orari) return null;
  const { dow, minuti: adesso } = adessoSM(ora);
  const oggi = orari[String(dow)] ?? [];
  const sempre = Object.keys(orari).length === 7 && Object.values(orari).every((f) => f.some(([a, b]) => a === "00:00" && b === "24:00"));
  if (sempre) return { aperta: true, sempre: true, chiude: null, riapre: null };
  const corrente = oggi.find(([a, b]) => minuti(a) <= adesso && adesso < minuti(b));
  if (corrente) return { aperta: true, sempre: false, chiude: corrente[1], riapre: null };
  for (let g = 0; g < 7; g++) {
    const d = ((dow - 1 + g) % 7) + 1;
    const fasce = (orari[String(d)] ?? []).filter(([a]) => g > 0 || minuti(a) > adesso);
    if (fasce.length) {
      const quando = g === 0 ? "oggi" : g === 1 ? "domani" : GIORNI[d - 1];
      return { aperta: false, sempre: false, chiude: null, riapre: `${quando} alle ${fasce[0][0]}` };
    }
  }
  return { aperta: false, sempre: false, chiude: null, riapre: null };
}

/** Le partenze valide oggi o domani: bastano per il conto alla rovescia e pesano poco nella pagina. */
export function partenzeVicine(partenze: Partenza[], ora: Date = new Date()) {
  const { data } = adessoSM(ora);
  const domani = aggiungiGiorni(data, 1);
  return partenze.filter((p) => (!p.al || p.al >= data) && (!p.dal || p.dal <= domani));
}

export function testoTra(tra: number) {
  if (tra <= 0) return "adesso";
  if (tra < 60) return `tra ${tra} min`;
  const h = Math.floor(tra / 60);
  const m = tra % 60;
  return m ? `tra ${h} h ${m} min` : `tra ${h} h`;
}

export function oraBreve(ora: string) {
  return ora.slice(0, 5);
}
