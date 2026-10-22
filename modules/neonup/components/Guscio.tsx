"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { TesseraNeonUp } from "@/components/MarchioNeonUp";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { mieAziende, vedeConti, type MiaAzienda } from "../api";

export const ERRORE = "rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale";

const Contesto = createContext<MiaAzienda | null>(null);
/** L'azienda aperta e il mio ruolo, dentro le pagine di NeonUp */
export const useAzienda = () => useContext(Contesto) as MiaAzienda;

export type Sezione = "cruscotto" | "documenti" | "ricevute" | "magazzino" | "contabilita" | "clienti" | "articoli" | "azienda";
const VOCI: { sezione: Sezione; nome: string; href: string }[] = [
  { sezione: "cruscotto", nome: "Cruscotto", href: "" },
  { sezione: "documenti", nome: "Documenti", href: "/documenti" },
  { sezione: "ricevute", nome: "Fatture ricevute", href: "/ricevute" },
  { sezione: "magazzino", nome: "Magazzino", href: "/magazzino" },
  { sezione: "contabilita", nome: "Contabilità", href: "/contabilita" },
  { sezione: "clienti", nome: "Clienti e fornitori", href: "/clienti" },
  { sezione: "articoli", nome: "Articoli", href: "/articoli" },
  { sezione: "azienda", nome: "Azienda", href: "/azienda" },
];

/** La cornice delle pagine di un'azienda: controlla l'accesso, mostra il nome e le sezioni */
export default function Guscio({ azienda, sezione, children }: { azienda: string; sezione: Sezione; children: React.ReactNode }) {
  const { stato } = useSessione();
  const [mia, setMia] = useState<MiaAzienda | null | undefined>(undefined);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (stato !== "connesso") return;
    mieAziende().then((r) => { setErrore(r.errore); setMia(r.aziende.find((a) => a.id === azienda) ?? null); });
  }, [stato, azienda]);

  if (stato === "caricamento" || (stato === "connesso" && mia === undefined && !errore)) return <div className="h-72 animate-pulse rounded-2xl bg-superficie" />;
  if (stato === "ospite") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-superficie p-5">
        <p className="text-[15px]">NeonUp si usa con l&apos;SMR ID dell&apos;azienda o di chi ci lavora.</p>
        <PrimaryButton href={`/profile?torna=${encodeURIComponent(`/neonup/${azienda}`)}`}>Entra con SMR ID</PrimaryButton>
      </div>
    );
  }
  if (errore) return <p role="alert" className={ERRORE}>{errore}</p>;
  if (!mia) return <p role="alert" className={ERRORE}>Non fai parte di questa azienda. Chiedi al titolare di aggiungerti con la tua tessera.</p>;

  return (
    <Contesto.Provider value={mia}>
      <div className="larga flex flex-col gap-6">
        <div className="flex flex-col gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href="/neonup" className="flex items-center gap-1.5 text-[14px] font-medium text-testo-2 hover:text-testo"><Icona nome="freccia" size={16} /> <TesseraNeonUp lato={22} /> NeonUp</Link>
            <h1 className="titolo !m-0 min-w-0 truncate text-[24px] lg:text-[30px]">{mia.denominazione}</h1>
            <Link href="/neonup/guida" className="ml-auto text-[14px] font-semibold text-testo-2 hover:text-testo">Come funziona</Link>
          </div>
          <nav aria-label="Sezioni dell'azienda" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {VOCI.filter((v) => v.sezione !== "contabilita" || vedeConti(mia.ruolo)).map((v) => (
              <Link key={v.sezione} href={`/neonup/${azienda}${v.href}`} aria-current={v.sezione === sezione ? "page" : undefined}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-[14px] font-medium transition-colors ${v.sezione === sezione ? "bg-[#09090B] text-white" : "bg-superficie text-testo hover:bg-superficie-2"}`}>
                {v.nome}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </Contesto.Provider>
  );
}
