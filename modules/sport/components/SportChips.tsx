"use client";

import type { Sport } from "../tipi";

/** Filtro per sport, a pillole scorrevoli. */
export default function SportChips({ sport, scelto, onScegli, conTutti = true }: { sport: Sport[]; scelto: string | null; onScegli: (id: string | null) => void; conTutti?: boolean }) {
  const voci: { id: string | null; nome: string }[] = [...(conTutti ? [{ id: null, nome: "Tutti" }] : []), ...sport];
  return (
    <div role="group" aria-label="Sport" className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-0.5 [scrollbar-width:none]">
      {voci.map((v) => (
        <button
          key={v.id ?? "tutti"}
          type="button"
          aria-pressed={scelto === v.id}
          onClick={() => onScegli(v.id)}
          className="h-9 shrink-0 rounded-xl border border-linea bg-superficie px-3.5 text-sm font-medium text-testo-2 transition-colors aria-pressed:border-transparent aria-pressed:bg-metallo aria-pressed:text-su-accento"
        >
          {v.nome}
        </button>
      ))}
    </div>
  );
}
