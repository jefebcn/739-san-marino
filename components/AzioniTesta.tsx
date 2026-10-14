"use client";

import Link from "next/link";
import { useSessione } from "@/modules/core/store";
import { Icona } from "./Icona";

/** In alto a destra: ricerca e SMR ID (con l'iniziale del nome quando sei connesso). */
export default function AzioniTesta() {
  const profilo = useSessione((s) => s.profilo);
  const iniziale = profilo?.nome?.trim().charAt(0).toUpperCase();
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link href="/cerca" aria-label="Cerca" className="grid size-10 place-items-center rounded-xl border border-linea bg-superficie text-testo transition-transform active:scale-95 [&_svg]:size-5">
        <Icona nome="cerca" />
      </Link>
      <Link href="/profile" aria-label="Il tuo SMR ID" className="grid size-10 place-items-center rounded-xl border border-ottone-500/40 bg-metallo font-semibold text-su-accento shadow-lucido transition-transform active:scale-95 [&_svg]:size-5">
        {iniziale ? iniziale : <Icona nome="persona" />}
      </Link>
    </div>
  );
}
