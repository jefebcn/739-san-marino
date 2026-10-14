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
      <section className="relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl bg-pannello p-5 text-zinc-50">
        <span className="grid size-12 place-items-center rounded-xl bg-white/[0.06] text-ottone-300 [&_svg]:size-6">{icona}</span>
        <span className="text-sm font-medium text-ottone-300">{modulo}, in arrivo</span>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-tight">{titolo}</h1>
        <p className="text-[15px] text-zinc-400">{descrizione}</p>
      </section>

      <ul className="flex flex-col divide-y divide-linea">
        {punti.map((p) => (
          <li key={p} className="px-1 py-3 text-[15px] text-testo">{p}</li>
        ))}
      </ul>

      <PrimaryButton href="/profile" variante="secondario" pieno>Avvisami all&apos;apertura</PrimaryButton>
    </div>
  );
}
