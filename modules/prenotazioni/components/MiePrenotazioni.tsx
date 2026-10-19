"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Vuoto } from "@/components/Tano";
import AvvisiPersonali from "@/components/AvvisiPersonali";
import { useSessione } from "@/modules/core/store";
import { annullaPrenotazione, leggiGiorno, leggiOra, miePrenotazioni, STATI, type MiaPrenotazione } from "../api";

const COLORE: Record<string, string> = {
  richiesta: "bg-accento-tenue text-testo",
  confermata: "bg-metallo text-su-accento",
  rifiutata: "bg-segnale/12 text-segnale",
  annullata: "bg-superficie-2 text-testo-2",
  assente: "bg-segnale/12 text-segnale",
};

/** Le mie prenotazioni fatte con 739: le prossime in cima, poi quelle degli ultimi 30 giorni. Si annulla nei tempi del centro. */
export default function MiePrenotazioni() {
  const { stato } = useSessione();
  const [lista, setLista] = useState<MiaPrenotazione[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState<string | null>(null);

  const carica = () => miePrenotazioni().then((r) => { setLista(r.prenotazioni); setErrore(r.errore); });
  useEffect(() => {
    if (stato === "connesso") carica();
  }, [stato]);

  async function annulla(p: MiaPrenotazione) {
    if (!confirm(`Annullare ${p.risorsa} da ${p.luogo}, ${leggiGiorno(p.inizio)} alle ${leggiOra(p.inizio)}?`)) return;
    setInCorso(p.id);
    const r = await annullaPrenotazione(p.id);
    setInCorso(null);
    if (r.errore) setErrore(r.errore);
    else carica();
  }

  if (stato === "ospite") {
    return (
      <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] text-testo-2">Le prenotazioni sono legate al tuo SMR ID: entra per vederle.</p>
        <PrimaryButton href="/profile?torna=/profile/prenotazioni">Entra con SMR ID</PrimaryButton>
      </section>
    );
  }
  if (lista === null) return <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Carico le prenotazioni" />;

  const adesso = Date.now();
  const prossime = lista.filter((p) => Date.parse(p.fine) > adesso);
  const passate = lista.filter((p) => Date.parse(p.fine) <= adesso);

  if (!lista.length) {
    return (
      <>
        {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
        <Vuoto titolo="Nessuna prenotazione" testo="Campi, sale e servizi dei centri che prenotano con 739 li trovi nelle loro schede, col pulsante «Prenota con 739»." azione={{ href: "/sport/impianti", testo: "Gli impianti sportivi" }} />
      </>
    );
  }

  const riga = (p: MiaPrenotazione, futura: boolean) => {
    const attiva = p.stato === "richiesta" || p.stato === "confermata";
    const tardi = p.stato === "confermata" && Date.parse(p.inizio) - adesso < p.disdetta_ore * 3_600_000;
    return (
      <li key={p.id} className="flex flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <Link href={`/luoghi/${p.luogo_id}`} className="text-[16px] font-semibold hover:underline">{p.luogo}</Link>
            <span className="text-[14px] text-testo-2">{p.risorsa}</span>
          </div>
          <span className={`shrink-0 rounded-lg px-2 py-1 text-[12px] font-medium ${COLORE[p.stato]}`}>{p.stato === "annullata" && p.annullata_da === "gestore" ? "Annullata dal centro" : STATI[p.stato]}</span>
        </div>
        <p className="text-[15px]">
          <span className="first-letter:uppercase">{leggiGiorno(p.inizio)}</span>, <span className="font-mono font-medium">{leggiOra(p.inizio)}–{leggiOra(p.fine)}</span>
        </p>
        {p.nota_gestore ? <p className="rounded-xl bg-fondo px-3 py-2 text-[14px]"><span className="text-testo-2">Il centro: </span>{p.nota_gestore}</p> : null}
        {futura && attiva ? (
          <div className="flex flex-wrap items-center gap-2">
            {p.telefono_centro ? (
              <a href={`tel:${p.telefono_centro.replace(/[^+0-9]/g, "")}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-fondo px-4 text-sm font-semibold hover:bg-superficie-2">
                <Icona nome="telefono" size={18} piatta /> Chiama il centro
              </a>
            ) : null}
            {tardi ? (
              <span className="text-[13px] text-testo-2">Per annullare ormai chiama il centro.</span>
            ) : (
              <button type="button" onClick={() => annulla(p)} disabled={inCorso === p.id} className="h-10 rounded-xl px-4 text-sm font-semibold text-segnale hover:bg-segnale/12 disabled:opacity-50">
                {inCorso === p.id ? "Annullo…" : "Annulla"}
              </button>
            )}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <AvvisiPersonali testo="Ti avvisiamo sul telefono quando un centro conferma, non accetta o annulla una tua prenotazione." />
      <section className="flex flex-col gap-3" aria-labelledby="t-prossime">
        <h2 id="t-prossime" className="text-[19px] font-semibold tracking-tight">In arrivo</h2>
        {prossime.length ? (
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">{prossime.map((p) => riga(p, true))}</ul>
        ) : (
          <p className="rounded-2xl bg-superficie px-4 py-4 text-[15px] text-testo-2">Niente in arrivo.</p>
        )}
      </section>
      {passate.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="t-passate">
          <h2 id="t-passate" className="text-[19px] font-semibold tracking-tight">Ultimi 30 giorni</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie opacity-80">{passate.map((p) => riga(p, false))}</ul>
        </section>
      ) : null}
      <p className="text-[13px] text-testo-2">Si paga sul posto. Chi non si presenta a due prenotazioni confermate in 90 giorni non può prenotare da 739 per un mese.</p>
    </div>
  );
}
