"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona, type NomeIcona } from "./Icona";

const AZIONI: { href: string; icona: NomeIcona; titolo: string; testo: string; allerta?: boolean }[] = [
  { href: "/sport?nuova=1", icona: "sport", titolo: "Organizza una partita", testo: "Le squadre le bilancia 739" },
  { href: "/profile?qr=1", icona: "qr", titolo: "Mostra il mio QR", testo: "Il tuo SMR ID, pronto da scansionare" },
  { href: "/cerca", icona: "cerca", titolo: "Cerca", testo: "Eventi, luoghi, servizi e castelli" },
  { href: "/utili/farmacie", icona: "farmacia", titolo: "Farmacie aperte", testo: "Chi è aperto adesso" },
  { href: "tel:112", icona: "telefono", titolo: "Chiama il 112", testo: "Emergenza", allerta: true },
];

/** Il pulsante "+" al centro della barra: apre le azioni rapide dal basso. */
export default function AzioniRapide() {
  const [aperto, setAperto] = useState(false);

  useEffect(() => {
    if (!aperto) return;
    const chiudi = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    window.addEventListener("keydown", chiudi);
    return () => window.removeEventListener("keydown", chiudi);
  }, [aperto]);

  return (
    <>
      <button
        type="button"
        aria-label="Azioni rapide"
        aria-haspopup="dialog"
        onClick={() => setAperto(true)}
        className="-mt-4 grid size-14 place-items-center rounded-full bg-metallo text-su-accento ring-[5px] ring-fondo transition-transform duration-150 active:scale-90"
      >
        <Icona nome="piu" size={26} />
      </button>

      {aperto ? (
        <div role="dialog" aria-modal="true" aria-label="Azioni rapide" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAperto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-[var(--colonna)] flex-col gap-3 rounded-t-3xl border border-linea bg-fondo px-[var(--gutter)] pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
            <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-linea" />
            <h2 className="text-[19px] font-semibold tracking-tight">Cosa vuoi fare?</h2>
            <ul className="flex flex-col gap-1.5">
              {AZIONI.map((a) => (
                <li key={a.href}>
                  <Link href={a.href} onClick={() => setAperto(false)} className="flex items-center gap-3.5 rounded-xl bg-superficie p-3 transition-colors hover:bg-superficie-2 active:scale-[0.98]">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${a.allerta ? "bg-segnale/15 text-segnale" : "bg-fondo text-testo"}`}>
                      <Icona nome={a.icona} size={22} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold">{a.titolo}</span>
                      <span className="text-sm text-testo-2">{a.testo}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
