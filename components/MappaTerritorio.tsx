"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, GeolocateControl, Map as MLMap, Marker } from "maplibre-gl";
import { CATEGORIE, linkIndicazioni, type Luogo } from "@/lib/data";
import { Icona } from "./Icona";
import { AREE, areaDiCategoria, type SlugArea } from "@/lib/aree";
import { CENTRO, STILE_CHIARO, STILE_SCURO } from "@/lib/mappa";
import {
  allarga, cercaIndirizzi, cercaLuoghi, contiene, dentro, dettaglioLuogo, distanzaM, leggiDistanza, luoghiDelTerritorio, luoghiNelRiquadro,
  TERRITORIO, type Indirizzo, type PuntoMappa, type Riquadro,
} from "@/lib/mappa-dati";
import { chiaveSegnaposto, immagineSegnaposto, PuntoCategoria } from "./Segnaposto";
import { AREE_EN, CATEGORIA_SINGOLA_EN, CATEGORIE_EN, type Lingua } from "@/lib/lingua";
import { traduci } from "@/lib/traduci";

const T = {
  it: {
    mappa: "Mappa di San Marino", nonCarica: "La mappa non si carica. Controlla la connessione e riprova.", riprova: "Riprova", filtraArea: "Filtra per area",
    cerca: "Cerca un luogo o un indirizzo", cercaBreve: "Cerca", tutto: "Tutto", categorieDi: "Categorie di", abbassa: "Abbassa il pannello", alza: "Alza il pannello",
    territorio: "Mappa del territorio", caricamento: "Caricamento", verificare: "Posizione da verificare", indirizzo: "Indirizzo", orari: "Orari", tariffe: "Tariffe",
    posti: "posti", telefono: "Telefono", daVerificare: "da verificare", da: (d: string) => `A ${d} da te`, indicazioni: "Indicazioni", avvisi: "Tutti gli avvisi",
    scheda: "Apri la scheda", torna: "Torna a tutti i luoghi", vicino: "Vicino a me", vicinoTe: "Vicino a te", qui: "Qui sulla mappa",
    nonLuoghi: "Non riesco a caricare i luoghi. Controlla la connessione.", nessuno: (tipo: boolean) => `Nessun luogo ${tipo ? "di questo tipo " : ""}in quest'area.`,
    allarga: "Allarga la mappa", tanti: "Qui ci sono tanti luoghi: avvicina la mappa per vederli tutti.", vai: "Vai", altri: (n: number) => `Mostra altri ${n}`,
    luogo: "luogo", luoghi: "luoghi", cerco: "Cerco", nessunNome: "Nessun luogo e nessun indirizzo con questo nome.", indirizzi: "Indirizzi",
    cercoIndirizzi: "Cerco anche tra gli indirizzi…", photon: "Indirizzi da Photon, dati © OpenStreetMap contributors.",
  },
  en: {
    mappa: "Map of San Marino", nonCarica: "The map is not loading. Check your connection and try again.", riprova: "Try again", filtraArea: "Filter by area",
    cerca: "Search places or addresses", cercaBreve: "Search", tutto: "All", categorieDi: "Categories in", abbassa: "Lower the panel", alza: "Raise the panel",
    territorio: "Map of San Marino", caricamento: "Loading", verificare: "Location to be checked", indirizzo: "Address", orari: "Opening hours", tariffe: "Fares",
    posti: "spaces", telefono: "Phone", daVerificare: "to be checked", da: (d: string) => `${d} from you`, indicazioni: "Directions", avvisi: "All notices",
    scheda: "Open the page", torna: "Back to all places", vicino: "Near me", vicinoTe: "Near you", qui: "On the map",
    nonLuoghi: "Places are not loading. Check your connection.", nessuno: (tipo: boolean) => `No places ${tipo ? "of this kind " : ""}in this area.`,
    allarga: "Zoom out", tanti: "There are lots of places here: zoom in to see them all.", vai: "Go", altri: (n: number) => `Show ${n} more`,
    luogo: "place", luoghi: "places", cerco: "Searching", nessunNome: "No place or address with this name.", indirizzi: "Addresses",
    cercoIndirizzi: "Also searching addresses…", photon: "Addresses from Photon, data © OpenStreetMap contributors.",
  },
};

