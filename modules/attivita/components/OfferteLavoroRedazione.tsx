"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CONTRATTI, leggiGiorno } from "@/modules/lavorare/offerte";
import { offerteLavoroRedazione, ritiraOffertaLavoro, type OffertaRedazione } from "../lavoro-api";
import { CAMPO } from "./stile";

const quando = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });
const STATI = [
  { stato: "pubblicata", nome: "Online" },
  { stato: "chiusa", nome: "Chiuse" },
  { stato: "ritirata", nome: "Ritirate" },
] as const;

/** Redazione: le offerte di lavoro. Vanno online subito; qui si leggono e, se non rispettano i Termini, si ritirano. */
export default function OfferteLavoroRedazione() {
  const [stato, setStato] = useState<OffertaRedazione["stato"]>("pubblicata");
  const [lista, setLista] = useState<OffertaRedazione[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [inCorso, setInCorso] = useState<string | null>(null);

  const carica = useCallback(() => {
    setLista(null);
    offerteLavoroRedazione(stato).then((r) => {
      setLista(r.offerte);
      setErrore(r.errore);
    });
  }, [stato]);
  useEffect(carica, [carica]);

  const ritira = async (o: OffertaRedazione, si: boolean) => {
    setInCorso(o.id);
    const r = await ritiraOffertaLavoro(o, note[o.id] ?? "", si);
    setInCorso(null);
    if (r.errore) return setErrore(r.errore);
    carica();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 text-sm font-medium" role="tablist" aria-label="Offerte di lavoro">
        {STATI.map((s) => (
          <button key={s.stato} type="button" role="tab" aria-selected={stato === s.stato} onClick={() => setStato(s.stato)} className={stato === s.stato ? "font-semibold text-testo underline underline-offset-4" : "text-testo-2 hover:text-testo"}>{s.nome}</button>
        ))}
      </div>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {!lista ? (
        <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />
      ) : lista.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessuna offerta qui.</p>
      ) : (
        lista.map((o) => (
          <article key={o.id} className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
            <div className="flex flex-col gap-0.5">
              <Link href={`/lavorare/lavoro/${o.id}`} className="text-[17px] font-semibold tracking-tight underline-offset-2 hover:underline">{o.titolo}</Link>
              <span className="text-[13px] text-testo-2">
                <Link href={`/luoghi/${o.luogo_id}`} className="underline-offset-2 hover:underline">{o.attivita}</Link>, {CONTRATTI[o.contratto]}, {o.orario}, fino al {leggiGiorno(o.scadenza)}
              </span>
              <span className="text-[13px] text-testo-2">Pubblicata il {quando.format(new Date(o.creato_il))}{o.autore_email ? ` da ${o.autore_email}` : ""}</span>
            </div>
            <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed">{o.descrizione}</p>
            <p className="break-all text-[13px] text-testo-2">{[o.email, o.link, o.telefono].filter(Boolean).join(", ")}</p>
            {o.nota_redazione ? <p className="text-[13px] text-testo-2">Nota: {o.nota_redazione}</p> : null}
            {o.stato === "pubblicata" ? (
              <div className="flex flex-col gap-2">
                <input aria-label="Perché la ritiri" maxLength={500} value={note[o.id] ?? ""} onChange={(e) => setNote({ ...note, [o.id]: e.target.value })} placeholder="Perché la ritiri (la vede il titolare)" className={`h-11 ${CAMPO}`} />
                <button type="button" disabled={inCorso === o.id} onClick={() => ritira(o, true)} className="w-fit py-2 text-sm font-semibold text-segnale disabled:opacity-50">Ritira l&apos;offerta</button>
              </div>
            ) : o.stato === "ritirata" ? (
              <button type="button" disabled={inCorso === o.id} onClick={() => ritira(o, false)} className="w-fit py-2 text-sm font-semibold text-accento disabled:opacity-50">Rimetti online</button>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
