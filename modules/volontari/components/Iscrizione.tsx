"use client";

import { useCallback, useEffect, useState } from "react";
import AvvisiPersonali from "@/components/AvvisiPersonali";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Tano from "@/components/Tano";
import { CAMPO } from "@/modules/attivita/components/stile";
import { useSessione } from "@/modules/core/store";
import { METRI_MESE, METRI_TURNO, chiamata as leggiChiamata, iscriviti, ritirati, type DettaglioChiamata } from "../api";

/** Iscriversi a una chiamata di volontari (con l'SMR ID), o ritirarsi fino all'inizio */
export default function Iscrizione({ iniziale }: { iniziale: DettaglioChiamata }) {
  const { stato } = useSessione();
  const [c, setC] = useState(iniziale);
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const ricarica = useCallback(() => leggiChiamata(iniziale.id).then((r) => { if (r.chiamata) setC(r.chiamata); }), [iniziale.id]);
  useEffect(() => {
    if (stato === "connesso") ricarica();
  }, [stato, ricarica]);

  async function fai(azione: () => Promise<{ errore: string | null }>) {
    setInvio(true);
    setErrore(null);
    const r = await azione();
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    ricarica();
  }

  const cominciato = Date.parse(c.inizio) <= Date.now();
  const liberi = Math.max(0, c.posti - c.iscritti);
  const box = "flex flex-col gap-4 rounded-2xl bg-superficie p-5";

  if (c.stato === "annullata") return <p className={box}>L&apos;associazione ha annullato questo turno.</p>;
  if (c.mio_stato === "presente") return <div className={box} role="status"><Tano posa="esulta" className="h-28 w-auto" /><p className="text-[16px] font-semibold">C&apos;eri: grazie. I metri del turno sono nella tua quota.</p></div>;
  if (c.mio_stato === "iscritto") {
    return (
      <div className={box} role="status">
        <p className="text-[17px] font-semibold">Ci sei: ti aspettano.</p>
        <p className="text-[14px] leading-relaxed text-testo-2">L&apos;associazione vede il tuo nome, l&apos;email del tuo SMR ID e il telefono se l&apos;hai scritto. Dopo il turno segna chi c&apos;era e ti arrivano {METRI_TURNO} m.</p>
        <AvvisiPersonali compatto testo="Ti avvisiamo sul telefono se il turno viene annullato e quando arrivano i metri." />
        {!cominciato ? <button type="button" disabled={invio} onClick={() => fai(() => ritirati(c.id))} className="w-fit text-[14px] font-semibold text-segnale disabled:opacity-50">Non posso più venire</button> : null}
        {errore ? <p role="alert" className="text-sm text-segnale">{errore}</p> : null}
      </div>
    );
  }
  if (c.stato !== "aperta" || cominciato) return <p className={box}>Le iscrizioni sono chiuse: per dare una mano senti direttamente l&apos;associazione.</p>;
  if (!liberi) return <p className={box}>I posti sono finiti. Grazie lo stesso: tieni d&apos;occhio le prossime chiamate.</p>;
  if (stato === "ospite") {
    return (
      <div className={box}>
        <p className="text-[15px] leading-relaxed">Ci si iscrive con l&apos;SMR ID: l&apos;associazione sa chi viene, e dopo il turno ti arrivano {METRI_TURNO} m per te e il tuo castello.</p>
        <PrimaryButton href={`/profile?torna=/comunita/volontari/${c.id}`} className="w-fit">Entra con SMR ID</PrimaryButton>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); fai(() => iscriviti(c.id, telefono.trim(), nota.trim())); }} className={box}>
      <p className="text-[15px] leading-relaxed"><b className="font-mono font-medium">{liberi}</b> {liberi === 1 ? "posto libero" : "posti liberi"}. Dopo il turno l&apos;associazione segna chi c&apos;era: {METRI_TURNO} m a turno, al massimo {METRI_MESE} m al mese dal volontariato.</p>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium"><span>Telefono <span className="font-normal text-testo-2">(facoltativo, lo vede solo l&apos;associazione)</span></span>
        <input type="tel" inputMode="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="0549 123456" className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium"><span>Una nota <span className="font-normal text-testo-2">(facoltativa)</span></span>
        <input maxLength={200} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Arrivo alle 10, porto i guanti" className={`h-12 ${CAMPO}`} />
      </label>
      {errore ? <p role="alert" className="text-sm text-segnale">{errore}</p> : null}
      <PrimaryButton type="submit" disabled={invio || stato !== "connesso"} className="w-fit">{invio ? "Ti iscrivo…" : "Mi iscrivo"}</PrimaryButton>
    </form>
  );
}
