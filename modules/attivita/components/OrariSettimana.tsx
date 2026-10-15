"use client";

import type { Orari } from "../api";
import { CAMPO } from "./stile";

const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

/**
 * Gli orari per «aperto adesso» (orari_settimana): per ogni giorno chiuso o aperto, con una o due fasce
 * (pranzo e cena). Stessa forma che leggono StatoApertura e le farmacie.
 */
export default function OrariSettimana({ valore, onCambia }: { valore: Orari; onCambia: (o: Orari) => void }) {
  const cambia = (giorno: string, fasce: [string, string][] | null) => {
    const nuovo = { ...valore };
    if (fasce?.length) nuovo[giorno] = fasce;
    else delete nuovo[giorno];
    onCambia(nuovo);
  };
  const copiaSuTutti = (giorno: string) => {
    const fasce = valore[giorno];
    if (!fasce) return;
    onCambia(Object.fromEntries(GIORNI.map((_, i) => [String(i + 1), fasce.map((f) => [...f] as [string, string])])));
  };

  return (
    <div className="flex flex-col divide-y divide-linea rounded-2xl border border-linea">
      {GIORNI.map((nome, i) => {
        const g = String(i + 1);
        const fasce = valore[g] ?? null;
        return (
          <div key={g} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-medium capitalize">{nome}</span>
              <label className="flex items-center gap-2 text-sm text-testo-2">
                <input type="checkbox" checked={!!fasce} onChange={(e) => cambia(g, e.target.checked ? [["09:00", "19:00"]] : null)} className="size-5 accent-[var(--accento)]" />
                {fasce ? "Aperto" : "Chiuso"}
              </label>
            </div>
            {fasce ? (
              <div className="flex flex-col gap-2">
                {fasce.map((f, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <input type="time" aria-label={`${nome}, apre`} value={f[0]} onChange={(e) => cambia(g, fasce.map((x, j) => (j === k ? [e.target.value, x[1]] : x)) as [string, string][])} className={`h-11 ${CAMPO} font-mono`} />
                    <span className="text-testo-2">alle</span>
                    <input type="time" aria-label={`${nome}, chiude`} value={f[1]} onChange={(e) => cambia(g, fasce.map((x, j) => (j === k ? [x[0], e.target.value] : x)) as [string, string][])} className={`h-11 ${CAMPO} font-mono`} />
                  </div>
                ))}
                <div className="flex flex-wrap gap-x-4">
                  {fasce.length < 2 ? (
                    <button type="button" className="py-1 text-sm font-medium text-accento" onClick={() => cambia(g, [...fasce, ["19:00", "23:00"]])}>Aggiungi una fascia</button>
                  ) : (
                    <button type="button" className="py-1 text-sm font-medium text-testo-2" onClick={() => cambia(g, fasce.slice(0, 1))}>Togli la seconda fascia</button>
                  )}
                  <button type="button" className="py-1 text-sm font-medium text-testo-2" onClick={() => copiaSuTutti(g)}>Uguale tutti i giorni</button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
