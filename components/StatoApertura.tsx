"use client";

import type { Luogo } from "@/lib/data";
import { apertura } from "@/lib/orario";
import { useAdesso } from "@/lib/useAdesso";

/** «Aperto adesso, chiude alle 19:30» dagli orari settimanali del luogo (stessa logica delle farmacie). */
export default function StatoApertura({ orari }: { orari: Luogo["orari_settimana"] }) {
  const ora = useAdesso();
  const a = ora ? apertura(orari, ora) : null;
  if (!a) return null;
  const testo = a.sempre
    ? "Sempre aperto"
    : a.aperta
      ? `Aperto adesso${a.chiude ? `, chiude alle ${a.chiude}` : ""}`
      : `Chiuso adesso${a.riapre ? `, riapre ${a.riapre}` : ""}`;
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${a.aperta ? "text-ok" : "text-testo-2"}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${a.aperta ? "bg-ok" : "bg-testo-2/60"}`} />
      {testo}
    </span>
  );
}
