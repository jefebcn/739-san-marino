import type { ReactNode } from "react";
import PrimaryButton from "./PrimaryButton";

type Props = {
  modulo: string;
  titolo: string;
  descrizione: string;
  icona: ReactNode;
  /** Cosa arriverà, in breve */
  punti: string[];
};

/** Schermata "in arrivo" per i moduli non ancora sviluppati. */
export default function ComingSoon({ modulo, titolo, descrizione, icona, punti }: Props) {
  return (
    <div className="flex flex-col gap-7">
      <section className="relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl border border-linea bg-pannello p-6 text-zinc-50">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(201,164,92,0.22),transparent_55%)]" />
        <span className="grid size-12 place-items-center rounded-2xl bg-metallo text-su-accento shadow-lucido [&_svg]:size-6">{icona}</span>
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ottone-300">{modulo} · in arrivo</span>
        <h1 className="text-[32px] font-bold leading-[1.02] tracking-tight">{titolo}</h1>
        <p className="text-[15px] text-zinc-400">{descrizione}</p>
      </section>

      <ul className="flex flex-col gap-2">
        {punti.map((p) => (
          <li key={p} className="flex items-start gap-3 rounded-2xl border border-linea bg-superficie px-4 py-3 text-[15px]">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accento" />
            {p}
          </li>
        ))}
      </ul>

      <PrimaryButton href="/profile" variante="secondario" pieno>Crea il tuo SMR ID per non perderti l&apos;apertura</PrimaryButton>
    </div>
  );
}
