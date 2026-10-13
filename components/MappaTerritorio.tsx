"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Luogo } from "@/lib/data";

const COLORI: Record<string, string> = {
  luogo: "#0B1F2E",
  trasporti: "#2C79AE",
  parcheggio: "#2C79AE",
  farmacia: "#E8573A",
  servizio: "#E8573A",
  impianto: "#2BA84A",
  locale: "#F3A712",
};

export default function MappaTerritorio({ luoghi }: { luoghi: Luogo[] }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mappa: import("maplibre-gl").Map | undefined;
    let annullato = false;

    import("maplibre-gl").then((maplibre) => {
      if (annullato || !box.current) return;
      mappa = new maplibre.Map({
        container: box.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [12.4578, 43.9424],
        zoom: 11.4,
        attributionControl: { compact: true },
      });
      mappa.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      for (const l of luoghi) {
        const el = document.createElement("div");
        el.style.cssText = `width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(11,31,46,.35);background:${COLORI[l.categoria] ?? "#0B1F2E"}`;
        const popup = new maplibre.Popup({ offset: 14 }).setText(l.nome);
        new maplibre.Marker({ element: el }).setLngLat([l.lng, l.lat]).setPopup(popup).addTo(mappa);
      }
    });

    return () => {
      annullato = true;
      mappa?.remove();
    };
  }, [luoghi]);

  return <div ref={box} className="mappa" role="region" aria-label="Mappa di San Marino" />;
}
