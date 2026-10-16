// Notizie sugli eventi dal feed RSS di Libertas (robots.txt permette la lettura; si mostrano solo titolo,
// data e link all'articolo, come fa qualunque lettore di feed). Gli eventi veri e propri, con data e luogo,
// vanno inseriti a mano dopo averli letti: dal testo libero non si estraggono in modo affidabile.
import { campo, decodifica, elementi, leggiFeed } from "./rss";

const FEED = "https://www.libertas.sm/feed/";

export type Notizia = { titolo: string; link: string; data: string; fonte: string };

// Un articolo è sugli eventi se ha una di queste categorie su Libertas o se il titolo ne parla,
// a meno che non sia politica, cronaca o la rassegna stampa quotidiana.
const CATEGORIE_SI = new Set(["Spettacoli", "Cultura", "Musica", "Arte", "Eventi"]);
const CATEGORIE_NO = new Set(["Politica", "Cronaca", "Satira", "Rassegna stampa"]);
const TITOLI_NO = /rassegna stampa|commission[ei]|consiglio grande|congresso di stato/i;
const EVENTI = /\b(weekend|fine settimana|eventi|appuntament\w*|mostr[ae]|concert\w*|festival|sagr[ae]|spettacol\w*|teatro|rassegn[ae]|manifestazion\w*|fest[ae]|mercatin\w*|medieval\w*|natale|halloween|capodanno)\b/i;

/** Ultimi articoli di Libertas che parlano di eventi. Si aggiorna ogni 3 ore; se il sito non risponde, lista vuota. */
export async function getNotizieEventi(limite = 5): Promise<Notizia[]> {
  try {
    const xml = await leggiFeed(FEED, 10_800);
    const notizie: Notizia[] = [];
    for (const item of elementi(xml)) {
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