// La libreria della mappa (la parte più pesante) parte al primo disegno del componente, prima degli effetti;
// non quando Next prepara la pagina in anticipo (lì il file viene valutato ma il componente non si disegna)
let libreriaInCorso: Promise<typeof import("maplibre-gl")> | null = null;
const libreria = () => (libreriaInCorso ??= import("maplibre-gl"));

/** 0 = solo intestazione, 1 = metà schermo, 2 = quasi tutto lo schermo */
type Livello = 0 | 1 | 2;
type Punto = { lat: number; lng: number };

// Quanti luoghi si disegnano nell'elenco del pannello per volta (sulla mappa ci sono tutti, raggruppati)
const PASSO_ELENCO = 60;
// I gruppi di segnaposto: ottone pieno come i bottoni principali, numero scuro sopra
const GRUPPO = "#C9A45C";
const SU_GRUPPO = "#09090B";
const VUOTO: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

const aPunto = (l: Luogo): PuntoMappa => ({
  id: l.id, nome: l.nome, categoria: l.categoria, sottocategoria: l.sottocategoria ?? null,
  lat: l.lat, lng: l.lng, indirizzo: l.indirizzo, fonte: l.fonte ?? "manuale",
});

/**
 * La mappa del territorio. I luoghi arrivano dal database per l'area che si sta guardando (migrazione 0037),
 * si disegnano come layer GeoJSON raggruppati quando sono vicini (non centinaia di elementi del DOM) e
 * l'elenco del pannello mostra quelli dell'area, dal più vicino se si è dato il consenso alla posizione.
 */
