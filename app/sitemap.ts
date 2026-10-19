import type { MetadataRoute } from "next";
import { AREE } from "@/lib/aree";
import { getClassifica, getEventi, getLuoghi } from "@/lib/data";
import { getContenuti } from "@/lib/contenuti";
import { PAGINE_EN } from "@/lib/lingua";
import { SENTIERI } from "@/modules/itinerari/sentieri";
import { getOfferteLavoro } from "@/modules/lavorare/offerte";

const SITO = "https://739-san-marino.vercel.app";

export const revalidate = 3600;

/** Mappa del sito per i motori di ricerca: pagine fisse (anche quelle inglesi), aree e sezioni, castelli, eventi, luoghi e contenuti. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [castelli, eventi, luoghi, contenuti, offerte] = await Promise.all([getClassifica(), getEventi(200), getLuoghi(), getContenuti({ limite: 200 }), getOfferteLavoro()]);
  const fisse = ["/", "/notizie", "/esplora", "/mappa", "/eventi", "/castelli", "/sport", "/sport/tornei", "/bollettino", "/rubriche", "/guida", "/cerca", "/attivita", "/privacy", "/termini", "/utili/farmacie", "/utili/trasporti", "/utili/rifiuti", "/utili/parcheggi", "/utili/meteo"];
  const sezioni = AREE.flatMap((a) => [a.href, ...a.sezioni.flatMap((s) => (s.href && !s.href.includes("#") ? [s.href] : []))]);
  const percorsi = [
    ...new Set([...fisse, ...sezioni, ...PAGINE_EN]),
    ...castelli.map((c) => `/castelli/${c.slug}`),
    ...eventi.map((e) => `/eventi/${e.id}`),
    ...eventi.map((e) => `/en/events/${e.id}`),
    ...luoghi.map((l) => `/luoghi/${l.id}`),
    ...luoghi.map((l) => `/en/places/${l.id}`),
    ...offerte.map((o) => `/lavorare/lavoro/${o.id}`),
    ...contenuti.map((c) => (c.tipo === "speciale" ? `/speciali/${c.slug}` : `/storie/${c.slug}`)),
    ...SENTIERI.map((s) => `/uscire/itinerari/${s.slug}`),
    ...SENTIERI.map((s) => `/en/trails/${s.slug}`),
  ];
  return percorsi.map((p) => ({ url: `${SITO}${p}` }));
}
