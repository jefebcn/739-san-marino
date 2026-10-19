"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { Vuoto } from "@/components/Tano";
import { useSessione } from "@/modules/core/store";
import { annunci as leggiAnnunci, leggiGiorno, TIPI_ANNUNCIO, type Annuncio, type TipoAnnuncio } from "../api";

type Castello = { id: number; nome: string; colore: string };

/** Il contatto come link: telefono, email o testo così com'è */
function Contatto({ testo }: { testo: string }) {
  const email = testo.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0];
  const telefono = testo.replace(/[^+\d]/g, "");
  if (email) return <a href={`mailto:${email}`} className="font-semibold text-accento underline underline-offset-2">{testo}</a>;
  if (telefono.length >= 6 && /^[+\d\s./()-]+$/.test(testo)) return <a href={`tel:${telefono.startsWith("+") ? telefono : `+378${telefono}`}`} className="font-mono font-semibold text-accento underline underline-offset-2">{testo}</a>;
  return <span className="font-semibold">{testo}</span>;
}

/** La Bacheca: gli annunci pubblicati, per tipo e castello. Il contatto si vede con l'SMR ID. */
export default function Bacheca({ castelli }: { castelli: Castello[] }) {
  const { stato } = useSessione();
  const [tipo, setTipo] = useState<TipoAnnuncio | null>(null);
  const [castello, setCastello] = useState<number | null>(null);
  const [lista, setLista] = useState<Annuncio[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (stato === "caricamento") return;
    setLista(null);
    leggiAnnunci(tipo, castello).then((r) => {
      setLista(r.annunci);
      setErrore(r.errore);
    });
  }, [tipo, castello, stato]);

  const chip = (attivo: boolean) => `h-10 shrink-0 rounded-xl px-4 text-[14px] font-medium transition-colors ${attivo ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <div className="-mx-[var(--lato)] flex gap-2 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
          <button type="button" aria-pressed={tipo === null} onClick={() => setTipo(null)} className={chip(tipo === null)}>Tutti</button>
          {(Object.keys(TIPI_ANNUNCIO) as TipoAnnuncio[]).map((t) => (
            <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)} className={chip(tipo === t)}>{TIPI_ANNUNCIO[t].nome}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[14px] text-testo-2">
          Dove
          <select value={castello ?? ""} onChange={(e) => setCastello(e.target.value ? Number(e.target.value) : null)} className="h-10 rounded-xl border border-linea bg-superficie px-3 text-[14px] text-testo">
            <option value="">Tutto il territorio</option>
            {castelli.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      </div>

      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}

      {lista === null ? (
        <div className="grid gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-superficie" />)}</div>
      ) : lista.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.map((a) => {
            const c = castelli.find((x) => x.id === a.castello_id);
            return (
              <li key={a.id} className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="taglio-piccolo bg-metallo py-0.5 text-[12px] font-semibold text-su-accento">{TIPI_ANNUNCIO[a.tipo].nome}</span>
                  <span className="text-[12px] text-testo-2">Fino al {leggiGiorno(a.scade)}</span>
                </div>
                <h2 className="text-[17px] font-semibold leading-snug">{a.titolo}</h2>
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-testo-2">{a.testo}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[13px]">
                  {c ? <span className="flex items-center gap-1.5 text-testo-2"><span className="size-2.5 rounded-full" style={{ background: c.colore }} />{c.nome}</span> : null}
                  <span className="text-testo-2">dal {leggiGiorno(a.pubblicato_il)}</span>
                </div>
                <div className="rounded-xl bg-fondo px-3 py-2.5 text-[14px]">
                  {a.contatto ? (
                    <span className="flex flex-wrap items-center gap-x-2"><span className="text-testo-2">Contatto:</span> <Contatto testo={a.contatto} />{a.mio ? <span className="text-[12px] text-testo-2">(il tuo annuncio)</span> : null}</span>
                  ) : (
                    <Link href="/profile?torna=/comunita/bacheca" className="font-medium text-accento">Entra con l&apos;SMR ID per vedere il contatto</Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vuoto titolo={tipo || castello ? "Nessun annuncio con questi filtri" : "La bacheca è ancora vuota"} testo="Cerchi o regali qualcosa, hai perso le chiavi, organizzi una raccolta nel tuo castello? Scrivilo qui." azione={{ href: "/comunita/bacheca/nuovo", testo: "Scrivi un annuncio" }} />
      )}

      <Link href="/comunita/bacheca/nuovo" className="taglio flex h-12 w-fit items-center gap-2 bg-metallo text-[15px] font-semibold text-su-accento">
        <Icona nome="piu" size={18} /> Scrivi un annuncio
      </Link>
      <p className="text-[13px] text-testo-2">Ogni annuncio lo legge la redazione prima che esca. Niente vendite di attività, offerte di lavoro, politica, nomi o foto di altre persone.</p>
    </div>
  );
}
