"use client";

import { useEffect, useState, type ReactNode } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { mieiRuoli, type Ruoli } from "@/modules/core/ruoli";

/**
 * Mostra i pannelli della redazione solo a chi ha il ruolo giusto. È solo comodità: i permessi veri
 * li controlla il database (regole RLS e funzioni con e_redattore()/e_amministratore()).
 */
export default function Riservato({ ruolo, children }: { ruolo: keyof Ruoli; children: ReactNode }) {
  const { stato } = useSessione();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (stato !== "connesso") return;
    mieiRuoli().then((r) => setOk(r[ruolo]));
  }, [stato, ruolo]);

  if (stato === "caricamento" || (stato === "connesso" && ok === null)) {
    return <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  }
  if (stato !== "connesso") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-testo-2">Per aprire questo pannello entra con il tuo SMR ID.</p>
        <PrimaryButton href="/profile" className="w-fit">Entra</PrimaryButton>
      </div>
    );
  }
  if (!ok) {
    const chi = ruolo === "amministratore" ? "agli amministratori" : ruolo === "redattore" ? "alla redazione" : "agli organizzatori";
    return <p className="text-[15px] text-testo-2">Questo pannello è riservato {chi} di 739. Se dovresti averlo, chiedi ad Alex di aggiungerti.</p>;
  }
  return <>{children}</>;
}
