"use client";

import { useCallback, useEffect, useState } from "react";
import { annunciRedazione, decidiAnnuncio, leggiGiorno, TIPI_ANNUNCIO, type AnnuncioRedazione, type StatoAnnuncio } from "../api";

const SCHEDE: { stato: StatoAnnuncio; nome: string }[] = [
  { stato: "in_attesa", nome: "Da vedere" },
  { stato: "pubblicato", nome: "In bacheca" },
  { stato: "rifiutato", nome: "Non pubblicati" },
];

/** Redazione: gli annunci della bacheca da approvare, quelli in bacheca (si ritirano) e quelli rifiutati */
export default function BachecaRedazione({ castelli }: { castelli: { id: number; nome: string }[] }) {
  const [scheda, setScheda] = useState<StatoAnnuncio>("in_attesa");
  const [lista, setLista] = useState<AnnuncioRedazione[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(() => {
    setLista(null);
    annunciRedazione(scheda).then((r) => { setLista(r.annunci); setErrore(r.errore); });
  }, [scheda]);
  useEffect(carica, [carica]);

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-superficie p-1">
        {SCHEDE.map((s) => (
          <button key={s.stato} role="tab" type="button" aria-selected={scheda === s.stato} onClick={() => setScheda(s.stato)}
            className={`h-10 rounded-lg text-[14px] font-semibold ${scheda === s.stato ? "bg-fondo text-testo shadow-sm" : "text-testo-2"}`}>{s.nome}</button>
        ))}
      </div>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {lista === null ? <div className="h-40 animate-pulse rounded-2xl bg-superficie" /> : lista.length ? (
        <ul className="flex flex-col gap-3">
          {lista.map((a) => <Riga key={a.id} a={a} castello={castelli.find((c) => c.id === a.castello_id)?.nome ?? "Tutto il territorio"} onFatto={carica} />)}
        </ul>
      ) : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">{scheda === "in_attesa" ? "Niente da vedere." : "Nessun annuncio."}</p>}
      <p className="text-[13px] text-testo-2">Si pubblica se è di una persona del territorio e non è: pubblicità di attività, offerta di lavoro, politica, vendita vietata, dati o foto di altre persone, offese.</p>
    </div>
  );
}

function Riga({ a, castello, onFatto }: { a: AnnuncioRedazione; castello: string; onFatto: () => void }) {
  const [nota, setNota] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function decidi(stato: "pubblicato" | "rifiutato" | "ritirato") {
    if (stato !== "pubblicato" && !nota.trim() && !confirm("Senza una nota chi l'ha scritto non sa perché. Continuare?")) return;
    setInvio(true);
    const r = await decidiAnnuncio(a.id, stato, nota);
    setInvio(false);
    if (r.errore) setErrore(r.errore);
    else onFatto();
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
      <div className="flex items-center justify-between gap-3 text-[12px] text-testo-2">
        <span className="font-semibold text-testo">{TIPI_ANNUNCIO[a.tipo].nome}</span>
        <span>{a.autore_nome ?? "SMR ID senza nome"}, {leggiGiorno(a.creato_il)}</span>
      </div>
      <h2 className="text-[17px] font-semibold">{a.titolo}</h2>
      <p className="whitespace-pre-line text-[14px] leading-relaxed">{a.testo}</p>
      <p className="text-[13px] text-testo-2">{castello}, contatto: <span className="font-medium text-testo">{a.contatto}</span>, fino al {leggiGiorno(a.scade)}</p>
      {a.nota_redazione ? <p className="text-[13px] text-testo-2">Nota: {a.nota_redazione}</p> : null}
      {a.stato !== "rifiutato" ? (
        <>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="Nota per chi l'ha scritto (se non lo pubblichi)" className="h-11 w-full rounded-xl border border-linea bg-fondo px-3 text-[14px]" />
          <div className="flex flex-wrap gap-2">
            {a.stato === "in_attesa" ? (
              <>
                <button type="button" disabled={invio} onClick={() => decidi("pubblicato")} className="taglio-piccolo h-10 bg-metallo px-5 text-sm font-semibold text-su-accento disabled:opacity-50">Pubblica</button>
                <button type="button" disabled={invio} onClick={() => decidi("rifiutato")} className="h-10 rounded-xl px-4 text-sm font-semibold text-segnale hover:bg-segnale/12">Non pubblicare</button>
              </>
            ) : (
              <button type="button" disabled={invio} onClick={() => decidi("ritirato")} className="h-10 rounded-xl px-4 text-sm font-semibold text-segnale hover:bg-segnale/12">Ritira dalla bacheca</button>
            )}
          </div>
        </>
      ) : null}
      {errore ? <p role="alert" className="text-sm text-segnale">{errore}</p> : null}
    </li>
  );
}
