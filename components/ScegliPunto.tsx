"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MappaML, Marker } from "maplibre-gl";
import { Icona } from "./Icona";
import { CENTRO, STILE_CHIARO, STILE_SCURO } from "@/lib/mappa";
import { elementoSegnaposto } from "./Segnaposto";

type Punto = { lat: number; lng: number };
// Il territorio di San Marino, gli stessi limiti di proponi_attivita() nel database
const DENTRO = (p: Punto) => p.lat >= 43.89 && p.lat <= 43.995 && p.lng >= 12.4 && p.lng <= 12.52;

/**
 * Si tocca la mappa per segnare dov'è un luogo (o si usa la posizione del telefono).
 * Con un dito la pagina scorre, la mappa si muove con due (cooperativeGestures).
 */
export default function ScegliPunto({ valore, onCambia, categoria, sottocategoria }: { valore: Punto | null; onCambia: (p: Punto | null) => void; categoria: string; sottocategoria?: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const mappa = useRef<MappaML | null>(null);
  const segno = useRef<Marker | null>(null);
  const cambia = useRef(onCambia);
  cambia.current = onCambia;
  const [errore, setErrore] = useState<string | null>(null);
  const [cerco, setCerco] = useState(false);

  useEffect(() => {
    let annullato = false;
    import("maplibre-gl").then((ml) => {
      if (annullato || !box.current) return;
      ml.setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
      const scuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const m = new ml.Map({
        container: box.current,
        style: scuro ? STILE_SCURO : STILE_CHIARO,
        center: CENTRO,
        zoom: 12,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.on("click", (e) => {
        const p = { lat: +e.lngLat.lat.toFixed(6), lng: +e.lngLat.lng.toFixed(6) };
        if (!DENTRO(p)) return setErrore("Quel punto è fuori da San Marino.");
        setErrore(null);
        cambia.current(p);
      });
      mappa.current = m;
    });
    return () => {
      annullato = true;
      mappa.current?.remove();
      mappa.current = null;
    };
  }, []);

  // Il segnaposto segue il valore; cambia aspetto con la categoria scelta
  useEffect(() => {
    const m = mappa.current;
    segno.current?.remove();
    segno.current = null;
    if (!m || !valore) return;
    import("maplibre-gl").then((ml) => {
      if (mappa.current !== m) return;
      segno.current = new ml.Marker({ element: elementoSegnaposto("span", { categoria, sottocategoria }) }).setLngLat([valore.lng, valore.lat]).addTo(m);
    });
  }, [valore, categoria, sottocategoria]);

  const qui = () => {
    if (!navigator.geolocation) return setErrore("Questo telefono non dà la posizione: tocca la mappa.");
    setCerco(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCerco(false);
        const p = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
        if (!DENTRO(p)) return setErrore("Adesso non sei a San Marino: tocca la mappa dove si trova l'attività.");
        setErrore(null);
        cambia.current(p);
        mappa.current?.flyTo({ center: [p.lng, p.lat], zoom: 17 });
      },
      () => {
        setCerco(false);
        setErrore("Non riesco ad avere la posizione: tocca la mappa dove si trova l'attività.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div ref={box} role="application" aria-label="Mappa: tocca dove si trova l'attività" className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-superficie" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-testo-2">{valore ? "Punto segnato. Tocca di nuovo per spostarlo." : "Tocca la mappa dove si trova l'attività."}</span>
        <button type="button" onClick={qui} disabled={cerco} className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-accento hover:bg-superficie disabled:opacity-50">
          <Icona nome="indicazioni" size={16} /> {cerco ? "Cerco…" : "Sono qui adesso"}
        </button>
      </div>
      {errore ? <p role="alert" className="text-[13px] text-segnale">{errore}</p> : null}
    </div>
  );
}
