import { filtra, oggiSM, piuMesi, scadenzeTra } from "@/modules/lavorare/calendario-fiscale";
import { AGGIORNATO_IL } from "@/modules/lavorare/dati/calendario-fiscale";

// Il calendario fiscale come file .ics (Google Calendar, Apple Calendar, Outlook): un evento di un giorno per
// ogni scadenza dei prossimi 12 mesi, con gli stessi filtri della pagina (?categoria=…&destinatari=…).
// Scritto a mano secondo RFC 5545, senza librerie.

const SITO = "https://739-san-marino.vercel.app";

/** Testo per l'ics: si tolgono gli a capo e si proteggono virgole, punti e virgola e barre */
const testo = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");
/** Le righe lunghe vanno spezzate a 75 byte, continuando con uno spazio */
function piega(riga: string) {
  const byte = new TextEncoder();
  const parti: string[] = [];
  let corrente = "";
  for (const c of riga) {
    if (byte.encode(corrente + c).length > (parti.length ? 74 : 75)) {
      parti.push(corrente);
      corrente = "";
    }
    corrente += c;
  }
  parti.push(corrente);
  return parti.join("\r\n ");
}
const compatta = (d: string) => d.replace(/-/g, "");
const giornoDopo = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

export function GET(richiesta: Request) {
  const url = new URL(richiesta.url);
  const oggi = oggiSM();
  const scadenze = filtra(scadenzeTra(oggi, piuMesi(oggi, 12)), url.searchParams.get("categoria"), url.searchParams.get("destinatari"));
  const adesso = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const righe = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//739 San Marino//Calendario fiscale//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Calendario fiscale San Marino (739)",
    "X-WR-TIMEZONE:Europe/San_Marino",
  ];
  for (const s of scadenze) {
    const fonte = s.fonti[0];
    const descrizione = [
      s.voce.descrizione,
      s.nota,
      s.voce.note,
      s.weekend ? "Cade nel weekend: verificare l'eventuale slittamento." : null,
      s.stato !== "confermato" ? "Da verificare." : null,
      s.voce.riferimento_normativo ? `Riferimento: ${s.voce.riferimento_normativo}` : null,
      fonte ? `Fonte: ${fonte.nome}, ${fonte.url}` : null,
      `Calendario informativo di 739, non ufficiale (dati aggiornati al ${AGGIORNATO_IL.split("-").reverse().join("/")}): verifica con l'Ufficio Tributario, l'ISS o il tuo commercialista.`,
    ].filter(Boolean).join("\n");
    righe.push(
      "BEGIN:VEVENT",
      `UID:${s.chiave}@739-san-marino`,
      `DTSTAMP:${adesso}`,
      `DTSTART;VALUE=DATE:${compatta(s.data)}`,
      `DTEND;VALUE=DATE:${compatta(giornoDopo(s.data))}`,
      piega(`SUMMARY:${testo(s.voce.titolo)}`),
      piega(`DESCRIPTION:${testo(descrizione)}`),
      piega(`CATEGORIES:${testo(s.voce.categoria)}`),
      `URL:${SITO}/lavorare/calendario-fiscale`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  righe.push("END:VCALENDAR");
  return new Response(righe.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="calendario-fiscale-san-marino.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
