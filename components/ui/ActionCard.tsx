import Link from "next/link";
import type { ReactNode } from "react";

type Tono = "neutro" | "accento" | "allerta";

type Props = {
  titolo: ReactNode;
  descrizione?: ReactNode;
  /** Icona a sinistra, già dimensionata (es. <Icona nome="mappa" />) */
  icona?: ReactNode;
  /** In alto a destra: un badge, un numero, uno stato */
  extra?: ReactNode;
  /** Contenuto aggiuntivo sotto il testo */
  children?: ReactNode;
  href?: string;
  esterno?: boolean;
  tono?: Tono;
  /** Vetro smerigliato, per schede sopra mappe o immagini */
  vetro?: boolean;
  className?: string;
};

const TONI_ICONA: Record<Tono, string> = {
  neutro: "bg-superficie-2 text-testo",
  accento: "bg-accento-tenue text-accento",
  allerta: "bg-segnale/15 text-segnale",
};

function Freccia() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-testo-2 transition-transform duration-150 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** Scheda d'azione: icona, titolo, descrizione e (se è un link) freccia. Il mattone delle liste di 739. */
export default function ActionCard({ titolo, descrizione, icona, extra, children, href, esterno, tono = "accento", vetro, className = "" }: Props) {
  const fondo = vetro ? "bg-[var(--vetro)] backdrop-blur-xl backdrop-saturate-150" : "bg-superficie";
  const classi = `group flex items-center gap-3.5 rounded-2xl border border-linea p-4 text-left ${fondo} ${href ? "transition-transform duration-150 ease-out active:scale-[0.98]" : ""} ${className}`;

  const corpo = (
    <>
      {icona ? (
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-[22px] ${TONI_ICONA[tono]}`}>{icona}</span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-start justify-between gap-3">
          <span className="text-[15px] font-semibold leading-snug tracking-tight text-testo">{titolo}</span>
          {extra ? <span className="shrink-0">{extra}</span> : null}
        </span>
        {descrizione ? <span className="text-sm leading-snug text-testo-2">{descrizione}</span> : null}
        {children}
      </span>
      {href ? <Freccia /> : null}
    </>
  );

  if (!href) return <div className={classi}>{corpo}</div>;
  if (esterno) return <a href={href} target="_blank" rel="noopener" className={classi}>{corpo}</a>;
  return <Link href={href} className={classi}>{corpo}</Link>;
}
