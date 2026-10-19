"use client";

import { useCallback, useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Vuoto } from "@/components/Tano";
import { useSessione } from "@/modules/core/store";
import { chiudiAnnuncio, leggiGiorno, mieiAnnunci, STATI_ANNUNCIO, TIPI_ANNUNCIO, type MioAnnuncio } from "../api";

/** I miei annunci in bacheca, con lo stato e la nota della redazione; si chiudono quando non servono più. */
export default function MieiAnnunci() {
  const { stato } = useSessione();
  const [lista, setLista] = useState<MioAnnuncio[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(() => mieiAnnunci().then((r) => { setLista(r.annunci); setErrore(r.errore); }), []);
  useEffect(() => {
    if (stato === "connesso") carica();
  }, [stato, carica]);

  async function chiudi(a: MioAnnuncio) {
    if (!confirm(`Chiudere «${a.titolo}»? Sparisce dalla bacheca.`)) return;
    const r = await chiudiAnnuncio(a.id);
    if (r.errore) setErrore(r.errore);
    else carica();
  }

  if (stato === "ospite") return <PrimaryButton href="/profile?torna=/profile/bacheca" className="w-fit">Entra con SMR ID</PrimaryButton>;
  if (lista === null) return <div className="h-40 animate-pulse rounded-2xl bg-superficie" />;
  if (!lista.length) return <Vuoto titolo="Nessun annuncio" testo="Quello che scrivi in bacheca lo ritrovi qui." azione={{ href: "/comunita/bacheca/nuovo", testo: "Scrivi un annuncio" }} />;

  const oggi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());
  return (
    <div className="flex flex-col gap-3">
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {lista.map((a) => {
          const scaduto = a.scade < oggi && (a.stato === "pubblicato" || a.stato === "in_attesa");
          const attivo = !scaduto && (a.stato === "pubblicato" || a.stato === "in_attesa");
          return (
            <li key={a.id} className={`flex flex-col gap-1.5 p-4 ${attivo ? "" : "opacity-70"}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[15px] font-semibold">{a.titolo}</span>
                <span className="shrink-0 text-[12px] font-medium text-testo-2">{scaduto ? "Scaduto" : STATI_ANNUNCIO[a.stato]}</span>
              </div>
              <span className="text-[13px] text-testo-2">{TIPI_ANNUNCIO[a.tipo].nome}, scritto il {leggiGiorno(a.creato_il)}, fino al {leggiGiorno(a.scade)}</span>
              {a.nota_redazione ? <p className="rounded-xl bg-fondo px-3 py-2 text-[14px]"><span className="text-testo-2">La redazione: </span>{a.nota_redazione}</p> : null}
              {attivo ? <button type="button" onClick={() => chiudi(a)} className="w-fit py-1 text-sm font-semibold text-segnale">Chiudi l&apos;annuncio</button> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
