import { SENTIERI, sentiero, titolo } from "@/modules/itinerari/sentieri";

// La traccia GPX 1.1 del sentiero, per le app di escursionismo e i navigatori: un segmento per ogni tratto
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SENTIERI.map((s) => ({ slug: s.slug }));
}

const xml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const s = sentiero((await params).slug);
  if (!s) return new Response("Sentiero non trovato", { status: 404 });
  const nome = xml(titolo(s));
  const segmenti = s.linee
    .map((linea) => `    <trkseg>\n${linea.map(([lng, lat]) => `      <trkpt lat="${lat}" lon="${lng}"/>`).join("\n")}\n    </trkseg>`)
    .join("\n");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="739 San Marino" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${nome}</name>
    <copyright author="OpenStreetMap contributors"><license>https://opendatacommons.org/licenses/odbl/</license></copyright>
    <link href="https://www.openstreetmap.org/relation/${s.id}"><text>OpenStreetMap</text></link>
  </metadata>
  <wpt lat="${s.inizio[1]}" lon="${s.inizio[0]}"><name>Partenza${s.da ? `: ${xml(s.da)}` : ""}</name></wpt>
  <trk>
    <name>${nome}</name>
${segmenti}
  </trk>
</gpx>
`;
  return new Response(gpx, {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="739-sentiero-${s.slug}.gpx"`,
    },
  });
}
