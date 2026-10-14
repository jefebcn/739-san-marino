"use client";

import { useEffect, useRef, useState } from "react";
import { Icona } from "@/components/Icona";
import { EtichetteScala, Scala } from "@/components/Quota";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { LIVELLI, livello } from "@/lib/quota";
import { useSessione } from "@/modules/core/store";
import Tano, { POSA_DI_LIVELLO } from "@/components/Tano";
import { faiCheckin, type EsitoCheckin } from "../api";

/**
 * Il check-in di un evento: arriva dal QR stampato (/eventi/<id>/checkin?c=<codice>).
 * Senza accesso porta all'SMR ID e poi torna qui; con l'accesso registra e mostra i metri e il livello.
 */
export default function Checkin({ evento, titolo }: { evento: string; titolo: string }) {
  const { stato } = useSessione();
  const [esito, setEsito] = useState<EsitoCheckin | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [qui, setQui] = useState("");
  const fatto = useRef(false);

  useEffect(() => setQui(window.location.pathname + window.location.search), []);

  useEffect(() => {
    if (stato !== "connesso" || fatto.current) return;
    fatto.current = true;
    const codice = new URLSearchParams(window.location.search).get("c") ?? "";
    faiCheckin(evento, codice).then((r) => {
      setEsito(r.esito);
      setErrore(r.errore ?? (r.esito ? null : "Il check-in non è andato. Riprova tra poco."));
    });
  }, [stato, evento]);

  if (stato === "caricamento" || (stato === "connesso" && !esito && !errore)) {
    return <div className="h-72 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Registro il check-in" />;
  }

  if (stato === "ospite") {
    return (
      <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5">
        <span className="grid size-12 place-items-center rounded-xl bg-accento-tenue text-accento"><Icona nome="qr" size={26} /></span>
        <h1 className="text-[24px] font-semibold leading-tight tracking-tight">Check-in a «{titolo}»</h1>
        <p className="text-[15px] leading-relaxed text-testo-2">I metri si guadagnano con il tuo SMR ID: entra o crealo in un minuto, poi torni qui e il check-in si registra da solo.</p>
        <PrimaryButton href={`/profile?torna=${encodeURIComponent(qui)}`}>Entra con SMR ID</PrimaryButton>
      </section>
    );
  }

  if (errore || !esito) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5" role="alert">
        <span className="grid size-12 place-items-center rounded-xl bg-segnale/12 text-segnale"><Icona nome="allerta" size={26} /></span>
        <h1 className="text-[24px] font-semibold leading-tight tracking-tight">Check-in non registrato</h1>
        <p className="text-[15px] leading-relaxed text-testo-2">{errore}</p>
        <PrimaryButton variante="interno" href={`/eventi/${evento}`}>Torna all&apos;evento</PrimaryButton>
      </section>
    );
  }

  const { attuale, prossimo, mancano } = livello(esito.totale);
  const prima = esito.nuovo ? esito.totale - esito.metri : esito.totale;
  // Livello appena raggiunto con questo check-in
  const salito = esito.nuovo ? LIVELLI.find((l) => l.da > 0 && prima < l.da && esito.totale >= l.da) : undefined;

  return (
    <section className="pannello topo flex flex-col gap-5" role="status" aria-live="polite">
      <div className="flex flex-col gap-1">
        <span className="text-sm" style={{ color: "var(--pannello-testo)" }}>{esito.nuovo ? "Check-in fatto" : "Avevi già fatto check-in"}</span>
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-white">{esito.titolo}</h1>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="quota-num">
          {esito.nuovo ? `+${esito.metri}` : esito.totale}
          <small>m</small>
        </span>
        {/* Check-in fatto: Tano esulta; se si sale di livello, la posa del nuovo livello */}
        {esito.nuovo ? <Tano posa={salito ? POSA_DI_LIVELLO[salito.nome] : "esulta"} priority className="-mb-2 h-36 w-auto" /> : null}
      </div>
      <p className="text-[15px]" style={{ color: "var(--pannello-testo)" }}>
        {esito.nuovo ? (
          <>La tua quota è <b className="font-mono font-medium text-white">{esito.totale} m</b>, e i metri contano anche per il tuo castello.</>
        ) : (
          <>I metri di un evento contano una volta sola. La tua quota è <b className="font-mono font-medium text-white">{esito.totale} m</b>.</>
        )}
      </p>
      <div style={{ color: "var(--pannello-testo)" }}>
        <Scala metri={esito.totale} grande />
        <EtichetteScala />
      </div>
      <p className="text-[15px] text-white">
        {salito ? <>Sei salito a <b>{salito.nome}</b>. </> : <>Sei a <b>{attuale.nome}</b>. </>}
        {prossimo ? <span style={{ color: "var(--pannello-testo)" }}>Mancano <b className="font-mono font-medium text-white">{mancano} m</b> a {prossimo.nome}.</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton href="/profile">La tua quota</PrimaryButton>
        <PrimaryButton variante="fantasma" href={`/eventi/${evento}`}>Torna all&apos;evento</PrimaryButton>
      </div>
    </section>
  );
}
