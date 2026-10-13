"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { CATEGORIE, linkIndicazioni, type Luogo } from "@/lib/data";

const COLORI: Record<string, string> = {
  luogo: "#0B1F2E",
  trasporti: "#2C79AE",
  parcheggio: "#2C79AE",
  farmacia: "#E8573A",
  servizio: "#E8573A",
  impianto: "#2BA84A",
  locale: "#F3A712",
};

const CENTRO: [number, number] = [12.4578, 43.9424];

export default function MappaTerritorio({ luoghi, focus }: { luoghi: Luogo[]; focus?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const mappa = useRef<MLMap | null>(null);
  const marcatori = useRef<Map<string, Marker>>(new Map());
  const [filtro, setFiltro] = useState<string>("tutti");
  const [scelto, setScelto] = useState<string | undefined>(focus);

  const categorie = useMemo(() => Array.from(new Set(luoghi.map((l) => l.categoria))), [luoghi]);
  const visibili = useMemo(() => (filtro === "tutti" ? luoghi : luoghi.filter((l) => l.categoria === filtro)), [luoghi, filtro]);

  useEffect(() => {
    let annullato = false;
    import("maplibre-gl").then((ml) => {
      if (annullato || !box.current) return;
      const iniziale = luoghi.find((l) => l.id === focus);
      const m = new ml.Map({
        container: box.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: iniziale ? [iniziale.lng, iniziale.lat] : CENTRO,
        zoom: iniziale ? 15.5 : 11.4,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.addControl(new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
      mappa.current = m;

      for (const l of luoghi) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", l.nome);
        el.style.cssText = `width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 5px rgba(11,31,46,.4);background:${COLORI[l.categoria] ?? "#0B1F2E"};cursor:pointer;padding:0`;
        el.addEventListener("click", () => setScelto(l.id));
        const popup = new ml.Popup({ offset: 14, closeButton: false }).setText(l.nome);
        const mk = new ml.Marker({ element: el }).setLngLat([l.lng, l.lat]).setPopup(popup).addTo(m);
        marcatori.current.set(l.id, mk);
      }
      if (iniziale) marcatori.current.get(iniziale.id)?.togglePopup();
    });
    return () => {
      annullato = true;
      marcatori.current.clear();
      mappa.current?.remove();
      mappa.current = null;
    };
  }, [luoghi, focus]);

  useEffect(() => {
    for (const [id, mk] of marcatori.current) {
      const l = luoghi.find((x) => x.id === id);
      mk.getElement().style.display = !l || filtro === "tutti" || l.categoria === filtro ? "" : "none";
    }
  }, [filtro, luoghi]);

  const vaiA = (l: Luogo) => {
    setScelto(l.id);
    mappa.current?.flyTo({ center: [l.lng, l.lat], zoom: 15.5, speed: 1.4 });
    const mk = marcatori.current.get(l.id);
    if (mk && !mk.getPopup()?.isOpen()) mk.togglePopup();
  };

  return (
    <>
      <div ref={box} className="mappa" role="region" aria-label="Mappa di San Marino" />

      {categorie.length > 1 ? (
        <div className="chips" role="group" aria-label="Filtra per categoria">
          <button type="button" className="chip" aria-pressed={filtro === "tutti"} onClick={() => setFiltro("tutti")}>Tutti</button>
          {categorie.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={filtro === c} onClick={() => setFiltro(c)}>
              {CATEGORIE[c] ?? c}
            </button>
          ))}
        </div>
      ) : null}

      <div className="lista">
        {visibili.length === 0 ? (
          <p className="vuoto">Nessun luogo in questa categoria.</p>
        ) : (
          visibili.map((l) => (
            <div key={l.id} className="luogo premibile" aria-current={scelto === l.id ? "true" : undefined} onClick={() => vaiA(l)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); vaiA(l); } }}>
              <span className="punto" style={{ background: COLORI[l.categoria] ?? "#0B1F2E", flex: "none" }} />
              <div style={{ minWidth: 0 }}>
                <h3>{l.nome}</h3>
                <div className="meta">{CATEGORIE[l.categoria] ?? l.categoria}</div>
              </div>
              <a className="vai" href={linkIndicazioni(l.lat, l.lng)} target="_blank" rel="noopener" onClick={(ev) => ev.stopPropagation()}>
                Vai
              </a>
            </div>
          ))
        )}
      </div>
    </>
  );
}
