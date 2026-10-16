// Notizie di San Marino dai feed RSS ufficiali di San Marino RTV (https://www.sanmarinortv.sm/help/feed-rss;
// il robots.txt permette la lettura). Si mostrano titolo, sommario, ora e categoria come nel feed, con il link
// all'articolo su sanmarinortv.sm e la fonte sempre scritta. Niente immagini: il feed non le ha.
import { campo, elementi, leggiFeed } from "./rss";

const BASE = "https://www.sanmarinortv.sm";

/** Le categorie che riguardano San Marino (fuori Italia, Mondo, comunicati e pubbliredazionali) */
export const CATEGORIE_NOTIZIE = [
  { slug: "cronaca", nome: "Cronaca", feed: "/news/cronaca-c3.xml" },
  { slug: "attualita", nome: "Attualità", feed: "/news/attualita-c4.xml" },
  { slug: "politica", nome: "Politica", feed: "/news/politica-c2.xml" },
  { slug: "economia", nome: "Economia", feed: "/news/economia-c5.xml" },
  { slug: "cultura", nome: "Cultura", feed: "/news/cultura-c6.xml" },
  { slug: "sport", nome: "Sport", feed: "/sport/sport-sammarinese-c16.xml" },
] as const;

export type CategoriaNotizia = (typeof CATEGORIE_NOTIZIE)[number]["slug"];

export type NotiziaRTV = { titolo: string; sommario: string; link: string; data: string; categoria: CategoriaNotizia; nomeCategoria: string };

export const FONTE_NOTIZIE = { nome: "San Marino RTV", link: BASE };

/**
 * Le ultime notizie di tutte le categorie, dalla più recente, senza doppioni (un articolo può stare in due feed).
 * Ogni feed si aggiorna al massimo ogni 15 minuti; se uno non risponde si usano gli altri.
 */
export async function getNotizie(limite = 60): Promise<NotiziaRTV[]> {
  const feed = await Promise.all(
    CATEGORIE_NOTIZIE.map(async (c) => {
      try {
        const xml = await leggiFeed(BASE + c.feed, 900);
        return elementi(xml).flatMap((item): NotiziaRTV[] => {
          const titolo = campo(item, "title");
          const link = campo(item, "link");
          const data = new Date(campo(item, "pubDate"));
          if (!titolo || !link.startsWith(BASE + "/") || isNaN(data.getTime())) return [];
          return [{ titolo, sommario: campo(item, "description"), link, data: data.toISOString(), categoria: c.slug, nomeCategoria: c.nome }];
        });
      } catch (e) {
        console.error("notizie", c.slug, e instanceof Error ? e.message : e);
        return [];
      }
    }),
  );
  const visti = new Set<string>();
  return feed
    .flat()
    .sort((a, b) => b.data.localeCompare(a.data))
    .filter((n) => !visti.has(n.link) && visti.add(n.link))
    .slice(0, limite);
}
