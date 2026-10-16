// Lettura dei feed RSS (Libertas, San Marino RTV): testo pulito dei campi di un <item>, senza dipendenze.

const ENTITA: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

export function decodifica(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, n) => ENTITA[n] ?? m)
    .replace(/<[^>]+>/g, "")
    .trim();
}

export const campo = (item: string, nome: string) => {
  const m = item.match(new RegExp(`<${nome}>([\\s\\S]*?)</${nome}>`));
  return m ? decodifica(m[1]) : "";
};

export const elementi = (xml: string) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

/** Il testo di un feed, con la cache di Next per `secondi`; errore se la risposta non è un feed RSS */
export async function leggiFeed(url: string, secondi: number) {
  const r = await fetch(url, {
    headers: { "User-Agent": "739SanMarino/1.0 (https://739-san-marino.vercel.app)", Accept: "application/rss+xml, application/xml" },
    next: { revalidate: secondi },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  // Alcuni siti a volte rispondono con una pagina di controllo anti-bot invece del feed
  if (!xml.includes("<rss")) throw new Error("risposta non RSS");
  return xml;
}
