import type { MetadataRoute } from "next";
import { AREE } from "@/lib/aree";
import { getClassifica, getEventi, getLuoghi } from "@/lib/data";
import { getContenuti } from "@/lib/contenuti";

const SITO = "https://739-san-marino.vercel.app";

export const revalidate = 3600;

/** Mappa del sito per i motori di ricerca: pagine fisse, aree e sezioni, castelli, eventi, luoghi e contenuti. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [castelli, eventi, luoghi, contenuti] = await Promise.all([getClassifica(), getEventi(200), getLuoghi(), getContenuti({ limite: 200 })]);
  const fisse = ["/", "/esplora", "/mappa", "/eventi", "/castelli", "/sport", "/sport/tornei", "/bollettino", "/rubriche", "/guida", "/cerca", "/privacy", "/termini", "/utili/farmacie", "/utili/trasporti", "/utili/rifiuti", "/utili/parcheggi", "/utili/meteo"];
  const sezioni = AREE.flatMap((a) => [a.href, ...a.sezioni.flatMap((s) => (s.href && !s.href.includes("#") ? [s.href] : []))]);
  const percorsi = [
    ...new Set([...fisse, ...sezioni]),
    ...castelli.map((c) => `/castelli/${c.slug}`),
    ...eventi.map((e) => `/eventi/${e.id}`),
    ...luoghi.map((l) => `/luoghi/${l.id}`),
    ...contenuti.map((c) => (c.tipo === "speciale" ? `/speciali/${c.slug}` : `/storie/${c.slug}`)),
  ];
  return percorsi.map((p) => ({ url: `${SITO}${p}` }));
}
