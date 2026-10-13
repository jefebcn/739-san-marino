"use client";

import type { Castello } from "@/lib/data";
import { useSport } from "../store";
import type { Sport } from "../tipi";
import Classifiche from "./Classifiche";
import ListaPartite from "./ListaPartite";
import SportChips from "./SportChips";

/** Pagina principale del modulo Sport: partite (matchmaking) e classifiche. */
export default function SportHome({ sport, castelli }: { sport: Sport[]; castelli: Castello[] }) {
  const { scheda, scegliScheda, sport: filtro, scegliSport } = useSport();
  // Le classifiche sono sempre di un solo sport
  const sportClassifica = filtro ?? sport[0]?.id ?? "calcetto";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-testo-2">Sport & Eventi</span>
        <h1 className="text-[34px] font-bold leading-[1.02] tracking-tight">Gioca a San Marino</h1>
        <p className="text-[15px] text-testo-2">Trova una partita, iscriviti e gioca in squadre bilanciate dal tuo rating.</p>
      </header>

      <div role="tablist" aria-label="Sezioni Sport" className="grid grid-cols-2 gap-1 rounded-2xl border border-linea bg-superficie p-1">
        {(["partite", "classifiche"] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={scheda === s} onClick={() => scegliScheda(s)}
            className="h-10 rounded-xl text-sm font-semibold text-testo-2 transition-colors aria-selected:bg-superficie-2 aria-selected:text-testo">
            {s === "partite" ? "Partite" : "Classifiche"}
          </button>
        ))}
      </div>

      <SportChips sport={sport} scelto={scheda === "classifiche" ? sportClassifica : filtro} onScegli={scegliSport} conTutti={scheda === "partite"} />

      {scheda === "partite" ? <ListaPartite sport={sport} /> : <Classifiche sport={sportClassifica} castelli={castelli} />}
    </div>
  );
}
