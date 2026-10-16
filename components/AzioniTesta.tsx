"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { linguaDi } from "@/lib/lingua";
import { CambiaLingua } from "./Lingua";
import type { Castello } from "@/lib/data";
import { useSessione } from "@/modules/core/store";
import { Icona } from "./Icona";
import SceltaCastello from "./SceltaCastello";

/** In alto a destra: il tuo castello, la lingua e l'SMR ID (con l'iniziale del nome quando sei connesso). In inglese solo la lingua. */
export default function AzioniTesta({ classifica }: { classifica: Castello[] }) {
  const profilo = useSessione((s) => s.profilo);
  const iniziale = profilo?.nome?.trim().charAt(0).toUpperCase();
  if (linguaDi(usePathname()) === "en") return <CambiaLingua />;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <SceltaCastello classifica={classifica} />
      <CambiaLingua />
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
