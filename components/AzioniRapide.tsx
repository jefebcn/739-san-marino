"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona, type NomeIcona } from "./Icona";

const AZIONI: { href: string; icona: NomeIcona; titolo: string; testo: string; allerta?: boolean }[] = [
  { href: "/sport?nuova=1", icona: "sport", titolo: "Organizza una partita", testo: "Calcetto, padel, tennis… squadre bilanciate" },
  { href: "/profile?qr=1", icona: "qr", titolo: "Mostra il mio QR", testo: "Il tuo SMR ID, pronto da scansionare" },
  { href: "/cerca", icona: "cerca", titolo: "Cerca", testo: "Eventi, luoghi, servizi e castelli" },
  { href: "/utili/farmacie", icona: "farmacia", titolo: "Farmacie aperte", testo: "Chi è aperto adesso" },
  { href: "tel:112", icona: "telefono", titolo: "Emergenza · 112", testo: "Chiama subito", allerta: true },
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
        className="-mt-5 grid size-14 place-items-center rounded-full bg-metallo text-su-accento shadow-[0_8px_24px_-6px_rgba(201,164,92,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] ring-4 ring-fondo transition-transform duration-150 active:scale-90 [&_svg]:size-7"
      >
        <Icona nome="piu" />
      </button>

      {aperto ? (
        <div role="dialog" aria-modal="true" aria-label="Azioni rapide" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAperto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-[var(--colonna)] flex-col gap-3 rounded-t-3xl border border-linea bg-fondo px-[var(--gutter)] pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
            <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-linea" />
            <h2 className="text-xl font-semibold tracking-tight">Cosa vuoi fare?</h2>
            <ul className="flex flex-col gap-1.5">
              {AZIONI.map((a) => (
                <li key={a.href}>
                  <Link href={a.href} onClick={() => setAperto(false)} className="flex items-center gap-3.5 rounded-2xl border border-linea bg-superficie p-3 transition-transform active:scale-[0.98]">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-[22px] ${a.allerta ? "bg-segnale/15 text-segnale" : "bg-accento-tenue text-accento"}`}>
                      <Icona nome={a.icona} />
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
