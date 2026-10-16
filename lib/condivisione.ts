import type { Metadata } from "next";

// Metadati per condividere una pagina (passo 1.7): titolo, descrizione e Open Graph completi.
// L'immagine arriva da sola dal file opengraph-image.tsx della pagina.

const SITO = "739 San Marino";

/** Accorcia una descrizione a ~160 caratteri senza tagliare le parole */
export function riassunto(testo: string | null | undefined, max = 160) {
  const t = (testo ?? "").replace(/[#*_>`[\]]/g, "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max - 1)).replace(/[,.;:]$/, "") + "…";
}

/** `inglese`: la stessa pagina in inglese (/en/…), per l'hreflang */
export function metadatiCondivisione({ titolo, descrizione, percorso, tipo = "website", inglese }: { titolo: string; descrizione?: string | null; percorso: string; tipo?: "website" | "article"; inglese?: string }): Metadata {
  const descr = riassunto(descrizione) || "Tutto San Marino, dalla vetta. Eventi, mappa, castelli e servizi utili in un'unica app.";
  return {
    title: `${titolo} · ${SITO}`,
    description: descr,
    alternates: inglese ? { canonical: percorso, languages: { it: percorso, en: inglese, "x-default": percorso } } : { canonical: percorso },
    openGraph: { title: titolo, description: descr, url: percorso, siteName: SITO, locale: "it_IT", type: tipo },
    twitter: { card: "summary_large_image", title: titolo, description: descr },
  };
}
