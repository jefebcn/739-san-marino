import { preconnect, preload } from "react-dom";
import MappaTerritorio from "@/components/MappaTerritorio";
import { metaEn } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = metaEn("Map of San Marino", "Car parks, museums, viewpoints, toilets, drinking fountains, restaurants and hotels of San Marino on one map.", "/mappa", "/en/map");

// Come /mappa: pagina statica, i luoghi arrivano da /api/luoghi-mappa. Gli avvisi sono in italiano e qui non compaiono.
export default function Map() {
  preload("/api/luoghi-mappa", { as: "fetch", crossOrigin: "anonymous" });
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });
  return <MappaTerritorio segnali={[]} lingua="en" />;
}
