// Notizie sugli eventi dal feed RSS di Libertas (robots.txt permette la lettura; si mostrano solo titolo,
// data e link all'articolo, come fa qualunque lettore di feed). Gli eventi veri e propri, con data e luogo,
// vanno inseriti a mano dopo averli letti: dal testo libero non si estraggono in modo affidabile.
const FEED = "https://www.libertas.sm/feed/";

export type Notizia = { titolo: string; link: string; data: string; fonte: string };

// Un articolo è sugli eventi se ha una di queste categorie su Libertas o se il titolo ne parla,
// a meno che non sia politica, cronaca o la rassegna stampa quotidiana.
const CATEGORIE_SI = new Set(["Spettacoli", "Cultura", "Musica", "Arte", "Eventi"]);
const CATEGORIE_NO = new Set(["Politica", "Cronaca", "Satira", "Rassegna stampa"]);
const TITOLI_NO = /rassegna stampa|commission[ei]|consiglio grande|congresso di stato/i;
const EVENTI = /\b(weekend|fine settimana|eventi|appuntament\w*|mostr[ae]|concert\w*|festival|sagr[ae]|spettacol\w*|teatro|rassegn[ae]|manifestazion\w*|fest[ae]|mercatin\w*|medieval\w*|natale|halloween|capodanno)\b/i;

const ENTITA: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

function decodifica(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, n) => ENTITA[n] ?? m)
    .trim();
}

const campo = (item: string, nome: string) => {
  const m = item.match(new RegExp(`<${nome}>([\\s\\S]*?)</${nome}>`));
  return m ? decodifica(m[1]) : "";
};

/** Ultimi articoli di Libertas che parlano di eventi. Si aggiorna ogni 3 ore; se il sito non risponde, lista vuota. */
export async function getNotizieEventi(limite = 5): Promise<Notizia[]> {
  try {
    const r = await fetch(FEED, {
      headers: { "User-Agent": "739SanMarino/1.0 (https://739-san-marino.vercel.app)", Accept: "application/rss+xml, application/xml" },
      next: { revalidate: 10_800 },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const xml = await r.text();
    // Il sito a volte risponde con una pagina di controllo anti-bot invece del feed
    if (!xml.includes("<rss")) throw new Error("risposta non RSS");
    const notizie: Notizia[] = [];
    for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const titolo = campo(item, "title");
      const link = campo(item, "link");
      const data = new Date(campo(item, "pubDate"));
      const categorie = [...item.matchAll(/<category>([\s\S]*?)<\/category>/g)].map((m) => decodifica(m[1]));
      if (!titolo || !link.startsWith("https://") || isNaN(data.getTime())) continue;
      if (categorie.some((c) => CATEGORIE_NO.has(c)) || TITOLI_NO.test(titolo)) continue;
      if (!categorie.some((c) => CATEGORIE_SI.has(c)) && !EVENTI.test(titolo)) continue;
      notizie.push({ titolo, link, data: data.toISOString(), fonte: "Libertas" });
      if (notizie.length >= limite) break;
    }
    return notizie;
  } catch (e) {
    console.error("stampa", e instanceof Error ? e.message : e);
    return [];
  }
}
