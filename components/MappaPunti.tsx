"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import { COLORI, STILE_CHIARO, STILE_SCURO } from "@/lib/mappa";

export type Punto = { id: string; nome: string; lat: number; lng: number; categoria: string; href: string };

/**
 * Mappa con più segnaposti (speciali): si inquadra da sola su tutti i punti, un tocco apre la scheda.
 * Con un dito la pagina scorre, la mappa si muove con due (cooperativeGestures).
 */
export default function MappaPunti({ punti, etichetta }: { punti: Punto[]; etichetta: string }) {
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const chiave = punti.map((p) => p.id).join(",");

  useEffect(() => {
    if (!punti.length) return;
    let annullato = false;
    let rimuovi: (() => void) | undefined;
    import("maplibre-gl").then((ml) => {
      if (annullato || !box.current) return;
      ml.setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
      const scuro = !window.matchMedia("(prefers-color-scheme: light)").matches;
      const m = new ml.Map({
        container: box.current,
        style: scuro ? STILE_SCURO : STILE_CHIARO,
        center: [punti[0].lng, punti[0].lat],
        zoom: 15,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      const confini = new ml.LngLatBounds();
      for (const p of punti) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "marcatore";
        el.title = p.nome;
        el.setAttribute("aria-label", p.nome);
        el.style.background = COLORI[p.categoria] ?? "#0B1F2E";
        el.addEventListener("click", () => router.push(p.href));
        new ml.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
        confini.extend([p.lng, p.lat]);
      }
      if (punti.length > 1) m.fitBounds(confini, { padding: 48, maxZoom: 16, duration: 0 });
      rimuovi = () => m.remove();
    });
    return () => {
      annullato = true;
      rimuovi?.();
    };
    // I punti cambiano solo se cambia l'elenco
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);

  if (!punti.length) return null;
  return <div ref={box} role="img" aria-label={etichetta} className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-superficie lg:aspect-[16/9]" />;
}
