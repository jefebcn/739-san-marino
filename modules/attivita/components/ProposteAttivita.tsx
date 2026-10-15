"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { CATEGORIA_SINGOLA, CATEGORIE } from "@/lib/data";
import { decidiProposta, proposteAttivita, type Proposta } from "../api";
import { TIPI, eCategoriaNuova } from "../tipi";
import { CAMPO } from "./stile";

const quando = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });
const tel = (t: string) => `tel:${t.replace(/[^+0-9]/g, "")}`;
const tipoDi = (p: Proposta) => {
  const t = eCategoriaNuova(p.categoria) ? TIPI[p.categoria].find((x) => x.tipo === p.sottocategoria)?.nome : null;
  return t && t !== "Altro" ? t : CATEGORIA_SINGOLA[p.categoria] ?? CATEGORIE[p.categoria] ?? p.categoria;
};

/** Redazione: le schede nuove proposte dai titolari. Approvando la scheda va online già affidata a chi l'ha proposta. */
export default function ProposteAttivita() {
  const [lista, setLista] = useState<Proposta[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [inCorso, setInCorso] = useState<string | null>(null);

  const carica = useCallback(() => {
    setLista(null);
    proposteAttivita("richiesta").then((r) => {
      setLista(r.proposte);
      setErrore(r.errore);
    });
  }, []);
  useEffect(carica, [carica]);

  const decidi = async (p: Proposta, stato: "approvata" | "rifiutata") => {
    setInCorso(p.id);
    const r = await decidiProposta(p.id, stato, note[p.id] ?? "");
    setInCorso(null);
    if (r.errore) return setErrore(r.errore);
    setErrore(null);
    carica();
  };

  if (!lista) return <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  return (
    <>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {lista.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessuna scheda nuova da verificare.</p>
      ) : (
        lista.map((p) => (
          <article key={p.id} className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[17px] font-semibold tracking-tight">{p.nome}</h2>
              <span className="text-[13px] text-testo-2">{tipoDi(p)}, proposta il {quando.format(new Date(p.creato_il))}</span>
            </div>
            <dl className="grid gap-1.5 text-sm">
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Indirizzo</dt><dd>{p.indirizzo}</dd></div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-testo-2">Sulla mappa</dt>
                <dd>
                  <a href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`} target="_blank" rel="noopener" className="font-mono text-accento">
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  </a>
                </dd>
              </div>
              {p.descrizione ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Cosa fanno</dt><dd>{p.descrizione}</dd></div> : null}
              {p.telefono ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Tel. pubblico</dt><dd><a href={tel(p.telefono)} className="font-mono text-accento">{p.telefono}</a></dd></div> : null}
              {p.email_attivita ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Email</dt><dd className="break-all">{p.email_attivita}</dd></div> : null}
              {p.sito ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Sito</dt><dd className="break-all"><a href={p.sito} target="_blank" rel="noopener" className="text-accento">{p.sito}</a></dd></div> : null}
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Chi</dt><dd>{p.chi}</dd></div>
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Tel. verifica</dt><dd><a href={tel(p.telefono_verifica)} className="font-mono text-accento">{p.telefono_verifica}</a></dd></div>
              {p.email ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Email SMR ID</dt><dd className="break-all">{p.email}</dd></div> : null}
              {p.nota ? <div className="flex gap-2"><dt className="w-28 shrink-0 text-testo-2">Nota</dt><dd>{p.nota}</dd></div> : null}
            </dl>
            <p className="text-[13px] text-testo-2">Prima di approvare controlla che l&apos;attività esista (registro, sito, insegna) e chiama il numero pubblico o quello per la verifica. Se il punto sulla mappa è sbagliato, rifiuta con una nota.</p>
            <input aria-label="Nota per il titolare" maxLength={500} value={note[p.id] ?? ""} onChange={(e) => setNote({ ...note, [p.id]: e.target.value })} placeholder="Nota (facoltativa, la vede il titolare)" className={`h-11 ${CAMPO}`} />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={inCorso === p.id} onClick={() => decidi(p, "approvata")} className="flex h-11 items-center gap-1.5 rounded-xl bg-metallo px-4 text-sm font-semibold text-su-accento disabled:opacity-50">
                <Icona nome="scudo" size={16} /> Approva e pubblica
              </button>
              <button type="button" disabled={inCorso === p.id} onClick={() => decidi(p, "rifiutata")} className="h-11 rounded-xl px-4 text-sm font-medium text-testo-2 hover:text-testo disabled:opacity-50">Rifiuta</button>
            </div>
          </article>
        ))
      )}
      <p className="text-[13px] text-testo-2">Le schede approvate le trovi nella loro sezione (per esempio <Link href="/lavorare" className="text-accento">Lavorare</Link>) e il titolare nella scheda Approvate.</p>
    </>
  );
}
