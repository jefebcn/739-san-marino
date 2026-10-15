"use client";

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Icona, type NomeIcona } from "./Icona";
import { coloreDi, iconaDi } from "@/lib/mappa";

// Segnaposto della mappa: un tondo col colore della categoria e l'icona del tipo di luogo in bianco.
// I marcatori di MapLibre sono elementi del DOM fuori da React: l'SVG di ogni icona si prepara una volta e si riusa.
const svg = new Map<NomeIcona, string>();

function svgDi(nome: NomeIcona) {
  let s = svg.get(nome);
  if (s) return s;
  const div = document.createElement("div");
  const radice = createRoot(div);
  flushSync(() => radice.render(<Icona nome={nome} size={16} piatta />));
  s = div.innerHTML;
  radice.unmount();
  svg.set(nome, s);
  return s;
}

/** Il marcatore per un luogo, da passare a `new Marker({ element })` */
export function elementoSegnaposto(tag: "button" | "span", l: { categoria: string; sottocategoria?: string | null }) {
  const el = document.createElement(tag);
  if (el instanceof HTMLButtonElement) el.type = "button";
  el.className = "marcatore";
  el.style.background = coloreDi(l.categoria);
  el.innerHTML = svgDi(iconaDi(l.categoria, l.sottocategoria));
  return el;
}

/** Lo stesso segnaposto, piccolo, per elenchi e filtri */
export function PuntoCategoria({ categoria, sottocategoria, grande = false }: { categoria: string; sottocategoria?: string | null; grande?: boolean }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full text-white ${grande ? "size-7" : "size-5"}`} style={{ background: coloreDi(categoria) }}>
      <Icona nome={iconaDi(categoria, sottocategoria)} size={grande ? 15 : 12} piatta />
    </span>
  );
}
