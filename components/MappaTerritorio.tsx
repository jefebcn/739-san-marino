"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { CATEGORIE, linkIndicazioni, type Luogo } from "@/lib/data";
import { Icona } from "./Icona";
import { AREE, areaDiCategoria, type SlugArea } from "@/lib/aree";
import { CENTRO, COLORI, STILE_CHIARO, STILE_SCURO } from "@/lib/mappa";




/** 0 = solo intestazione, 1 = metà schermo, 2 = quasi tutto lo schermo */
type Livello = 0 | 1 | 2;

export default function MappaTerritorio({ luoghi, focus }: { luoghi: Luogo[]; focus?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const foglio = useRef<HTMLDivElement>(null);
  const mappa = useRef<MLMap | null>(null);
  const marcatori = useRef<Map<string, Marker>>(new Map());
  const trascina = useRef<{ y: number; dy: number } | null>(null);
  const [filtro, setFiltro] = useState<string>("tutti");
  // Prima si sceglie l'area (Vivere, Uscire, Sport), poi una categoria di quell'area
  const [areaFiltro, setAreaFiltro] = useState<SlugArea | "tutte">("tutte");
  const [scelto, setScelto] = useState<string | undefined>(focus);
  const [livelloFoglio, setLivelloFoglio] = useState<Livello>(focus ? 1 : 0);

  const tutteCategorie = useMemo(() => Array.from(new Set(luoghi.map((l) => l.categoria))), [luoghi]);
  const areeMappa = useMemo(() => AREE.filter((a) => tutteCategorie.some((c) => areaDiCategoria(c) === a.slug)), [tutteCategorie]);
  const categorie = useMemo(
    () => (areaFiltro === "tutte" ? [] : tutteCategorie.filter((c) => areaDiCategoria(c) === areaFiltro)),
    [tutteCategorie, areaFiltro],
  );
  const visibile = useCallback(
    (l: Luogo) => (filtro !== "tutti" ? l.categoria === filtro : areaFiltro === "tutte" || areaDiCategoria(l.categoria) === areaFiltro),
    [filtro, areaFiltro],
  );
  const visibili = useMemo(() => luoghi.filter(visibile), [luoghi, visibile]);
  const dettaglio = luoghi.find((l) => l.id === scelto);

  useEffect(() => {
    let annullato = false;
    import("maplibre-gl").then((ml) => {
      if (annullato || !box.current) return;
      // Il worker è copiato in public/ da scripts/worker-mappa.mjs
      ml.setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
      const scuro = !window.matchMedia("(prefers-color-scheme: light)").matches;
      const iniziale = luoghi.find((l) => l.id === focus);
      const m = new ml.Map({
        container: box.current,
        style: scuro ? STILE_SCURO : STILE_CHIARO,
        center: iniziale ? [iniziale.lng, iniziale.lat] : CENTRO,
        zoom: iniziale ? 15.5 : 11.4,
        attributionControl: { compact: true },
      });
      // Il pannello copre parte della mappa: in basso sul telefono, a sinistra su computer
      const computer = window.matchMedia("(min-width: 1024px)").matches;
      m.setPadding(computer ? { top: 60, right: 0, left: 432, bottom: 0 } : { top: 50, right: 0, left: 0, bottom: Math.round(box.current.clientHeight * 0.45) });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.addControl(new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
      mappa.current = m;

      for (const l of luoghi) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "marcatore";
        el.setAttribute("aria-label", l.nome);
        el.style.background = COLORI[l.categoria] ?? "#0B1F2E";
        el.addEventListener("click", () => {
          setScelto(l.id);
          setLivelloFoglio(1);
        });
        const mk = new ml.Marker({ element: el }).setLngLat([l.lng, l.lat]).addTo(m);
        marcatori.current.set(l.id, mk);
      }
    });
    return () => {
      annullato = true;
      marcatori.current.clear();
      mappa.current?.remove();
      mappa.current = null;
    };
  }, [luoghi, focus]);

  // Filtri e marcatore scelto
  useEffect(() => {
    for (const [id, mk] of marcatori.current) {
      const l = luoghi.find((x) => x.id === id);
      const el = mk.getElement();
      el.style.display = !l || visibile(l) ? "" : "none";
      el.setAttribute("aria-current", id === scelto ? "true" : "false");
    }
  }, [visibile, luoghi, scelto]);

  const vaiA = (l: Luogo) => {
    setScelto(l.id);
    setLivelloFoglio(1);
    mappa.current?.flyTo({ center: [l.lng, l.lat], zoom: 15.5, speed: 1.4 });
  };

  // Trascinamento del pannello: si ferma su uno dei tre livelli
  const inizio = (e: React.PointerEvent) => {
    trascina.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    foglio.current?.classList.add("trascina");
  };
  const muovi = (e: React.PointerEvent) => {
    const t = trascina.current;
    const f = foglio.current;
    if (!t || !f) return;
    t.dy = e.clientY - t.y;
    // Al livello più alto non si sale oltre il bordo
    f.style.translate = `0 ${livelloFoglio === 2 ? Math.max(0, t.dy) : t.dy}px`;
  };
  const fine = () => {
    const t = trascina.current;
    trascina.current = null;
    const f = foglio.current;
    if (f) {
      f.classList.remove("trascina");
      f.style.translate = "";
    }
    if (!t) return;
    if (Math.abs(t.dy) < 8) {
      setLivelloFoglio((v) => (v === 0 ? 1 : v === 1 ? 2 : 0));
    } else if (t.dy < -40) {
      setLivelloFoglio((v) => (Math.min(2, v + (t.dy < -220 ? 2 : 1)) as Livello));
    } else if (t.dy > 40) {
      setLivelloFoglio((v) => (Math.max(0, v - (t.dy > 220 ? 2 : 1)) as Livello));
    }
  };

  const conteggio = `${visibili.length} ${visibili.length === 1 ? "luogo" : "luoghi"}`;

  return (
    <div className="mappa-piena">
      {/* Posizione in linea: il CSS di MapLibre (fuori dai layer di Tailwind) vincerebbe su globals.css e la mappa resterebbe alta 0 */}
      <div ref={box} className="mappa" role="region" aria-label="Mappa di San Marino" style={{ position: "absolute", inset: 0 }} />

      {areeMappa.length > 1 ? (
        <div className="mappa-filtri flex flex-col gap-2">
          <div className="chips" role="group" aria-label="Filtra per area" style={{ margin: 0, padding: "0 var(--gutter)" }}>
            <button type="button" className="chip" aria-pressed={areaFiltro === "tutte"} onClick={() => { setAreaFiltro("tutte"); setFiltro("tutti"); }}>Tutto</button>
            {areeMappa.map((a) => (
              <button key={a.slug} type="button" className="chip" aria-pressed={areaFiltro === a.slug} onClick={() => { setAreaFiltro(a.slug); setFiltro("tutti"); }}>
                <Icona nome={a.icona} size={16} /> {a.nome}
              </button>
            ))}
          </div>
          {categorie.length > 1 ? (
            <div className="chips" role="group" aria-label={`Categorie di ${areeMappa.find((a) => a.slug === areaFiltro)?.nome ?? ""}`} style={{ margin: 0, padding: "0 var(--gutter)" }}>
              {categorie.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={filtro === c} onClick={() => setFiltro(filtro === c ? "tutti" : c)}>
                  <span className="punto" style={{ background: COLORI[c] ?? "#0B1F2E", width: 10, height: 10, borderRadius: 3 }} />
                  {CATEGORIE[c] ?? c}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div ref={foglio} className="foglio" data-livello={livelloFoglio}>
        <div
          className="foglio-testa"
          onPointerDown={inizio}
          onPointerMove={muovi}
          onPointerUp={fine}
          onPointerCancel={fine}
          role="button"
          tabIndex={0}
          aria-label={livelloFoglio === 2 ? "Abbassa il pannello" : "Alza il pannello"}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              setLivelloFoglio((v) => (v === 2 ? 0 : ((v + 1) as Livello)));
            }
          }}
        >
          {dettaglio ? (
            <>
              <span className="etichetta">{CATEGORIE[dettaglio.categoria] ?? dettaglio.categoria}</span>
              <h2>{dettaglio.nome}</h2>
            </>
          ) : (
            <>
              <span className="etichetta">Mappa del territorio</span>
              <h2>{filtro !== "tutti" ? CATEGORIE[filtro] ?? filtro : areaFiltro !== "tutte" ? AREE.find((a) => a.slug === areaFiltro)?.nome : "Tutto quello che c'è"} <span className="meta">{conteggio}</span></h2>
            </>
          )}
        </div>

        <div className="foglio-corpo">
          {dettaglio ? (
            <>
              {dettaglio.da_verificare ? <span className="verifica" style={{ alignSelf: "flex-start" }}>Posizione da verificare</span> : null}
              {dettaglio.descrizione ? <p className="descrizione">{dettaglio.descrizione}</p> : null}
              {dettaglio.indirizzo || dettaglio.orari || dettaglio.tariffa || dettaglio.telefono ? (
                <div className="dati">
                  {dettaglio.indirizzo ? <div><Icona nome="pin" /><span><b>Indirizzo</b><span className="meta">{dettaglio.indirizzo}</span></span></div> : null}
                  {dettaglio.orari ? <div><Icona nome="orologio" /><span><b>Orari</b><span className="meta">{dettaglio.orari}</span></span></div> : null}
                  {dettaglio.tariffa ? <div><Icona nome="parcheggio" /><span><b>Tariffe{dettaglio.posti ? `, ${dettaglio.posti} posti` : ""}</b><span className="meta">{dettaglio.tariffa}</span></span></div> : null}
                  {dettaglio.telefono ? <div><Icona nome="telefono" /><span><b>Telefono</b><a className="meta" href={`tel:${dettaglio.telefono.replace(/\s/g, "")}`}>{dettaglio.telefono}</a></span></div> : null}
                </div>
              ) : null}
              {dettaglio.fonte === "osm" ? (
                <p className="meta">
                  Dati ©{" "}
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>
                    OpenStreetMap
                  </a>{" "}
                  contributors
                </p>
              ) : null}
              <div className="azioni due">
                <a className="bottone primario piccolo premibile" href={linkIndicazioni(dettaglio.lat, dettaglio.lng)} target="_blank" rel="noopener">
                  <Icona nome="indicazioni" size={18} /> Indicazioni
                </a>
                <a className="bottone secondario piccolo premibile" href={dettaglio.categoria === "avviso" ? `/vivere/avvisi#${dettaglio.id}` : `/luoghi/${dettaglio.id}`}>
                  {dettaglio.categoria === "avviso" ? "Tutti gli avvisi" : "Apri la scheda"}
                </a>
              </div>
              <button type="button" className="w-fit self-center py-2 text-sm font-medium text-testo-2" onClick={() => setScelto(undefined)}>
                Torna a tutti i luoghi
              </button>
            </>
          ) : visibili.length === 0 ? (
            <p className="vuoto">Nessun luogo in questa categoria.</p>
          ) : (
            visibili.map((l) => (
              <div key={l.id} className="luogo premibile" onClick={() => vaiA(l)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); vaiA(l); } }}>
                <span className="punto" style={{ background: COLORI[l.categoria] ?? "#0B1F2E" }} />
                <div style={{ minWidth: 0 }}>
                  <h3>{l.nome}</h3>
                  <div className="meta">{CATEGORIE[l.categoria] ?? l.categoria}{l.indirizzo ? `, ${l.indirizzo}` : ""}</div>
                </div>
                <a className="vai" href={linkIndicazioni(l.lat, l.lng)} target="_blank" rel="noopener" onClick={(ev) => ev.stopPropagation()}>
                  Vai
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
