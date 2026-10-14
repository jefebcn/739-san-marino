import type { Luogo } from "./data";

// Luoghi da OpenStreetMap tramite Overpass API: gratis, licenza ODbL (va citato «© OpenStreetMap contributors»).
// Si aggiungono a quelli del database solo per le categorie che il database non copre:
// farmacie e parcheggi restano quelli raccolti dalle fonti ufficiali.
// Server Overpass pubblici: se il primo è occupato si prova il secondo
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
export const FONTE_OSM = "https://www.openstreetmap.org/copyright";

const QUERY = `[out:json][timeout:25];
area["ISO3166-1"="SM"][admin_level=2]->.sm;
(
  nwr["amenity"="toilets"](area.sm);
  nwr["amenity"="drinking_water"](area.sm);
  nwr["amenity"="charging_station"](area.sm);
  nwr["leisure"~"^(sports_centre|stadium|swimming_pool)$"](area.sm);
  nwr["leisure"="pitch"]["name"](area.sm);
  nwr["tourism"~"^(museum|gallery|attraction)$"]["name"](area.sm);
  nwr["historic"~"^(castle|fort|tower|city_gate|monument)$"]["name"](area.sm);
  nwr["tourism"="viewpoint"](area.sm);
  nwr["tourism"="information"]["information"="office"](area.sm);
);
out center tags;`;

type Elemento = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Categoria 739 e nome di riserva per un elemento OSM. */
function classifica(t: Record<string, string>): { categoria: string; nome: string } | null {
  if (t.amenity === "toilets") return { categoria: "bagni", nome: "Bagni pubblici" };
  if (t.amenity === "drinking_water") return { categoria: "acqua", nome: "Fontanella" };
  if (t.amenity === "charging_station") return { categoria: "ricarica", nome: "Ricarica auto elettriche" };
  if (t.leisure) return { categoria: "impianto", nome: t.leisure === "swimming_pool" ? "Piscina" : "Impianto sportivo" };
  if (t.tourism === "viewpoint") return { categoria: "panorama", nome: "Punto panoramico" };
  if (t.tourism === "information") return { categoria: "servizio", nome: "Ufficio informazioni turistiche" };
  if (t.tourism || t.historic) return { categoria: "cultura", nome: "Monumento" };
  return null;
}

const ORARI_OSM: [RegExp, string][] = [
  [/\bMo\b/g, "lun"], [/\bTu\b/g, "mar"], [/\bWe\b/g, "mer"], [/\bTh\b/g, "gio"], [/\bFr\b/g, "ven"], [/\bSa\b/g, "sab"], [/\bSu\b/g, "dom"],
  [/\bPH\b/g, "festivi"], [/\boff\b/g, "chiuso"], [/^24\/7$/, "Sempre aperto"],
];

/** Gli orari OSM («Mo-Fr 09:00-18:00») resi leggibili in italiano, senza interpretarli. */
function orari(s?: string) {
  if (!s) return null;
  return ORARI_OSM.reduce((t, [re, it]) => t.replace(re, it), s).replace(/;\s*/g, "; ");
}

function descrizione(t: Record<string, string>, categoria: string) {
  const parti: string[] = [];
  if (t.description) parti.push(t.description);
  if (categoria === "bagni") {
    if (t.fee === "yes") parti.push("A pagamento");
    if (t.fee === "no") parti.push("Gratuiti");
    if (t.wheelchair === "yes") parti.push("accessibili in sedia a rotelle");
    if (t.changing_table === "yes") parti.push("con fasciatoio");
  }
  if (categoria === "acqua" && t.drinking_water !== "no") parti.push("Acqua potabile");
  if (categoria === "ricarica") {
    if (t.operator) parti.push(`Gestore: ${t.operator}`);
    if (t.capacity) parti.push(`${t.capacity} posti di ricarica`);
  }
  if (categoria === "impianto" && t.sport) parti.push(t.sport.split(";").map((s) => s.replace(/_/g, " ")).join(", "));
  if (!parti.length) return null;
  const testo = parti.join(", ");
  return testo.charAt(0).toUpperCase() + testo.slice(1) + ".";
}

function indirizzo(t: Record<string, string>) {
  const via = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
  return [via, t["addr:city"]].filter(Boolean).join(", ") || null;
}

/** Distanza in metri tra due punti (abbastanza precisa per poche centinaia di metri). */
function distanza(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180)) * 111_320;
  const y = (b.lat - a.lat) * 110_540;
  return Math.hypot(x, y);
}

/**
 * Luoghi di San Marino presi da OpenStreetMap. Si aggiornano una volta al giorno;
 * se Overpass non risponde la mappa mostra solo i luoghi del database.
 * `esistenti` serve a non mostrare due volte un luogo già nel database (stessa categoria entro 60 m).
 */
export async function getLuoghiOsm(esistenti: Luogo[] = []): Promise<Luogo[]> {
  let elementi: Elemento[] | null = null;
  for (const server of OVERPASS) {
    try {
      const r = await fetch(`${server}?data=${encodeURIComponent(QUERY)}`, {
        headers: { "User-Agent": "739SanMarino/1.0 (https://739-san-marino.vercel.app)", Accept: "application/json" },
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(12_000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      elementi = ((await r.json()) as { elements: Elemento[] }).elements ?? [];
      break;
    } catch (e) {
      console.error("osm", server, e instanceof Error ? e.message : e);
    }
  }
  if (!elementi) return [];

  const luoghi: Luogo[] = [];
  for (const el of elementi) {
    const t = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const c = classifica(t);
    if (lat == null || lng == null || !c) continue;
    const punto = { lat, lng };
    const nome = t["name:it"] ?? t.name ?? c.nome;
    if (esistenti.some((l) => l.categoria === c.categoria && distanza(l, punto) < 60)) continue;
    // OSM a volte ha lo stesso luogo come punto e come edificio: si tiene il primo
    if (luoghi.some((l) => l.categoria === c.categoria && l.nome === nome && distanza(l, punto) < 60)) continue;
    luoghi.push({
      id: `osm-${el.type}-${el.id}`,
      nome,
      categoria: c.categoria,
      descrizione: descrizione(t, c.categoria),
      lat,
      lng,
      castello_id: null,
      indirizzo: indirizzo(t),
      telefono: t.phone ?? t["contact:phone"] ?? null,
      orari: orari(t.opening_hours),
      tariffa: null,
      posti: null,
      da_verificare: false,
      orari_settimana: null,
      fonte: "osm",
    });
  }
  return luoghi;
}
