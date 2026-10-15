"use client";

import { Icona, type NomeIcona } from "./Icona";
import { TRACCIATI } from "./icone-tracciati";
import { coloreDi, iconaDi } from "@/lib/mappa";

// Segnaposto della mappa: un tondo col colore della categoria e l'icona del tipo di luogo in bianco.
// I marcatori di MapLibre sono fuori da React: l'SVG si scrive direttamente dai tracciati delle icone.
const svgDi = (nome: NomeIcona) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">${TRACCIATI[nome] ?? ""}</svg>`;

/** Il marcatore per un luogo, da passare a `new Marker({ element })` */
export function elementoSegnaposto(tag: "button" | "span", l: { categoria: string; sottocategoria?: string | null }) {
  const el = document.createElement(tag);
  if (el instanceof HTMLButtonElement) el.type = "button";
  el.className = "marcatore";
  el.style.background = coloreDi(l.categoria);
  el.innerHTML = svgDi(iconaDi(l.categoria, l.sottocategoria));
  return el;
}

/** Il nome dell'immagine del segnaposto nei layer della mappa: una per colore e icona */
export const chiaveSegnaposto = (l: { categoria: string; sottocategoria?: string | null }) => `seg-${l.categoria}-${iconaDi(l.categoria, l.sottocategoria)}`;

/**
 * Lo stesso segnaposto come immagine per i layer di MapLibre (la mappa grande ne disegna centinaia:
 * immagini sulla tela invece di elementi del DOM). Tondo da 30 px col bordo bianco e l'ombra, come `.marcatore`,
 * disegnato su un canvas; l'icona Phosphor bianca si carica come immagine a sé e si disegna al centro.
 */
export async function immagineSegnaposto(l: { categoria: string; sottocategoria?: string | null }, scala = 2): Promise<ImageData> {
  const icona = svgDi(iconaDi(l.categoria, l.sottocategoria))
    .replace(/currentColor/g, "#fff")
    .replace(/<svg([^>]*?)\s(width|height)="[^"]*"/g, "<svg$1")
    .replace(/<svg([^>]*?)\s(width|height)="[^"]*"/g, "<svg$1")
    .replace("<svg", `<svg width="${16 * scala}" height="${16 * scala}"`);
  const img = new Image(16 * scala, 16 * scala);
  await new Promise<void>((ok, ko) => {
    img.onload = () => ok();
    img.onerror = () => ko(new Error("icona"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icona)}`;
  });
  const lato = 34 * scala;
  const tela = document.createElement("canvas");
  tela.width = lato;
  tela.height = lato;
  const g = tela.getContext("2d")!;
  g.save();
  g.shadowColor = "rgba(11, 31, 46, 0.45)";
  g.shadowBlur = 5 * scala;
  g.shadowOffsetY = 1 * scala;
  g.beginPath();
  g.arc(lato / 2, lato / 2, 14 * scala, 0, Math.PI * 2);
  g.fillStyle = coloreDi(l.categoria);
  g.fill();
  g.restore();
  g.lineWidth = 2 * scala;
  g.strokeStyle = "#fff";
  g.stroke();
  g.drawImage(img, 9 * scala, 9 * scala, 16 * scala, 16 * scala);
  return g.getImageData(0, 0, lato, lato);
}

/** Lo stesso segnaposto, piccolo, per elenchi e filtri */
export function PuntoCategoria({ categoria, sottocategoria, grande = false }: { categoria: string; sottocategoria?: string | null; grande?: boolean }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full text-white ${grande ? "size-7" : "size-5"}`} style={{ background: coloreDi(categoria) }}>
      <Icona nome={iconaDi(categoria, sottocategoria)} size={grande ? 15 : 12} piatta />
    </span>
  );
}
