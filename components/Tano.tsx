import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

// Tano, la mascotte di 739 (CLAUDE.md, «Tano, la mascotte»): pose scontornate in public/mascotte.
// Si usa nei momenti giusti, al massimo una volta per schermata, mai sopra dati o mappe.

export type Posa = "benvenuto" | "saluta" | "esulta" | "corre" | "scatto" | "fiero" | "indica" | "pollice" | "tranquillo" | "braccia-conserte";

const POSE: Record<Posa, { w: number; cosa: string }> = {
  benvenuto: { w: 834, cosa: "che dà il benvenuto" },
  saluta: { w: 745, cosa: "che saluta" },
  esulta: { w: 702, cosa: "che esulta" },
  corre: { w: 792, cosa: "che corre" },
  scatto: { w: 883, cosa: "che scatta" },
  fiero: { w: 718, cosa: "fiero" },
  indica: { w: 723, cosa: "che indica" },
  pollice: { w: 698, cosa: "con il pollice in su" },
  tranquillo: { w: 669, cosa: "tranquillo" },
  "braccia-conserte": { w: 702, cosa: "a braccia conserte" },
};

/** La posa per ogni livello dei metri: Valle saluta, Mura pollice, Torri fiero, Vetta esulta */
export const POSA_DI_LIVELLO: Record<string, Posa> = { Valle: "saluta", Mura: "pollice", Torri: "fiero", Vetta: "esulta" };

/** Tano in una posa. L'altezza la decide `className` (sul telefono al massimo un terzo dello schermo). */
export default function Tano({ posa, className = "h-36 w-auto", priority = false }: { posa: Posa; className?: string; priority?: boolean }) {
  const p = POSE[posa];
  return (
    <Image
      src={`/mascotte/tano-${posa}.webp`}
      width={p.w}
      height={1200}
      alt={`Tano, la mascotte di 739, ${p.cosa}`}
      sizes="160px"
      priority={priority}
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}

/**
 * Una pagina o una sezione vuota: Tano indica e una frase porta all'azione
 * («Oggi non ci sono partite: organizzane una»). `className` serve, per esempio, a nasconderlo per i nuovi.
 */
export function Vuoto({ titolo, testo, azione, className = "" }: { titolo: string; testo?: ReactNode; azione?: { href: string; testo: string }; className?: string }) {
  return (
    <section className={`grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 overflow-hidden rounded-2xl bg-superficie pt-5 pl-5 pr-3 ${className}`}>
      <div className="flex flex-col gap-1.5 pb-5">
        <h2 className="text-[17px] font-semibold leading-snug [text-wrap:balance]">{titolo}</h2>
        {testo ? <p className="text-sm leading-relaxed text-testo-2">{testo}</p> : null}
        {azione ? (
          <Link href={azione.href} className="mt-2 inline-flex h-10 w-fit items-center rounded-xl bg-metallo px-4 text-sm font-semibold text-su-accento transition-transform active:scale-[0.97]">
            {azione.testo}
          </Link>
        ) : null}
      </div>
      <Tano posa="indica" className="-mb-1 h-32 w-auto lg:h-36" />
    </section>
  );
}
