import { preconnect, preload } from "react-dom";
import MappaTerritorio from "@/components/MappaTerritorio";
import type { Luogo } from "@/lib/data";
import { getAvvisi } from "@/lib/avvisi";
import { alternati } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = { title: "Mappa · 739 San Marino", alternates: alternati("/mappa", "/en/map", "it") };

// Pagina statica, in cache sulla CDN: i luoghi non viaggiano nella pagina ma in /api/luoghi-mappa (anche quella in cache),
// che il browser comincia a scaricare subito grazie al preload; la connessione ai server delle mappe si apre in anticipo.
// Qui arrivano solo gli avvisi con una posizione; ?luogo= lo legge la mappa nel browser.
export default async function Mappa() {
  preload("/api/luoghi-mappa", { as: "fetch", crossOrigin: "anonymous" });
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });
  const avvisi = await getAvvisi();
  // Gli avvisi con una posizione compaiono sulla mappa come segnali (categoria «avviso», area Vivere)
  const segnali: Luogo[] = avvisi
    .filter((a) => a.lat != null || a.luogo)
    .map((a) => ({
      id: `avviso-${a.id}`,
      nome: a.titolo,
      categoria: "avviso",
      descrizione: a.testo,
      lat: a.lat ?? a.luogo!.lat,
      lng: a.lng ?? a.luogo!.lng,
      castello_id: a.castello_id,
      indirizzo: a.luogo?.nome ?? null,
      telefono: null,
      orari: null,
      tariffa: null,
      posti: null,
      da_verificare: false,
      orari_settimana: null,
      fonte: "avviso",
    }));

  return <MappaTerritorio segnali={segnali} />;
}
