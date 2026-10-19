import { SENTIERI } from "@/modules/itinerari/sentieri";

// Tutti i tracciati per la mappa di Itinerari: un file statico, scaricato dal telefono solo quando la mappa si apre
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      type: "FeatureCollection",
      features: SENTIERI.map((s) => ({
        type: "Feature",
        properties: { slug: s.slug, numero: s.numero ?? "", nome: s.nome },
        geometry: { type: "MultiLineString", coordinates: s.linee },
      })),
    },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
