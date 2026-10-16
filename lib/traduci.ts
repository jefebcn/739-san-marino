/*
 * Traduzione in inglese dei testi brevi dei servizi che arrivano dal database (orari, tariffe, parcheggi, linee),
 * a frasi fisse: quello che non è nell'elenco resta in italiano. Niente traduzione automatica: i testi
 * scritti dai titolari e dalla redazione restano come sono.
 * Per un testo nuovo che resta in italiano si aggiunge la frase qui sotto.
 */

type Coppia = [string | RegExp, string | ((...m: string[]) => string)];

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MESI_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const mese = (m: string) => MESI_EN[MESI.indexOf(m.toLowerCase())] ?? m;
const ordinale = (n: string) => n + (({ "1": "st", "2": "nd", "3": "rd" } as Record<string, string>)[n] ?? "th");

// Prima le frasi lunghe, poi le parole: l'ordine conta
const FRASI: Coppia[] = [
  // Prima delle parole che contiene
  ["a persona con navetta andata e ritorno, fino alle 21", "per person with return shuttle, until 21:00"],
  // Le tre torri
  ["Prima Torre", "First Tower"],
  ["Seconda Torre", "Second Tower"],
  ["Terza Torre", "Third Tower"],
  // Farmacie
  ["Sempre aperta, 24 ore su 24.", "Always open, 24 hours a day."],
  ["Dalle 23 alle 6 solo per casi urgenti, festivi compresi.", "From 23:00 to 6:00 urgent cases only, holidays included."],
  ["Di notte e nei festivi il servizio è garantito qui.", "At night and on public holidays this pharmacy is always open."],
  [/Chiusa la (\d)ª e (\d)ª settimana di (\w+)\./g, (_, a, b, m) => `Closed in the ${ordinale(a)} and ${ordinale(b)} week of ${mese(m)}.`],
  ["Domenica e festivi", "Sundays and holidays"],
  ["in estate", "in summer"],
  // Funivia e bus
  ["Una corsa ogni 15 minuti circa, continua nei momenti di grande afflusso.", "A car about every 15 minutes, nonstop at busy times."],
  ["Il viaggio dura meno di 2 minuti.", "The ride takes under 2 minutes."],
  [/Chiusa per collaudi dal (\d+) al (\d+) (\w+) (\d{4})\./g, (_, a, b, m, y) => `Closed for safety checks from ${a} to ${b} ${mese(m)} ${y}.`],
  [/Chiusa per collaudi il (\d+) (\w+) (\d{4})\./g, (_, a, m, y) => `Closed for safety checks on ${a} ${mese(m)} ${y}.`],
  ["Da Rimini Stazione FS a San Marino Ex Stazione (P2), circa 55 minuti.", "From Rimini railway station to San Marino Ex Stazione (P2), about 55 minutes."],
  ["Fermate:", "Stops:"],
  ["Nei festivi vale l'orario della domenica.", "On public holidays the Sunday timetable applies."],
  ["Funivia Borgo – Città", "Cable car Borgo Maggiore – Città"],
  ["corsa singola", "single"],
  ["andata e ritorno", "return"],
  ["giornaliero", "day ticket"],
  ["gratis sotto i 120 cm", "free under 120 cm"],
  ["ridotto", "reduced"],
  ["a corsa", "per trip"],
  [/\(tariffe (\d{4})\)/g, "($1 fares)"],
  ["tariffe", "fares"],
  // Parcheggi
  ["la 1ª ora", "1st hour"],
  ["la 2ª", "2nd hour"],
  ["dalla 3ª alla 5ª", "3rd to 5th hour"],
  ["la giornata", "full day"],
  ["tariffa unica", "flat rate"],
  ["carico e scarico fino a 30 min", "drop-off up to 30 min"],
  ["Auto come gli altri", "Cars as in the other car parks"],
  ["per 2 ore", "for 2 hours"],
  ["giornata", "full day"],
  ["(ott–mar)", "(Oct–Mar)"],
  ["(apr–set)", "(Apr–Sep)"],
  ["Gratuita", "Free"],
  ["Multipiano coperto", "Covered multi-storey"],
  ["Ascensori per il centro storico.", "Lifts up to the old town."],
  ["Vicino alla funivia.", "Near the cable car."],
  ["Aperto nei giorni di grande afflusso, con navetta per il centro.", "Open on busy days, with a shuttle to the centre."],
  ["Area di sosta camper aperta 24 ore, con scarico e acqua.", "Camper stop open 24 hours, with waste disposal and water."],
  ["Solo bus", "Buses only"],
  ["con addetto", "attended"],
  ["Lavori in corso.", "Works in progress."],
  ["Auto e camper", "Cars and campers"],
  ["aperto 24 ore", "open 24 hours"],
  ["parcometro", "pay at the meter"],
  ["sbarra", "barrier"],
  [/\bAuto\b/g, "Cars"],
  [/\bcamper\b/g, "campers"],
  [/ o /g, " or "],
  // Giorni
  ["Lunedì, mercoledì e venerdì", "Monday, Wednesday and Friday"],
  ["Lunedì e sabato", "Monday and Saturday"],
  ["Lun–sab", "Mon–Sat"],
  ["Lun–ven", "Mon–Fri"],
  ["Mar–ven", "Tue–Fri"],
  ["Mar–sab", "Tue–Sat"],
  [/ e /g, " and "],
];

/** Il testo in inglese, per quanto lo dicono le frasi conosciute */
export function traduci(testo: string | null | undefined): string {
  if (!testo) return "";
  let s = testo;
  for (const [it, en] of FRASI) {
    if (typeof it === "string") s = s.split(it).join(typeof en === "string" ? en : en(it));
    else s = typeof en === "string" ? s.replace(it, en) : s.replace(it, (...m) => en(...(m.slice(0, -2) as string[])));
  }
  // Separatore dei dati vecchi, virgola dei decimali, orari col punto (8.00 diventa 08:00)
  return s
    .replace(/ · /g, ", ")
    .replace(/(?<!€)\b(\d{1,2})\.(\d{2})\b/g, (_, h: string, m: string) => `${h.padStart(2, "0")}:${m}`)
    .replace(/€(\d+),(\d{2})/g, "€$1.$2");
}

/** Vale la pena mostrarlo? Se è rimasto quasi tutto in italiano, meglio dire che è in italiano */
export function tuttoTradotto(testo: string) {
  return !/\b(il|la|di|del|della|per|con|alle|dalle|sono|chiuso|chiusa|aperto|aperta|orari|giorni)\b/i.test(testo);
}
