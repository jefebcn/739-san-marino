"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { COLORI, STILE_CHIARO, STILE_SCURO } from "@/lib/mappa";

/**
 * Mappa piccola con un solo segnaposto, a lato della scheda su computer.
 * Sul telefono non si carica nemmeno: lì c'è il pulsante «Sulla mappa».
 */
export default function MappaPunto({ lat, lng, nome, categoria }: { lat: number; lng: number; nome: string; categoria: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    let annullato = false;
    let rimuovi: (() => void) | undefined;
    import("maplibre-gl").then((ml) => {
      if (annullato || !box.current) return;
      // Il worker è copiato in public/ da scripts/worker-mappa.mjs
      ml.setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
      const scuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const m = new ml.Map({
        container: box.current,
        style: scuro ? STILE_SCURO : STILE_CHIARO,
        center: [lng, lat],
        zoom: 15.5,
        // La rotella fa scorrere la pagina, non la mappa
        scrollZoom: false,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      const el = document.createElement("span");
      el.className = "marcatore";
      el.style.background = COLORI[categoria] ?? "#0B1F2E";
      new ml.Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
      rimuovi = () => m.remove();
    });
    return () => {
      annullato = true;
      rimuovi?.();
    };
  }, [lat, lng, categoria]);

  return <div ref={box} role="img" aria-label={`Mappa: ${nome}`} className="hidden aspect-square w-full overflow-hidden rounded-2xl bg-superficie lg:block" />;
}
