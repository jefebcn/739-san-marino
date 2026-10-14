"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Castello } from "@/lib/data";
import { EmblemaCastello } from "./LogoCastello";
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
        aria-label={c ? `Il tuo castello: ${c.nome}. Cambia` : "Scegli il tuo castello"}
        className="flex h-10 min-w-0 items-center gap-2 rounded-xl bg-superficie pr-2.5 pl-3 text-sm font-medium transition-colors hover:bg-superficie-2 active:scale-[0.97]"
      >
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: c?.colore ?? "var(--testo-2)" }} />
        <span className={`truncate ${pronto ? "" : "opacity-0"}`}>{c ? c.nome : "Scegli il castello"}</span>
        <Icona nome="avanti" size={14} />
      </button>

      {aperto ? (
        <div role="dialog" aria-modal="true" aria-label="Scegli il tuo castello" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm lg:items-center lg:p-6" onClick={() => setAperto(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full max-w-[var(--colonna)] flex-col gap-4 overflow-y-auto rounded-t-3xl border border-linea bg-fondo px-[var(--gutter)] pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))] lg:max-w-[520px] lg:rounded-3xl lg:px-6 lg:pb-6"
          >
            <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-linea lg:hidden" />
            <div className="flex items-baseline justify-between">
              <h2 className="text-[19px] font-semibold tracking-tight">Il tuo castello</h2>
              <Link href="/castelli" onClick={() => setAperto(false)} className="text-sm font-medium text-testo-2 hover:text-testo">Classifica</Link>
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
                    className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-superficie px-3 py-2.5 text-left aria-pressed:border-accento"
                  >
                    <span className="w-5 shrink-0 text-center font-mono text-xs font-medium text-testo-2">{i + 1}</span>
                    <EmblemaCastello c={x} className="size-14" />
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
