"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icona } from "./Icona";
import PrimaryButton from "./ui/PrimaryButton";
import { segnalaErrore } from "@/modules/coda/api";

const MOTIVI = [
  { valore: "orario", nome: "Orario sbagliato" },
  { valore: "posizione", nome: "Posizione sbagliata" },
  { valore: "chiuso", nome: "Non esiste più o è chiuso" },
  { valore: "altro", nome: "Altro" },
] as const;

/**
 * «Segnala un errore» su una scheda o un evento. Si può anche senza SMR ID: la segnalazione finisce
 * nella coda delle bozze (/admin/coda, scheda Segnalazioni) e la redazione corregge.
 */
export default function SegnalaErrore({ luogo, evento }: { luogo?: string; evento?: string }) {
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  useEffect(() => {
    if (!aperto) return;
    const chiudi = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    window.addEventListener("keydown", chiudi);
    return () => window.removeEventListener("keydown", chiudi);
  }, [aperto]);

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo) return setErrore("Scegli cosa è sbagliato.");
    setInvio(true);
    setErrore(null);
    const r = await segnalaErrore({ luogo, evento }, motivo, testo);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setFatto(true);
  };

  if (fatto) {
    return <p role="status" className="rounded-xl bg-accento-tenue px-4 py-3 text-sm text-accento">Grazie: la redazione controlla e corregge.</p>;
  }

  return (
    <>
      <button type="button" onClick={() => setAperto(true)} className="flex w-fit items-center gap-1.5 py-1 text-sm font-medium text-testo-2 hover:text-testo">
        <Icona nome="allerta" size={18} /> Segnala un errore
      </button>

      {/* Nel body: dentro la pagina il contenitore che scorre taglierebbe il pannello */}
      {aperto ? createPortal(
        <div role="dialog" aria-modal="true" aria-label="Segnala un errore" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm lg:items-center lg:p-6" onClick={() => setAperto(false)}>
          <form
            onSubmit={invia}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-[var(--colonna)] flex-col gap-4 rounded-t-3xl border border-linea bg-fondo px-[var(--gutter)] pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))] lg:max-w-[520px] lg:rounded-3xl lg:px-6 lg:pb-6"
          >
            <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-linea lg:hidden" />
            <div className="flex flex-col gap-1">
              <h2 className="text-[19px] font-semibold tracking-tight">Cosa non torna?</h2>
              <p className="text-sm text-testo-2">La redazione controlla ogni segnalazione e corregge la scheda.</p>
            </div>
            <div role="radiogroup" aria-label="Cosa è sbagliato" className="grid grid-cols-2 gap-2">
              {MOTIVI.map((m) => (
                <button
                  key={m.valore}
                  type="button"
                  role="radio"
                  aria-checked={motivo === m.valore}
                  onClick={() => setMotivo(m.valore)}
                  className="min-h-12 rounded-xl border border-linea bg-superficie px-3 py-2.5 text-left text-sm font-medium aria-checked:border-accento aria-checked:bg-accento-tenue"
                >
                  {m.nome}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-testo-2">{motivo === "altro" ? "Cosa è sbagliato?" : "Dettagli (facoltativo)"}</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={testo}
                onChange={(e) => setTesto(e.target.value)}
                placeholder="Per esempio: il sabato chiude alle 13"
                className="w-full rounded-xl border border-linea bg-superficie px-4 py-3 text-[15px] leading-snug outline-none placeholder:text-testo-2/60 focus:border-accento"
              />
            </label>
            {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <PrimaryButton variante="secondario" onClick={() => setAperto(false)}>Annulla</PrimaryButton>
              <PrimaryButton type="submit" disabled={invio}>{invio ? "Invio…" : "Invia"}</PrimaryButton>
            </div>
          </form>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
