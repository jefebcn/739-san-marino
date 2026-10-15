"use client";

import { useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { numeriScheda, type Numero } from "../api";

const VOCI: { tipo: string; nome: string }[] = [
  { tipo: "visita", nome: "Aperture della scheda" },
  { tipo: "telefono", nome: "Tocchi su Chiama" },
  { tipo: "indicazioni", nome: "Tocchi su Indicazioni" },
  { tipo: "sito", nome: "Tocchi sul sito" },
  { tipo: "email", nome: "Tocchi sull'email" },
  { tipo: "menu", nome: "Tocchi su Menu" },
  { tipo: "prenota", nome: "Tocchi su Prenota" },
];

/** 739 Pro: quante volte la scheda è stata aperta e cosa hanno toccato, negli ultimi 30 e 7 giorni. Solo totali. */
export default function NumeriAttivita({ id }: { id: string }) {
  const { stato } = useSessione();
  const [numeri, setNumeri] = useState<Numero[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (stato !== "connesso") return;
    numeriScheda(id).then((r) => {
      setNumeri(r.numeri);
      setErrore(r.errore);
    });
  }, [id, stato]);

  if (stato === "caricamento" || (stato === "connesso" && !numeri && !errore)) {
    return <div className="h-72 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  }
  if (stato !== "connesso") {
    return <PrimaryButton href={`/profile?torna=${encodeURIComponent(`/profile/attivita/${id}/numeri`)}`} className="w-fit">Entra con il tuo SMR ID</PrimaryButton>;
  }
  if (errore) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] leading-relaxed">{errore}</p>
        <PrimaryButton href={`/profile/attivita/${id}`} variante="secondario" className="w-fit">Torna alla scheda</PrimaryButton>
      </div>
    );
  }

  const di = (tipo: string) => numeri?.find((n) => n.tipo === tipo);
  const voci = VOCI.filter((v) => v.tipo === "visita" || di(v.tipo));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-5 px-4 text-[13px] text-testo-2">
        <span />
        <span className="w-14 text-right">30 giorni</span>
        <span className="w-14 text-right">7 giorni</span>
      </div>
      <ul className="divide-y divide-linea rounded-2xl bg-superficie">
        {voci.map((v) => (
          <li key={v.tipo} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-5 px-4 py-3.5">
            <span className={`text-[15px] ${v.tipo === "visita" ? "font-semibold" : ""}`}>{v.nome}</span>
            <span className="w-14 text-right font-mono text-[17px] font-medium">{di(v.tipo)?.totale ?? 0}</span>
            <span className="w-14 text-right font-mono text-[15px] font-medium text-testo-2">{di(v.tipo)?.ultimi7 ?? 0}</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] leading-relaxed text-testo-2">Contiamo solo i totali di ogni giorno: un&apos;apertura per telefono e sessione, nessun dato su chi ha guardato. I numeri partono dal giorno in cui è attivo il conteggio.</p>
    </div>
  );
}
