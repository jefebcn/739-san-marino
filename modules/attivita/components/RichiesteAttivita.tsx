"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { mieiRuoli } from "@/modules/core/ruoli";
import { decidiAttivita, elencoPro, impostaPro, richiesteAttivita, type Richiesta, type StatoRichiesta } from "../api";
import ProposteAttivita from "./ProposteAttivita";
import { CAMPO } from "./stile";

type Scheda = StatoRichiesta | "nuove";
const SCHEDE: { stato: Scheda; nome: string }[] = [
  { stato: "richiesta", nome: "Da verificare" },
  { stato: "nuove", nome: "Schede nuove" },
  { stato: "approvata", nome: "Approvate" },
  { stato: "rifiutata", nome: "Rifiutate" },
];
const quando = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });
const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/San_Marino" });
const tel = (t: string) => `tel:${t.replace(/[^+0-9]/g, "")}`;

/** Redazione: le richieste dei titolari. Si verifica (di solito chiamando il numero della scheda) e si decide. */
export default function RichiesteAttivita() {
  const [scheda, setScheda] = useState<Scheda>("richiesta");
  const [lista, setLista] = useState<Richiesta[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [pro, setPro] = useState<Map<string, string>>(new Map());
  const [fino, setFino] = useState<Record<string, string>>({});

  useEffect(() => {
    mieiRuoli().then((r) => setAdmin(r.amministratore));
  }, []);

  const carica = useCallback(() => {
    setLista(null);
    if (scheda === "nuove") return;
    richiesteAttivita(scheda).then((r) => {
      setLista(r.richieste);
      setErrore(r.errore);
    });
    if (scheda === "approvata") elencoPro().then((r) => setPro(r.pro));
  }, [scheda]);
  useEffect(carica, [carica]);

  const decidi = async (r: Richiesta, stato: "approvata" | "rifiutata" | "revocata") => {
    setInCorso(r.id);
    const esito = await decidiAttivita(r.id, stato, note[r.id] ?? "");
    setInCorso(null);
    if (esito.errore) return setErrore(esito.errore);
    carica();
  };

  // 739 Pro: lo attiva un amministratore dopo l'accordo con la società (niente pagamenti nell'app)
  const cambiaPro = async (r: Richiesta, data: string | null) => {
    setInCorso(r.id);
    const esito = await impostaPro(r.luogo_id, data);
    setInCorso(null);
    if (esito.errore) return setErrore(esito.errore);
    setErrore(null);
    carica();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="chips" role="tablist" aria-label="Richieste">
        {SCHEDE.map((s) => (
          <button key={s.stato} type="button" role="tab" className="chip" aria-selected={scheda === s.stato} onClick={() => setScheda(s.stato)}>{s.nome}</button>
        ))}
      </div>
      {scheda === "nuove" ? <ProposteAttivita /> : null}
      {scheda !== "nuove" && errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {scheda === "nuove" ? null : !lista ? (
        <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />
      ) : lista.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">{scheda === "richiesta" ? "Nessuna richiesta da verificare." : "Niente qui."}</p>
      ) : (
        lista.map((r) => (
          <article key={r.id} className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
            <div className="flex flex-col gap-0.5">
              <Link href={`/luoghi/${r.luogo_id}`} className="text-[17px] font-semibold tracking-tight underline-offset-2 hover:underline">{r.nome}</Link>
              <span className="text-[13px] text-testo-2">{[r.indirizzo, `richiesta il ${quando.format(new Date(r.creato_il))}`].filter(Boolean).join(", ")}</span>
            </div>
            <dl className="grid gap-1.5 text-sm">
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Chi</dt><dd>{r.chi}</dd></div>
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Telefono</dt><dd><a href={tel(r.telefono)} className="font-mono text-accento">{r.telefono}</a></dd></div>
              {r.email ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Email SMR ID</dt><dd className="break-all">{r.email}</dd></div> : null}
              {r.telefono_scheda ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Tel. della scheda</dt><dd><a href={tel(r.telefono_scheda)} className="font-mono text-accento">{r.telefono_scheda}</a></dd></div> : null}
              {r.nota ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Nota</dt><dd>{r.nota}</dd></div> : null}
              {r.nota_redazione ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Nota redazione</dt><dd>{r.nota_redazione}</dd></div> : null}
            </dl>
            {scheda === "richiesta" ? (
              <>
                <p className="text-[13px] text-testo-2">Per verificare chiama il numero della scheda (o quello del sito dell&apos;attività) e chiedi del titolare.</p>
                <input aria-label="Nota per il titolare" maxLength={500} value={note[r.id] ?? ""} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })} placeholder="Nota (facoltativa, la vede il titolare)" className={`h-11 ${CAMPO}`} />
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={inCorso === r.id} onClick={() => decidi(r, "approvata")} className="flex h-11 items-center gap-1.5 rounded-xl bg-metallo px-4 text-sm font-semibold text-su-accento disabled:opacity-50">
                    <Icona nome="scudo" size={16} /> Approva
                  </button>
                  <button type="button" disabled={inCorso === r.id} onClick={() => decidi(r, "rifiutata")} className="h-11 rounded-xl px-4 text-sm font-medium text-testo-2 hover:text-testo disabled:opacity-50">Rifiuta</button>
                </div>
              </>
            ) : scheda === "approvata" ? (
              <>
                <p className={`text-sm ${pro.has(r.luogo_id) ? "font-medium text-accento" : "text-testo-2"}`}>
                  {pro.has(r.luogo_id) ? `739 Pro fino al ${giorno.format(new Date(`${pro.get(r.luogo_id)}T12:00:00Z`))}` : "Profilo base"}
                </p>
                {admin ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-[13px] text-testo-2">
                      Pro fino al
                      <input type="date" value={fino[r.id] ?? pro.get(r.luogo_id) ?? ""} onChange={(e) => setFino({ ...fino, [r.id]: e.target.value })} className={`h-11 ${CAMPO}`} />
                    </label>
                    <button type="button" disabled={inCorso === r.id || !(fino[r.id] ?? "")} onClick={() => cambiaPro(r, fino[r.id])} className="h-11 rounded-xl bg-metallo px-4 text-sm font-semibold text-su-accento disabled:opacity-50">
                      {pro.has(r.luogo_id) ? "Cambia" : "Attiva il Pro"}
                    </button>
                    {pro.has(r.luogo_id) ? (
                      <button type="button" disabled={inCorso === r.id} onClick={() => cambiaPro(r, null)} className="h-11 rounded-xl px-4 text-sm font-medium text-testo-2 hover:text-testo disabled:opacity-50">Togli il Pro</button>
                    ) : null}
                  </div>
                ) : null}
                <button type="button" disabled={inCorso === r.id} onClick={() => decidi(r, "revocata")} className="w-fit py-2 text-sm font-medium text-segnale disabled:opacity-50">Togli la scheda a questo titolare</button>
              </>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
