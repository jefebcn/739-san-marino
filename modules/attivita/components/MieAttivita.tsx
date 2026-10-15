"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { mieAttivita, type MiaAttivita } from "../api";

const STATI: Record<MiaAttivita["stato"], string> = {
  richiesta: "In verifica dalla redazione",
  approvata: "La gestisci tu",
  rifiutata: "Non approvata",
  revocata: "Non la gestisci più",
};

/** Le schede che ho chiesto o che gestisco: da qui si apre la modifica. */
export default function MieAttivita() {
  const { stato } = useSessione();
  const [lista, setLista] = useState<MiaAttivita[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (stato !== "connesso") return;
    mieAttivita().then((r) => {
      setLista(r.attivita);
      setErrore(r.errore);
    });
  }, [stato]);

  if (stato === "caricamento" || (stato === "connesso" && !lista && !errore)) {
    return <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  }
  if (stato !== "connesso") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-testo-2">Per vedere le tue attività entra con il tuo SMR ID.</p>
        <PrimaryButton href="/profile?torna=%2Fprofile%2Fattivita" className="w-fit">Entra</PrimaryButton>
      </div>
    );
  }
  if (errore) return <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p>;
  if (!lista?.length) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] leading-relaxed">Non gestisci ancora nessuna scheda.</p>
        <p className="text-sm leading-relaxed text-testo-2">Cerca il tuo locale o negozio in 739, apri la scheda e in fondo tocca «È la tua attività?».</p>
        <PrimaryButton href="/uscire/mangiare" variante="secondario" className="w-fit">Cerca la tua attività</PrimaryButton>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
      {lista.map((a) => (
        <li key={a.id} className="flex items-center gap-3 px-4 py-3.5">
          <Link href={`/luoghi/${a.luogo_id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{a.nome}</span>
            <span className={`text-[13px] ${a.stato === "approvata" ? "text-accento" : "text-testo-2"}`}>
              {STATI[a.stato]}
              {a.nota_redazione && a.stato !== "approvata" ? `: ${a.nota_redazione}` : ""}
            </span>
          </Link>
          {a.stato === "approvata" ? (
            <Link href={`/profile/attivita/${a.luogo_id}`} aria-label={`Modifica ${a.nome}`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-fondo text-testo transition-colors hover:bg-superficie-2">
              <Icona nome="modifica" size={18} />
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
