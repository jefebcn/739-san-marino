"use client";

import Link from "next/link";
import type { Castello } from "@/lib/data";
import { useSessione } from "@/modules/core/store";
import { Icona } from "./Icona";
import SceltaCastello from "./SceltaCastello";

/** In alto a destra: il tuo castello e l'SMR ID (con l'iniziale del nome quando sei connesso). */
export default function AzioniTesta({ classifica }: { classifica: Castello[] }) {
  const profilo = useSessione((s) => s.profilo);
  const iniziale = profilo?.nome?.trim().charAt(0).toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <SceltaCastello classifica={classifica} />
      <Link
        href="/profile"
        aria-label="Il tuo SMR ID"
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-superficie text-[15px] font-semibold text-testo transition-colors hover:bg-superficie-2 active:scale-95"
      >
        {iniziale ? iniziale : <Icona nome="persona" size={20} />}
      </Link>
    </div>
  );
}
