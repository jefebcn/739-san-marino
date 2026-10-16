"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { useSessione } from "@/modules/core/store";

/**
 * In fondo alla scheda di un'attività, solo per chi la gestisce: la redazione e il titolare approvato.
 * Porta alla modifica della scheda e alle prenotazioni con 739 (la pagina è in cache, quindi lo decide il browser).
 */
export default function GestisciScheda({ luogo }: { luogo: string }) {
  const { stato } = useSessione();
  const [chi, setChi] = useState<"redazione" | "titolare" | null>(null);

  useEffect(() => {
    if (stato !== "connesso") return;
    let attivo = true;
    (async () => {
      const [{ mieiRuoli }, { mieAttivita }] = await Promise.all([import("@/modules/core/ruoli"), import("@/modules/attivita/api")]);
      const ruoli = await mieiRuoli();
      if (!attivo) return;
      if (ruoli.redattore || ruoli.amministratore) return setChi("redazione");
      const { attivita } = await mieAttivita();
      if (attivo && attivita.some((a) => a.luogo_id === luogo && a.stato === "approvata")) setChi("titolare");
    })();
    return () => {
      attivo = false;
    };
  }, [stato, luogo]);

  if (!chi) return null;
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-linea p-4" aria-labelledby="gestisci">
      <div className="flex flex-col">
        <h2 id="gestisci" className="text-[16px] font-semibold">Gestisci questa scheda</h2>
        <p className="text-[13px] text-testo-2">{chi === "redazione" ? "Lo vedi perché sei della redazione." : "Lo vedi perché la scheda è affidata a te."}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/profile/attivita/${luogo}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-superficie text-sm font-semibold hover:bg-superficie-2">
          <Icona nome="modifica" size={18} piatta /> La scheda
        </Link>
        <Link href={`/profile/attivita/${luogo}/prenotazioni`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-superficie text-sm font-semibold hover:bg-superficie-2">
          <Icona nome="calendario" size={18} piatta /> Prenotazioni
        </Link>
      </div>
    </section>
  );
}
