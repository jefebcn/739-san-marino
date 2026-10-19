"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import { STILE_CHIARO } from "@/lib/mappa";

type Tracciato = { slug: string; numero: string | null; nome: string; linee: [number, number][][] };

const NERO = "#09090B";
// Margini dell'inquadratura: in basso c'è il riquadro dei crediti (due righe sul telefono), a destra lo zoom
const MARGINI = { top: 32, left: 32, right: 56, bottom: 72 };

/** Il cartello del sentiero: tondo nero col numero, come `.marcatore` */
function cartello(numero: string | null, fine = false) {
  const el = document.createElement("span");
  el.className = "marcatore";
  el.setAttribute("aria-hidden", "true");
  if (fine) {
    Object.assign(el.style, { width: "16px", height: "16px", background: "#fff", border: `3px solid ${NERO}` });
  } else {
    Object.assign(el.style, { background: NERO, font: "italic 800 13px/1 var(--logo)", width: numero && numero.length > 2 ? "36px" : "30px" });
    el.textContent = numero ?? "";
  }
  return el;
}

/**
 * La mappa dei sentieri. Con `sentiero` disegna quello solo, con la partenza (il numero) e l'arrivo;
 * senza, scarica tutti i tracciati (`/uscire/itinerari/sentieri.geojson`) e un tocco su una linea apre il sentiero (in `base`, italiana o inglese).
 * Come le altre mappe nelle pagine: si muove con due dita.
 */
export default function MappaSentieri({ sentiero, etichetta, base = "/uscire/itinerari" }: { sentiero?: Tracciato & { anello: boolean }; etichetta: string; base?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const chiave = sentiero?.slug ?? "tutti";

  useEffect(() => {
    let annullato = false;
    let rimuovi: (() => void) | undefined;
    const dati: Promise<GeoJSON.FeatureCollection> = sentiero
      ? Promise.resolve({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: { slug: sentiero.slug, numero: sentiero.numero }, geometry: { type: "MultiLineString", coordinates: sentiero.linee } }],
        })
      : fetch("/uscire/itinerari/sentieri.geojson").then((r) => r.json());

    Promise.all([import("maplibre-gl"), dati]).then(([ml, geo]) => {
      if (annullato || !box.current) return;
      ml.setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
      const tutti = geo.features.flatMap((f) => (f.geometry as GeoJSON.MultiLineString).coordinates.flat());
      const confini = new ml.LngLatBounds();
      for (const p of tutti) confini.extend(p as [number, number]);
      const m = new ml.Map({
        container: box.current,
        style: STILE_CHIARO,
        bounds: confini,
        fitBoundsOptions: { padding: MARGINI, maxZoom: 16 },
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.on("load", () => {
        // L'inquadratura si rifà quando il riquadro ha la sua altezza vera
        m.resize();
        m.fitBounds(confini, { padding: MARGINI, maxZoom: 16, duration: 0 });
        m.addSource("sentieri", { type: "geojson", data: geo });
        m.addLayer({ id: "sentieri-bordo", type: "line", source: "sentieri", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FFFFFF", "line-width": sentiero ? 8 : 6 } });
        m.addLayer({ id: "sentieri-linea", type: "line", source: "sentieri", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": NERO, "line-width": sentiero ? 4.5 : 3 } });
        if (!sentiero) {
          // I numeri lungo le linee, e una linea larga e invisibile per toccarle col dito
          m.addLayer({
            id: "sentieri-numero", type: "symbol", source: "sentieri", minzoom: 13,
            layout: { "symbol-placement": "line", "symbol-spacing": 220, "text-field": ["get", "numero"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-keep-upright": true },
            paint: { "text-color": NERO, "text-halo-color": "#FFFFFF", "text-halo-width": 2.5 },
          });
          m.addLayer({ id: "sentieri-tocco", type: "line", source: "sentieri", paint: { "line-color": NERO, "line-width": 18, "line-opacity": 0 } });
          m.on("click", "sentieri-tocco", (e) => {
            const slug = e.features?.[0]?.properties?.slug;
            if (slug) router.push(`${base}/${slug}`);
          });
          m.on("mouseenter", "sentieri-tocco", () => { m.getCanvas().style.cursor = "pointer"; });
          m.on("mouseleave", "sentieri-tocco", () => { m.getCanvas().style.cursor = ""; });
        }
      });
      if (sentiero) {
        const prima = sentiero.linee[0][0];
        const ultima = sentiero.linee.at(-1)!.at(-1)!;
        if (!sentiero.anello) new ml.Marker({ element: cartello(null, true) }).setLngLat(ultima).addTo(m);
        new ml.Marker({ element: cartello(sentiero.numero) }).setLngLat(prima).addTo(m);
      }
      rimuovi = () => m.remove();
    });
    return () => {
      annullato = true;
      rimuovi?.();
    };
    // Il sentiero cambia solo con la pagina
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);

  return <div ref={box} role="img" aria-label={etichetta} className={`w-full overflow-hidden rounded-2xl bg-superficie ${sentiero ? "aspect-[4/3] lg:aspect-[16/10]" : "aspect-square sm:aspect-[4/3]"}`} />;
}
