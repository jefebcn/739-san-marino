"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { RUOLI, mieAziende, type MiaAzienda } from "../api";
import { ModuloAzienda } from "./DatiAzienda";
import { ERRORE } from "./Guscio";

/** /neonup: le mie aziende, o la prima da creare; per chi non è entrato, l'invito a entrare */
export default function Ingresso() {
  const { stato } = useSessione();
  const router = useRouter();
  const [aziende, setAziende] = useState<MiaAzienda[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [nuova, setNuova] = useState(false);

  useEffect(() => {
    if (stato === "connesso") mieAziende().then((r) => { setAziende(r.aziende); setErrore(r.errore); });
  }, [stato]);

  if (stato === "caricamento" || (stato === "connesso" && aziende === null && !errore)) return <div className="h-40 animate-pulse rounded-2xl bg-superficie" />;
  if (stato === "ospite") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] leading-relaxed">Entra con l&apos;SMR ID per creare l&apos;azienda o aprire quelle in cui lavori.</p>
        <PrimaryButton href="/profile?torna=/neonup">Entra con SMR ID</PrimaryButton>
      </div>
    );
  }
  if (errore) return <p role="alert" className={ERRORE}>{errore}</p>;

  const crea = nuova || !aziende?.length;
  return (
    <section className="flex flex-col gap-4" aria-labelledby="t-aziende">
      <h2 id="t-aziende" className="text-[19px] font-semibold tracking-tight">{aziende?.length ? "Le tue aziende" : "Crea la tua azienda"}</h2>
      {aziende?.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {aziende.map((a) => (
            <li key={a.id}>
              <Link href={`/neonup/${a.id}`} className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-superficie-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[16px] font-semibold">{a.denominazione}</span>
                  <span className="text-[13px] text-testo-2">{RUOLI[a.ruolo]}{a.cod_oe ? `, COE ${a.cod_oe}` : ", senza codice operatore"}</span>
                </span>
                <Icona nome="avanti" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {crea ? (
        <div className="rounded-2xl border border-linea p-5">
          <ModuloAzienda id={null} onSalvata={(id) => router.push(`/neonup/${id}`)} />
        </div>
      ) : (
        <button type="button" onClick={() => setNuova(true)} className="w-fit text-[14px] font-semibold text-accento">Aggiungi un&apos;altra azienda</button>
      )}
    </section>
  );
}
