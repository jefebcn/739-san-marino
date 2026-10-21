"use client";

import { puoGestire } from "../api";
import { ModuloAzienda, Persone } from "./DatiAzienda";
import { useAzienda } from "./Guscio";

/** Dati dell'azienda (titolare e amministrazione) e chi ci lavora */
export default function PaginaDatiAzienda() {
  const az = useAzienda();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-3" aria-labelledby="t-dati">
        <h2 id="t-dati" className="text-[19px] font-semibold tracking-tight">I dati in fattura</h2>
        {puoGestire(az.ruolo) ? <ModuloAzienda id={az.id} onSalvata={() => undefined} /> : <p className="text-[15px] text-testo-2">Li cambiano il titolare e l&apos;amministrazione.</p>}
      </section>
      <Persone azienda={az.id} ruolo={az.ruolo} />
    </div>
  );
}
