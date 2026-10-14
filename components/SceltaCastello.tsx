"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Castello } from "@/lib/data";
import { testoSu } from "@/lib/colore";
import { impostaCastello, useCastelloScelto } from "./Castello";
import { Icona } from "./Icona";

const fmt = new Intl.NumberFormat("it-IT");

/** Selettore del castello in alto a sinistra: mostra il tuo castello e apre la scelta dal basso. */
export default function SceltaCastello({ classifica }: { classifica: Castello[] }) {
  const slug = useCastelloScelto();
  const [pronto, setPronto] = useState(false);
  const [aperto, setAperto] = useState(false);
  useEffect(() => setPronto(true), []);

  useEffect(() => {
    if (!aperto) return;
    const chiudi = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    window.addEventListener("keydown", chiudi);
    return () => window.removeEventListener("keydown", chiudi);
  }, [aperto]);

  const pos = classifica.findIndex((c) => c.slug === slug);
  const c = classifica[pos];

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        aria-haspopup="dialog"
        className="flex min-w-0 items-center gap-2 rounded-xl py-1 pr-2 text-left transition-transform active:scale-[0.97]"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accento-tenue text-accento [&_svg]:size-5">
          <Icona nome="pin" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-testo-2">Il tuo castello</span>
          <span className="flex items-center gap-1 text-[15px] font-semibold">
            <span className={`truncate ${pronto ? "" : "opacity-0"}`}>{c ? c.nome : "Scegli"}</span>
            <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-testo-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </span>
        </span>
      </button>

      {aperto ? (
        <div role="dialog" aria-modal="true" aria-label="Scegli il tuo castello" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAperto(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full max-w-[var(--colonna)] flex-col gap-4 overflow-y-auto rounded-t-3xl border border-linea bg-fondo px-[var(--gutter)] pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]"
          >
            <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-linea" />
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Il tuo castello</h2>
              <Link href="/castelli" onClick={() => setAperto(false)} className="font-mono text-xs font-semibold uppercase tracking-wider text-accento">Classifica</Link>
            </div>
            <p className="text-sm text-testo-2">Dove vivi o quello che senti tuo: i tuoi metri e le tue vittorie contano per lui.</p>
            <ul className="flex flex-col gap-1.5">
              {classifica.map((x, i) => (
                <li key={x.id}>
                  <button
                    type="button"
                    aria-pressed={x.slug === slug}
                    onClick={() => {
                      impostaCastello(x.slug);
                      setAperto(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-linea bg-superficie px-3 py-2.5 text-left aria-pressed:border-accento aria-pressed:bg-accento-tenue"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold" style={{ background: x.colore, color: testoSu(x.colore) }}>{i + 1}°</span>
                    <span className="flex-1 text-[15px] font-medium">{x.nome}</span>
                    <span className="font-mono text-xs text-testo-2">{fmt.format(x.metri ?? 0)} m</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
