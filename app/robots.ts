import type { MetadataRoute } from "next";

const SITO = "https://739-san-marino.vercel.app";

// Pannelli, API, vetrina del design e pagina senza rete restano fuori dai motori di ricerca
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/design", "/offline"] },
    sitemap: `${SITO}/sitemap.xml`,
  };
}