export default function MappaTerritorio({ segnali, lingua = "it" }: { segnali: Luogo[]; lingua?: Lingua }) {
  const t = T[lingua];
  const en = lingua === "en";
  const nomeCategoria = (c: string) => (en ? CATEGORIE_EN[c] : CATEGORIE[c]) ?? c;
  // Un luogo solo: in inglese al singolare («Pharmacy»), in italiano come sempre
  const nomeDi = (c: string) => (en ? CATEGORIA_SINGOLA_EN[c] ?? nomeCategoria(c) : nomeCategoria(c));
  const nomeArea = (a: { slug: string; nome: string }) => (en ? AREE_EN[a.slug] ?? a.nome : a.nome);
  if (typeof window !== "undefined") libreria();
  const box = useRef<HTMLDivElement>(null);
  const foglio = useRef<HTMLDivElement>(null);
  const mappa = useRef<MLMap | null>(null);
  const geo = useRef<GeolocateControl | null>(null);
  const segnoIndirizzo = useRef<Marker | null>(null);
  const trascina = useRef<{ y: number; dy: number } | null>(null);
  // Tutti i luoghi arrivati finora e i riquadri già chiesti per intero
  const punti = useRef<Map<string, PuntoMappa>>(new Map());
  const coperti = useRef<Riquadro[]>([]);
  const richiesta = useRef<AbortController | null>(null);
  const inCorso = useRef<Riquadro | null>(null);
  const immagini = useRef<Set<string>>(new Set());
  const campoRicerca = useRef<HTMLInputElement>(null);

  const [versione, setVersione] = useState(0);
  const [pronta, setPronta] = useState(false);
  const [statoDati, setStatoDati] = useState<"carico" | "pronto" | "errore">("carico");
  const [troncato, setTroncato] = useState(false);
  const [erroreMappa, setErroreMappa] = useState(false);
  const [vista, setVista] = useState<Riquadro | null>(null);
  const [posizione, setPosizione] = useState<Punto | null>(null);
  // La ricerca usa la posizione del momento, ma non riparte quando la posizione si aggiorna
  const posizioneOra = useRef<Punto | null>(null);
  posizioneOra.current = posizione;
  const [filtro, setFiltro] = useState<string>("tutti");
  // Prima si sceglie l'area (Vivere, Uscire, Sport…), poi una categoria di quell'area
  const [areaFiltro, setAreaFiltro] = useState<SlugArea | "tutte">("tutte");
  const [scelto, setScelto] = useState<string | undefined>();
  const [dettaglio, setDettaglio] = useState<Luogo | null>(null);
  const [livelloFoglio, setLivelloFoglio] = useState<Livello>(0);
  // ?luogo=<id> (dal pulsante «Sulla mappa» della scheda): si legge nel browser, così la pagina resta statica e in cache
  const focus = useRef<string | null>(null);
  const [quanti, setQuanti] = useState(PASSO_ELENCO);
  // Ricerca
  const [testo, setTesto] = useState("");
  const [trovati, setTrovati] = useState<PuntoMappa[]>([]);
  const [indirizzi, setIndirizzi] = useState<Indirizzo[]>([]);
  const [cerco, setCerco] = useState(false);

  const tuttiPunti = useMemo(() => {
    void versione;
    return [...segnali.map(aPunto), ...punti.current.values()];
  }, [segnali, versione]);
  const tutteCategorie = useMemo(() => Array.from(new Set(tuttiPunti.map((l) => l.categoria))), [tuttiPunti]);
  const areeMappa = useMemo(() => AREE.filter((a) => tutteCategorie.some((c) => areaDiCategoria(c) === a.slug)), [tutteCategorie]);
  const categorie = useMemo(
    () => (areaFiltro === "tutte" ? [] : tutteCategorie.filter((c) => areaDiCategoria(c) === areaFiltro)),
    [tutteCategorie, areaFiltro],
  );
  const visibile = useCallback(
    (l: { categoria: string }) => (filtro !== "tutti" ? l.categoria === filtro : areaFiltro === "tutte" || areaDiCategoria(l.categoria) === areaFiltro),
    [filtro, areaFiltro],
  );
  const filtrati = useMemo(() => tuttiPunti.filter(visibile), [tuttiPunti, visibile]);
  // Nell'elenco: quelli dell'area visibile, dal più vicino se c'è la posizione
  const elenco = useMemo(() => {
    const qui = vista ? filtrati.filter((p) => dentro(vista, p)) : filtrati;
    if (!posizione) return qui;
    return qui.map((p) => ({ ...p, distanza_m: distanzaM(posizione, p) })).sort((a, b) => a.distanza_m - b.distanza_m);
  }, [filtrati, vista, posizione]);
  const puntoScelto = tuttiPunti.find((l) => l.id === scelto) ?? (dettaglio && dettaglio.id === scelto ? aPunto(dettaglio) : undefined);

  const caricaRiquadro = useCallback(async (r: Riquadro, territorio = false) => {
    richiesta.current?.abort();
    inCorso.current = r;
    const ac = new AbortController();
    richiesta.current = ac;
    setStatoDati("carico");
    try {
      const { punti: nuovi, completo } = territorio ? await luoghiDelTerritorio(ac.signal) : await luoghiNelRiquadro(r, ac.signal);
      if (ac.signal.aborted) return;
      for (const p of nuovi) punti.current.set(p.id, p);
      if (completo) coperti.current.push(r);
      setTroncato(!completo);
      setStatoDati("pronto");
      setVersione((x) => x + 1);
    } catch {
      if (!ac.signal.aborted) setStatoDati("errore");
    } finally {
      if (richiesta.current === ac) inCorso.current = null;
    }
  }, []);

  // I luoghi dell'area visibile: si chiede un riquadro un po' più largo, una volta sola, e si annulla la richiesta vecchia.
  // Fuori dal territorio non c'è niente: la vista si taglia ai suoi bordi prima di controllare se è già coperta.
  const caricaVista = useCallback(() => {
    const m = mappa.current;
    if (!m) return;
    const b = m.getBounds();
    const v: Riquadro = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    setVista(v);
    setQuanti(PASSO_ELENCO);
    const t: Riquadro = [Math.max(v[0], TERRITORIO[0]), Math.max(v[1], TERRITORIO[1]), Math.min(v[2], TERRITORIO[2]), Math.min(v[3], TERRITORIO[3])];
    if (t[0] >= t[2] || t[1] >= t[3]) return;
    if (coperti.current.some((c) => contiene(c, t))) return;
    // Sta già arrivando un riquadro che la contiene: si aspetta quello
    if (inCorso.current && contiene(inCorso.current, t)) return;
    caricaRiquadro(allarga(t));
  }, [caricaRiquadro]);

  // Subito, senza aspettare che la mappa sia pronta: il territorio intero (oggi poche centinaia di luoghi, ~50 KB).
  // Se un giorno i luoghi saranno più del limite, la risposta è incompleta e la mappa chiederà poi per aree.
  useEffect(() => {
    caricaRiquadro(TERRITORIO, true);
  }, [caricaRiquadro]);

  useEffect(() => {
    let annullato = false;
    let attesa: ReturnType<typeof setTimeout> | undefined;
    focus.current = new URLSearchParams(window.location.search).get("luogo");
    if (focus.current && /^[0-9a-f-]{36}$/.test(focus.current)) {
      setScelto(focus.current);
      setLivelloFoglio(1);
    } else focus.current = null;
    libreria().then((ml) => {
      if (annullato || !box.current) return;
      // Il worker è copiato in public/ da scripts/worker-mappa.mjs
      ml.setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
      const scuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const m = new ml.Map({
        container: box.current,
        style: scuro ? STILE_SCURO : STILE_CHIARO,
        center: CENTRO,
        zoom: focus.current ? 13 : 11.4,
        attributionControl: { compact: true },
      });
      // Il pannello copre parte della mappa: in basso sul telefono, a sinistra su computer
      const computer = window.matchMedia("(min-width: 1024px)").matches;
      m.setPadding(computer ? { top: 60, right: 0, left: 432, bottom: 0 } : { top: 50, right: 0, left: 0, bottom: Math.round(box.current.clientHeight * 0.45) });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      const g = new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false });
      g.on("geolocate", (e) => setPosizione({ lat: e.coords.latitude, lng: e.coords.longitude }));
      m.addControl(g, "top-right");
      geo.current = g;
      mappa.current = m;

      let caricata = false;
      m.on("error", () => {
        if (!caricata) setErroreMappa(true);
      });
      m.on("load", () => {
        caricata = true;
        m.addSource("luoghi", { type: "geojson", data: VUOTO, cluster: true, clusterRadius: 40, clusterMaxZoom: 16 });
        m.addLayer({
          id: "gruppi", type: "circle", source: "luoghi", filter: ["has", "point_count"],
          paint: { "circle-color": GRUPPO, "circle-radius": ["step", ["get", "point_count"], 16, 10, 19, 50, 24], "circle-stroke-width": 2, "circle-stroke-color": "#fff" },
        });
        m.addLayer({
          id: "gruppi-numero", type: "symbol", source: "luoghi", filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true },
          paint: { "text-color": SU_GRUPPO },
        });
        m.addLayer({
          id: "punti", type: "symbol", source: "luoghi", filter: ["!", ["has", "point_count"]],
          layout: { "icon-image": ["get", "icona"], "icon-allow-overlap": true, "icon-ignore-placement": true },
        });
        // Il luogo scelto sta sopra a tutto, anche quando gli altri sono raggruppati
        m.addSource("scelto", { type: "geojson", data: VUOTO });
        m.addLayer({
          id: "scelto-anello", type: "circle", source: "scelto",
          paint: { "circle-radius": 23, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": scuro ? "#D4B06A" : "#7A5C24" },
        });
        m.addLayer({
          id: "scelto-icona", type: "symbol", source: "scelto",
          layout: { "icon-image": ["get", "icona"], "icon-size": 1.35, "icon-allow-overlap": true, "icon-ignore-placement": true },
        });

        const tocca = (id: string) => {
          setScelto(id);
          setLivelloFoglio(1);
        };
        m.on("click", "punti", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "string") tocca(id);
        });
        m.on("click", "gruppi", async (e) => {
          const f = e.features?.[0];
          if (!f || f.geometry.type !== "Point") return;
          const zoom = await (m.getSource("luoghi") as GeoJSONSource).getClusterExpansionZoom(f.properties?.cluster_id);
          m.easeTo({ center: f.geometry.coordinates as [number, number], zoom: Math.min(zoom + 0.2, 17) });
        });
        for (const l of ["punti", "gruppi"]) {
          m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
        }
        setPronta(true);
        // Il primo caricamento è già partito: qui si segna solo l'area visibile per l'elenco
        const b = m.getBounds();
        setVista([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      });
      // Si chiede solo quando la mappa si ferma, e non a ogni scatto
      m.on("moveend", () => {
        clearTimeout(attesa);
        attesa = setTimeout(caricaVista, 250);
      });
    });
    return () => {
      annullato = true;
      clearTimeout(attesa);
      richiesta.current?.abort();
      segnoIndirizzo.current?.remove();
      mappa.current?.remove();
      mappa.current = null;
    };
  }, [caricaVista]);

  // Le immagini dei segnaposto si preparano una volta per tipo, prima di passare i dati alla mappa
  const assicuraImmagini = useCallback(async (lista: PuntoMappa[]) => {
    const m = mappa.current;
    if (!m) return;
    const scala = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
    const mancanti = new Map<string, PuntoMappa>();
    for (const p of lista) {
      const k = chiaveSegnaposto(p);
      if (!immagini.current.has(k)) mancanti.set(k, p);
    }
    await Promise.all(
      [...mancanti].map(async ([k, p]) => {
        immagini.current.add(k);
        try {
          const dati = await immagineSegnaposto(p, scala);
          if (!m.hasImage(k)) m.addImage(k, dati, { pixelRatio: scala });
        } catch {
          immagini.current.delete(k);
        }
      }),
    );
  }, []);

  // Dati e filtri sulla mappa
  useEffect(() => {
    const m = mappa.current;
    if (!pronta || !m) return;
    let annullato = false;
    assicuraImmagini(filtrati).then(() => {
      if (annullato) return;
      const dati: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: filtrati.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, icona: chiaveSegnaposto(p) } })),
      };
      (m.getSource("luoghi") as GeoJSONSource | undefined)?.setData(dati);
    });
    return () => {
      annullato = true;
    };
  }, [pronta, filtrati, assicuraImmagini]);

  // Il luogo scelto: segnaposto grande con l'anello, e tutti i dati per il pannello
  useEffect(() => {
    const m = mappa.current;
    if (pronta && m) {
      const p = puntoScelto;
      if (p) {
        assicuraImmagini([p]).then(() =>
          (m.getSource("scelto") as GeoJSONSource | undefined)?.setData({
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, icona: chiaveSegnaposto(p) } }],
          }),
        );
      } else {
        (m.getSource("scelto") as GeoJSONSource | undefined)?.setData(VUOTO);
      }
    }
  }, [pronta, puntoScelto, assicuraImmagini]);

  useEffect(() => {
    if (!scelto) return setDettaglio(null);
    const segnale = segnali.find((s) => s.id === scelto);
    if (segnale) return setDettaglio(segnale);
    let annullato = false;
    setDettaglio(null);
    dettaglioLuogo(scelto).then((l) => {
      if (annullato) return;
      setDettaglio(l);
      // Aperta con ?luogo=: si va lì senza animazione, una volta sola
      if (l && focus.current === l.id) {
        focus.current = null;
        const vai = () => mappa.current?.jumpTo({ center: [l.lng, l.lat], zoom: 15.5 });
        if (mappa.current) vai();
        else libreria().then(() => setTimeout(vai, 0));
      }
    });
    return () => {
      annullato = true;
    };
  }, [scelto, segnali]);

  // Ricerca: luoghi per nome e indirizzi, con attesa breve e richieste vecchie annullate
  useEffect(() => {
    const q = testo.trim();
    if (q.length < 2) {
      setTrovati([]);
      setIndirizzi([]);
      setCerco(false);
      return;
    }
    const ac = new AbortController();
    setCerco(true);
    // I luoghi di 739 arrivano subito; gli indirizzi (Photon, a volte lento) si aggiungono quando arrivano
    const t = setTimeout(() => {
      let mancano = 2;
      const fatto = () => {
        if (--mancano === 0 && !ac.signal.aborted) setCerco(false);
      };
      cercaLuoghi(q, posizioneOra.current, ac.signal)
        .then((l) => !ac.signal.aborted && setTrovati(l))
        .catch(() => !ac.signal.aborted && setTrovati([]))
        .finally(fatto);
      cercaIndirizzi(q, ac.signal)
        .then((i) => !ac.signal.aborted && setIndirizzi(i))
        .catch(() => !ac.signal.aborted && setIndirizzi([]))
        .finally(fatto);
    }, 300);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [testo]);

  const vaiA = (l: PuntoMappa) => {
    if (!punti.current.has(l.id) && !segnali.some((s) => s.id === l.id)) {
      punti.current.set(l.id, l);
      setVersione((x) => x + 1);
    }
    // Un luogo trovato con la ricerca deve vedersi anche se i filtri lo nascondevano
    if (!visibile(l)) {
      setAreaFiltro("tutte");
      setFiltro("tutti");
    }
    setTesto("");
    setScelto(l.id);
    setLivelloFoglio(1);
    mappa.current?.flyTo({ center: [l.lng, l.lat], zoom: Math.max(mappa.current.getZoom(), 16.5), speed: 1.4 });
  };

  const vaiAIndirizzo = async (i: Indirizzo) => {
    const m = mappa.current;
    if (!m) return;
    setTesto("");
    setScelto(undefined);
    setLivelloFoglio(1);
    const ml = await libreria();
    segnoIndirizzo.current?.remove();
    const el = document.createElement("span");
    el.className = "segno-indirizzo";
    el.setAttribute("aria-label", i.nome);
    segnoIndirizzo.current = new ml.Marker({ element: el, anchor: "bottom" }).setLngLat([i.lng, i.lat]).addTo(m);
    m.flyTo({ center: [i.lng, i.lat], zoom: 17, speed: 1.4 });
  };

  const vicinoAMe = () => {
    geo.current?.trigger();
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

  const conteggio = `${elenco.length}${troncato ? "+" : ""} ${elenco.length === 1 ? t.luogo : t.luoghi}`;
  const areaScelta = AREE.find((a) => a.slug === areaFiltro);
  const titolo = filtro !== "tutti" ? nomeCategoria(filtro) : areaScelta ? nomeArea(areaScelta) : posizione ? t.vicinoTe : t.qui;
  const inRicerca = testo.trim().length >= 2;

  return (
    <div className="mappa-piena">
      {/* Posizione in linea: il CSS di MapLibre (fuori dai layer di Tailwind) vincerebbe su globals.css e la mappa resterebbe alta 0 */}
      <div ref={box} className="mappa" role="region" aria-label={t.mappa} style={{ position: "absolute", inset: 0 }} />

      {erroreMappa ? (
        <div className="absolute inset-x-4 top-24 z-[5] mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-superficie p-5 text-center shadow-lg" role="alert">
          <p className="text-[15px]">{t.nonCarica}</p>
          <button type="button" className="pulsante" onClick={() => location.reload()}>{t.riprova}</button>
        </div>
      ) : null}

      {areeMappa.length > 1 ? (
        <div className="mappa-filtri flex flex-col gap-2">
          <div className="chips" role="group" aria-label={t.filtraArea} style={{ margin: 0, padding: "0 var(--gutter)" }}>
            <button type="button" className="chip lg:hidden" aria-label={t.cerca} onClick={() => { setScelto(undefined); setLivelloFoglio(2); setTimeout(() => campoRicerca.current?.focus(), 350); }}>
              <Icona nome="cerca" size={16} /> {t.cercaBreve}
            </button>
            <button type="button" className="chip" aria-pressed={areaFiltro === "tutte"} onClick={() => { setAreaFiltro("tutte"); setFiltro("tutti"); }}>{t.tutto}</button>
            {areeMappa.map((a) => (
              <button key={a.slug} type="button" className="chip" aria-pressed={areaFiltro === a.slug} onClick={() => { setAreaFiltro(a.slug); setFiltro("tutti"); }}>
                <Icona nome={a.icona} size={16} /> {nomeArea(a)}
              </button>
            ))}
          </div>
          {categorie.length > 1 ? (
            <div className="chips" role="group" aria-label={`${t.categorieDi} ${areaScelta ? nomeArea(areaScelta) : ""}`} style={{ margin: 0, padding: "0 var(--gutter)" }}>
              {categorie.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={filtro === c} onClick={() => setFiltro(filtro === c ? "tutti" : c)}>
                  <PuntoCategoria categoria={c} />
                  {nomeCategoria(c)}
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
          aria-label={livelloFoglio === 2 ? t.abbassa : t.alza}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              setLivelloFoglio((v) => (v === 2 ? 0 : ((v + 1) as Livello)));
            }
          }}
        >
          {puntoScelto ? (
            <>
              <span className="etichetta">{nomeDi(puntoScelto.categoria)}</span>
              <h2>{puntoScelto.nome}</h2>
            </>
          ) : (
            <>
              <span className="etichetta">{t.territorio}</span>
              <h2>{titolo} <span className="meta">{statoDati === "carico" && !elenco.length ? "…" : conteggio}</span></h2>
            </>
          )}
        </div>

        <div className="foglio-corpo">
          {puntoScelto ? (
            <>
              {!dettaglio ? (
                <div className="h-24 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label={t.caricamento} />
              ) : (
                <>
                  {dettaglio.da_verificare ? <span className="verifica" style={{ alignSelf: "flex-start" }}>{t.verificare}</span> : null}
                  {dettaglio.descrizione ? <p className="descrizione" lang="it">{en ? traduci(dettaglio.descrizione) : dettaglio.descrizione}</p> : null}
                  {dettaglio.indirizzo || dettaglio.orari || dettaglio.tariffa || dettaglio.telefono ? (
                    <div className="dati">
                      {dettaglio.indirizzo ? <div><Icona nome="pin" /><span><b>{t.indirizzo}</b><span className="meta">{dettaglio.indirizzo}</span></span></div> : null}
                      {dettaglio.orari ? <div><Icona nome="orologio" /><span><b>{t.orari}</b><span className="meta">{en ? traduci(dettaglio.orari) : dettaglio.orari}</span></span></div> : null}
                      {dettaglio.tariffa ? <div><Icona nome="parcheggio" /><span><b>{t.tariffe}{dettaglio.posti ? `, ${dettaglio.posti} ${t.posti}` : ""}</b><span className="meta">{en ? traduci(dettaglio.tariffa) : dettaglio.tariffa}</span></span></div> : null}
                      {dettaglio.telefono ? <div><Icona nome="telefono" /><span><b>{t.telefono}</b><a className="meta" href={`tel:${dettaglio.telefono.replace(/\s/g, "")}`}>{dettaglio.telefono}</a></span></div> : null}
                    </div>
                  ) : null}
                  {dettaglio.fonte === "overture" ? (
                    <p className="meta">
                      Dati ©{" "}
                      <a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>
                        Overture Maps Foundation
                      </a>
                      , {t.daVerificare}
                    </p>
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
                </>
              )}
              {posizione ? <p className="meta">{t.da(leggiDistanza(distanzaM(posizione, puntoScelto), lingua))}</p> : null}
              <div className="azioni due">
                <a className="bottone primario piccolo premibile" href={linkIndicazioni(puntoScelto.lat, puntoScelto.lng)} target="_blank" rel="noopener">
                  <Icona nome="indicazioni" size={18} /> {t.indicazioni}
                </a>
                <a className="bottone secondario piccolo premibile" href={puntoScelto.categoria === "avviso" ? `/vivere/avvisi#${puntoScelto.id}` : en ? `/en/places/${puntoScelto.id}` : `/luoghi/${puntoScelto.id}`}>
                  {puntoScelto.categoria === "avviso" ? t.avvisi : t.scheda}
                </a>
              </div>
              <button type="button" className="w-fit self-center py-2 text-sm font-medium text-testo-2" onClick={() => setScelto(undefined)}>
                {t.torna}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-linea bg-superficie px-3 focus-within:border-accento">
                  <span className="shrink-0 text-testo-2"><Icona nome="cerca" size={18} /></span>
                  <input
                    ref={campoRicerca}
                    type="search"
                    value={testo}
                    onChange={(e) => setTesto(e.target.value)}
                    onFocus={() => setLivelloFoglio(2)}
                    placeholder={t.cerca}
                    aria-label={t.cerca}
                    maxLength={80}
                    className="min-w-0 flex-1 bg-transparent text-base text-testo outline-none placeholder:text-testo-2/70 lg:text-[15px]"
                  />
                </label>
                {!inRicerca ? (
                  <button type="button" onClick={vicinoAMe} className={`flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium ${posizione ? "bg-accento-tenue text-accento" : "bg-superficie text-testo"}`}>
                    <Icona nome="indicazioni" size={16} /> {t.vicino}
                  </button>
                ) : null}
              </div>

              {inRicerca ? (
                <RisultatiRicerca lingua={lingua} cerco={cerco} trovati={trovati} indirizzi={indirizzi} posizione={posizione} onLuogo={vaiA} onIndirizzo={vaiAIndirizzo} />
              ) : statoDati === "errore" && !elenco.length ? (
                <div className="flex flex-col items-start gap-2 rounded-2xl bg-superficie p-4" role="alert">
                  <p className="text-[15px]">{t.nonLuoghi}</p>
                  <button type="button" className="pulsante" onClick={() => { coperti.current = []; caricaVista(); }}>{t.riprova}</button>
                </div>
              ) : statoDati === "carico" && !elenco.length ? (
                <div className="flex flex-col gap-2" aria-busy="true" aria-label={t.caricamento}>
                  {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-superficie" />)}
                </div>
              ) : elenco.length === 0 ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="vuoto">{t.nessuno(filtro !== "tutti" || areaFiltro !== "tutte")}</p>
                  <button type="button" className="text-sm font-medium text-accento" onClick={() => mappa.current?.easeTo({ zoom: Math.max(11.4, (mappa.current?.getZoom() ?? 13) - 2) })}>
                    {t.allarga}
                  </button>
                </div>
              ) : (
                <>
                  {troncato ? <p className="meta">{t.tanti}</p> : null}
                  {elenco.slice(0, quanti).map((l) => (
                    <div key={l.id} className="luogo premibile" onClick={() => vaiA(l)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); vaiA(l); } }}>
                      <PuntoCategoria categoria={l.categoria} sottocategoria={l.sottocategoria} grande />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3>{l.nome}</h3>
                        <div className="meta">
                          {nomeDi(l.categoria)}
                          {l.indirizzo ? `, ${l.indirizzo}` : ""}
                        </div>
                      </div>
                      {l.distanza_m != null ? <span className="shrink-0 font-mono text-[13px] font-medium text-testo-2">{leggiDistanza(l.distanza_m, lingua)}</span> : null}
                      <a className="vai" href={linkIndicazioni(l.lat, l.lng)} target="_blank" rel="noopener" onClick={(ev) => ev.stopPropagation()}>
                        {t.vai}
                      </a>
                    </div>
                  ))}
                  {elenco.length > quanti ? (
                    <button type="button" className="self-center py-2 text-sm font-medium text-accento" onClick={() => setQuanti((q) => q + PASSO_ELENCO)}>
                      {t.altri(Math.min(PASSO_ELENCO, elenco.length - quanti))}
                    </button>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RisultatiRicerca({
  lingua, cerco, trovati, indirizzi, posizione, onLuogo, onIndirizzo,
}: {
  lingua: Lingua; cerco: boolean; trovati: PuntoMappa[]; indirizzi: Indirizzo[]; posizione: Punto | null;
  onLuogo: (l: PuntoMappa) => void; onIndirizzo: (i: Indirizzo) => void;
}) {
  const t = T[lingua];
  const nomeCategoria = (c: string) => (lingua === "en" ? CATEGORIA_SINGOLA_EN[c] : CATEGORIE[c]) ?? c;
  if (cerco && !trovati.length && !indirizzi.length) {
    return <div className="h-16 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label={t.cerco} />;
  }
  if (!trovati.length && !indirizzi.length) return <p className="vuoto">{t.nessunNome}</p>;
  const cercoIndirizzi = cerco && !indirizzi.length;
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {trovati.length ? (
        <section className="flex flex-col gap-2" aria-label={t.luoghi}>
          <h3 className="text-[13px] font-medium text-testo-2 first-letter:uppercase">{t.luoghi}</h3>
          {trovati.map((l) => (
            <button key={l.id} type="button" className="luogo premibile" onClick={() => onLuogo(l)}>
              <PuntoCategoria categoria={l.categoria} sottocategoria={l.sottocategoria} grande />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="block truncate text-[15px] font-semibold">{l.nome}</span>
                <span className="meta block truncate">{nomeCategoria(l.categoria)}{l.indirizzo ? `, ${l.indirizzo}` : ""}</span>
              </span>
              {posizione ? <span className="shrink-0 font-mono text-[13px] font-medium text-testo-2">{leggiDistanza(l.distanza_m ?? distanzaM(posizione, l), lingua)}</span> : null}
            </button>
          ))}
        </section>
      ) : null}
      {cercoIndirizzi ? <p className="meta" aria-busy="true">{t.cercoIndirizzi}</p> : null}
      {indirizzi.length ? (
        <section className="flex flex-col gap-2" aria-label={t.indirizzi}>
          <h3 className="text-[13px] font-medium text-testo-2">{t.indirizzi}</h3>
          {indirizzi.map((i) => (
            <button key={`${i.lat},${i.lng},${i.nome}`} type="button" className="luogo premibile" onClick={() => onIndirizzo(i)}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-superficie-2 text-testo-2"><Icona nome="pin" size={15} piatta /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="block truncate text-[15px] font-semibold">{i.nome}</span>
                {i.dettaglio ? <span className="meta block truncate">{i.dettaglio}</span> : null}
              </span>
            </button>
          ))}
          <p className="meta">{t.photon}</p>
        </section>
      ) : null}
    </div>
  );
}
