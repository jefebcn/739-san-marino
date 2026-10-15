"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { TITOLARE } from "@/lib/legale";
import { mioPro, PREZZO_PRO, salvaOfferta, salvaPro, togliOfferta, type MioPro } from "../api";
import { CAMPO } from "./stile";

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
const conAnno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/San_Marino" });
const leggi = (d: string, anno = false) => (anno ? conAnno : giorno).format(new Date(`${d}T12:00:00Z`));
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());

/** 739 Pro nella modifica della scheda: menu, prenota e offerte se è attivo; altrimenti cosa offre e come attivarlo. */
export default function ProAttivita({ id, nome }: { id: string; nome: string }) {
  const [pro, setPro] = useState<MioPro | null | undefined>(undefined);
  const [errore, setErrore] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [menu, setMenu] = useState("");
  const [prenota, setPrenota] = useState("");
  const [nuova, setNuova] = useState({ titolo: "", testo: "", dal: oggi(), al: oggi() });
  const [invio, setInvio] = useState(false);

  const carica = useCallback(() => {
    mioPro(id).then((r) => {
      setPro(r.pro);
      setErrore(r.errore);
      setMenu(r.pro?.menu_url ?? "");
      setPrenota(r.pro?.prenota_url ?? "");
    });
  }, [id]);
  useEffect(carica, [carica]);

  if (pro === undefined) return <div className="h-32 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;

  if (!pro?.attivo) {
    const oggetto = encodeURIComponent(`739 Pro per ${nome}`);
    return (
      <section className="flex flex-col gap-3 rounded-2xl bg-superficie p-5" aria-labelledby="titolo-pro">
        <h2 id="titolo-pro" className="text-[19px] font-semibold tracking-tight">739 Pro</h2>
        <ul className="flex flex-col gap-1.5 text-[15px] leading-relaxed">
          <li>Il pulsante «Menu» con il tuo menu e «Prenota» con il tuo sistema di prenotazione.</li>
          <li>Fino a 3 offerte con la scadenza, in evidenza nella scheda e nelle liste.</li>
          <li>I numeri della scheda: quante volte la aprono e toccano telefono, indicazioni e sito.</li>
        </ul>
        <p className="text-[15px]"><b className="font-semibold">{PREZZO_PRO}.</b> <span className="text-testo-2">Il profilo base resta gratis per sempre, e il Pro non ti mette davanti agli altri nelle liste.</span></p>
        {pro?.fino ? <p className="text-sm text-testo-2">Il tuo Pro è scaduto il {leggi(pro.fino, true)}.</p> : null}
        <PrimaryButton href={`mailto:${TITOLARE.email}?subject=${oggetto}`} esterno className="w-fit">Chiedi il Pro</PrimaryButton>
      </section>
    );
  }

  const esito = (r: { errore: string | null }, testo: string) => {
    setInvio(false);
    if (r.errore) {
      setOk(null);
      return setErrore(r.errore);
    }
    setErrore(null);
    setOk(testo);
    carica();
  };

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-linea p-4" aria-labelledby="titolo-pro">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titolo-pro" className="text-[19px] font-semibold tracking-tight">739 Pro</h2>
        {pro.fino ? <span className="text-[13px] text-testo-2">attivo fino al {leggi(pro.fino, true)}</span> : null}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-testo-2">Link al menu</span>
          <input type="url" maxLength={500} value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="https:// (pagina, PDF o foto del menu)" className={`h-12 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-testo-2">Link per prenotare</span>
          <input type="url" maxLength={500} value={prenota} onChange={(e) => setPrenota(e.target.value)} placeholder="https:// (TheFork, il tuo sito, WhatsApp…)" className={`h-12 ${CAMPO}`} />
        </label>
        <PrimaryButton type="button" variante="secondario" className="w-fit" disabled={invio} onClick={async () => { setInvio(true); esito(await salvaPro(id, menu.trim(), prenota.trim()), "Link salvati."); }}>
          Salva i link
        </PrimaryButton>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[17px] font-semibold tracking-tight">Offerte</h3>
        {pro.offerte.length ? (
          <ul className="divide-y divide-linea rounded-2xl bg-superficie">
            {pro.offerte.map((o) => (
              <li key={o.id} className="flex items-start gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-medium">{o.titolo}</span>
                  {o.testo ? <span className="text-[13px] text-testo-2">{o.testo}</span> : null}
                  <span className="text-[13px] text-accento">Dal {leggi(o.dal)} al {leggi(o.al)}</span>
                </span>
                <button type="button" aria-label={`Togli l'offerta ${o.titolo}`} className="grid size-10 shrink-0 place-items-center rounded-xl text-testo-2 hover:bg-superficie-2 hover:text-testo" onClick={async () => { setInvio(true); esito(await togliOfferta(o.id, id), "Offerta tolta."); }}>
                  <Icona nome="chiudi" size={18} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-testo-2">Nessuna offerta in corso.</p>
        )}
        {pro.offerte.length < 3 ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
            <input aria-label="Titolo dell'offerta" maxLength={80} value={nuova.titolo} onChange={(e) => setNuova({ ...nuova, titolo: e.target.value })} placeholder="Titolo, es. Menu del giorno a 12 €" className={`h-12 ${CAMPO} bg-fondo`} />
            <input aria-label="Dettagli dell'offerta" maxLength={300} value={nuova.testo} onChange={(e) => setNuova({ ...nuova, testo: e.target.value })} placeholder="Dettagli (facoltativo)" className={`h-12 ${CAMPO} bg-fondo`} />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-[13px] text-testo-2">Dal<input type="date" value={nuova.dal} onChange={(e) => setNuova({ ...nuova, dal: e.target.value })} className={`h-11 ${CAMPO} bg-fondo`} /></label>
              <label className="flex flex-col gap-1 text-[13px] text-testo-2">Al<input type="date" value={nuova.al} onChange={(e) => setNuova({ ...nuova, al: e.target.value })} className={`h-11 ${CAMPO} bg-fondo`} /></label>
            </div>
            <PrimaryButton type="button" variante="secondario" className="w-fit" disabled={invio} onClick={async () => {
              setInvio(true);
              const r = await salvaOfferta(id, { id: null, ...nuova, titolo: nuova.titolo.trim(), testo: nuova.testo.trim() });
              if (!r.errore) setNuova({ titolo: "", testo: "", dal: oggi(), al: oggi() });
              esito(r, "Offerta aggiunta.");
            }}>
              Aggiungi l&apos;offerta
            </PrimaryButton>
            <p className="text-xs text-testo-2">Al massimo 3 offerte in corso o in arrivo, ognuna lunga fino a 3 mesi.</p>
          </div>
        ) : null}
      </div>

      <Link href={`/profile/attivita/${id}/numeri`} className="flex w-fit items-center gap-1 text-[15px] font-medium text-accento">
        I numeri della scheda <Icona nome="avanti" size={16} />
      </Link>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {ok ? <p role="status" className="rounded-xl bg-accento-tenue px-4 py-3 text-sm text-accento">{ok}</p> : null}
    </section>
  );
}
