"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icona } from "./Icona";
import type { PraticaDi } from "@/lib/data";

const pulisci = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * «Cosa devo fare?»: cerca tra le pratiche delle schede (campo `cosa_fare`) e porta all'ufficio giusto,
 * con la pratica aperta. Cerca nel titolo, nella spiegazione e nei documenti da portare.
 */
export default function CosaDevoFare({ pratiche, esempi = [] }: { pratiche: PraticaDi[]; esempi?: string[] }) {
  const [testo, setTesto] = useState("");
  const indice = useMemo(() => pratiche.map((p) => ({ p, chiave: pulisci([p.titolo, p.testo, ...(p.documenti ?? []), p.luogo].join(" ")) })), [pratiche]);
  const parole = pulisci(testo).split(" ").filter((x) => x.length > 1);
  const trovate = parole.length ? indice.filter((x) => parole.every((w) => x.chiave.includes(w))).map((x) => x.p) : [];

  return (
    <section className="flex flex-col gap-3" aria-labelledby="titolo-cosa-fare">
      <h2 id="titolo-cosa-fare" className="text-[19px] font-semibold tracking-tight">Cosa devo fare?</h2>
      <label className="flex h-12 items-center gap-3 rounded-xl border border-linea bg-superficie px-4 focus-within:border-accento">
        <span className="text-testo-2"><Icona nome="cerca" size={20} /></span>
        <span className="sr-only">Cerca una pratica</span>
        <input
          type="search"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Es. carta d'identità, residenza, certificato"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-testo-2/70"
        />
      </label>

      {parole.length ? (
        trovate.length ? (
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie" aria-live="polite">
            {trovate.slice(0, 8).map((p) => (
              <li key={`${p.luogo_id}-${p.indice}`}>
                <Link href={`/luoghi/${p.luogo_id}#pratica-${p.indice}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold leading-snug">{p.titolo}</span>
                    <span className="truncate text-[13px] text-testo-2">{p.luogo}{p.documenti?.length ? `, ${p.documenti.length === 1 ? "1 documento" : `${p.documenti.length} documenti`} da portare` : ""}</span>
                  </span>
                  <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-testo-2" aria-live="polite">Nessuna pratica trovata. Prova con un'altra parola, o cerca l'ufficio qui sotto.</p>
        )
      ) : esempi.length ? (
        <div className="flex flex-wrap gap-2">
          {esempi.map((e) => (
            <button key={e} type="button" onClick={() => setTesto(e)} className="h-9 rounded-xl bg-superficie px-3 text-sm font-medium text-testo-2 transition-colors hover:bg-superficie-2 hover:text-testo">
              {e}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
