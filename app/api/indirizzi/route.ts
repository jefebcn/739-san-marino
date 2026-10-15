import { NextResponse } from "next/server";

// Ricerca di vie, piazze e località di San Marino con Photon (komoot), geocoder libero basato su OpenStreetMap.
// Passa dal nostro server: al servizio non arrivano né l'IP né altri dati di chi cerca, e la stessa ricerca
// resta in cache un giorno (sulla CDN di Vercel e nella cache di fetch), così l'istanza pubblica riceve poche richieste.
// Limiti dell'istanza pubblica: uso ragionevole, nessuna garanzia; se non risponde la mappa mostra solo i luoghi.
const PHOTON = "https://photon.komoot.io/api/";
const RIQUADRO = "12.40,43.89,12.52,43.995";

type Caratteristica = {
  geometry: { coordinates: [number, number] };
  properties: { osm_key?: string; name?: string; street?: string; housenumber?: string; district?: string; city?: string; countrycode?: string; type?: string; osm_value?: string };
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80) ?? "";
  if (q.length < 3) return NextResponse.json({ indirizzi: [] });
  try {
    const r = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&bbox=${RIQUADRO}&limit=10&layer=house&layer=street&layer=locality&layer=district&layer=city`, {
      headers: { "User-Agent": "739SanMarino/1.0 (https://739-san-marino.vercel.app)" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    if (!r.ok) throw new Error(`Photon ${r.status}`);
    const dati = (await r.json()) as { features?: Caratteristica[] };
    const visti = new Set<string>();
    const indirizzi = (dati.features ?? [])
      // Solo vie, civici e località: negozi e locali li cerca già la mappa tra i luoghi di 739
      .filter((f) => f.properties.countrycode === "SM" && ["highway", "place", "building", "boundary"].includes(f.properties.osm_key ?? ""))
      .map((f) => {
        const p = f.properties;
        const via = p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ""}` : null;
        const nome = p.name ?? via ?? p.district ?? p.city ?? "";
        const luogo = [p.name && via ? via : null, p.district && p.district !== nome ? p.district : null, p.city && p.city !== nome && p.city !== p.district ? p.city : null];
        return { nome, dettaglio: luogo.filter(Boolean).join(", "), lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
      })
      .filter((i) => i.nome && !visti.has(i.nome + i.dettaglio) && visti.add(i.nome + i.dettaglio))
      .slice(0, 6);
    return NextResponse.json({ indirizzi }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (e) {
    console.error("indirizzi", q, e instanceof Error ? e.message : e);
    // Photon lento o giù: nessun indirizzo, la ricerca dei luoghi continua a funzionare
    return NextResponse.json({ indirizzi: [], errore: true }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
