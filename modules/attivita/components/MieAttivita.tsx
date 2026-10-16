"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { mieAttivita, mieProposte, type MiaAttivita, type MiaProposta } from "../api";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { oggiSM, TIPI_SCADENZA, type Scadenza } from "@/modules/lavorare/scadenze";

const giornoBreve = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "UTC" });

/** Per chi gestisce un'attività: le prossime scadenze e gli strumenti di Lavorare, in un posto solo */
function PerLaTuaAttivita() {
  const [prossime, setProssime] = useState<Scadenza[]>([]);
  useEffect(() => {
    supabaseBrowser().from("scadenze").select("id, tipo, titolo, giorno, fonte_nome, fonte_link").eq("stato", "pubblicata").gte("giorno", oggiSM()).order("giorno").limit(3)
      .then(({ data }) => setProssime((data ?? []) as Scadenza[]));
  }, []);
  const STRUMENTI = [
    { href: "/lavorare/calendario-fiscale", titolo: "Calendario fiscale", riga: "IGR, ritenute, ISS e dichiarazioni" },
    { href: "/lavorare/scadenze", titolo: "Scadenze e novità", riga: "Nuove regole e servizi dello Stato" },
    { href: "/lavorare/fornitori", titolo: "Fornitori e preventivi", riga: "Trova chi ti serve e chiedi un preventivo" },
    { href: "/lavorare/bandi", titolo: "Bandi", riga: "Contributi e bandi aperti" },
    { href: "/lavorare/lavoro", titolo: "Offerte di lavoro", riga: "Le pubblichi dalla modifica della scheda" },
  ];
  return (
    <section className="flex flex-col gap-3" aria-labelledby="per-attivita">
      <h2 id="per-attivita" className="text-[17px] font-semibold tracking-tight">Per la tua attività</h2>
      {prossime.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {prossime.map((x) => (
            <li key={x.id}>
              <Link href="/lavorare/scadenze" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2">
                <span className="w-20 shrink-0 font-mono text-[13px] font-medium">{giornoBreve.format(new Date(`${x.giorno}T12:00:00Z`))}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[12px] text-testo-2">{TIPI_SCADENZA[x.tipo]}</span>
                  <span className="text-[14px] font-semibold leading-snug">{x.titolo}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {STRUMENTI.map((t) => (
          <Link key={t.href} href={t.href} className="flex flex-col gap-0.5 rounded-2xl bg-superficie p-3.5 transition-colors hover:bg-superficie-2">
            <span className="text-[14px] font-semibold leading-snug">{t.titolo}</span>
            <span className="text-[12px] leading-snug text-testo-2">{t.riga}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

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
  const [proposte, setProposte] = useState<MiaProposta[]>([]);

  useEffect(() => {
    if (stato !== "connesso") return;
    mieAttivita().then((r) => {
      setLista(r.attivita);
      setErrore(r.errore);
    });
    mieProposte().then((r) => setProposte(r.proposte));
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
  if (!lista?.length && !proposte.length) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-5">
        <p className="text-[15px] leading-relaxed">Non gestisci ancora nessuna scheda.</p>
        <p className="text-sm leading-relaxed text-testo-2">Se la tua attività è già in 739, apri la scheda e in fondo tocca «È la tua attività?». Se non c&apos;è, aggiungila: è gratis.</p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton href="/attivita/aggiungi" className="w-fit">Aggiungi la tua attività</PrimaryButton>
          <PrimaryButton href="/cerca" variante="secondario" className="w-fit">Cerca in 739</PrimaryButton>
        </div>
        <Link href="/attivita" className="flex w-fit items-center gap-1 text-sm font-semibold text-accento">Cosa offre 739 alle attività <Icona nome="avanti" size={14} /></Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {lista?.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {lista.map((a) => (
            <li key={a.id}>
              {/* Le schede che gestisci aprono il loro cruscotto; le altre la scheda pubblica */}
              <Link href={a.stato === "approvata" ? `/profile/attivita/${a.luogo_id}` : `/luoghi/${a.luogo_id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{a.nome}</span>
                  <span className={`text-[13px] ${a.stato === "approvata" ? "font-medium text-ok" : "text-testo-2"}`}>
                    {STATI[a.stato]}
                    {a.nota_redazione && a.stato !== "approvata" ? `: ${a.nota_redazione}` : ""}
                  </span>
                </span>
                {a.stato === "approvata" ? <span className="shrink-0 text-sm font-semibold">Gestisci</span> : null}
                <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {proposte.length ? (
        <section className="flex flex-col gap-2" aria-labelledby="titolo-proposte">
          <h2 id="titolo-proposte" className="text-[17px] font-semibold tracking-tight">Schede proposte</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {proposte.map((p) => (
              <li key={p.id} className="flex flex-col gap-0.5 px-4 py-3.5">
                <span className="truncate text-[15px] font-semibold">{p.nome}</span>
                <span className="text-[13px] text-testo-2">
                  {p.stato === "richiesta" ? "In verifica dalla redazione" : `Non approvata${p.nota_redazione ? `: ${p.nota_redazione}` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <PrimaryButton href="/attivita/aggiungi" variante="secondario" className="w-fit">Aggiungi un&apos;altra attività</PrimaryButton>
      {lista?.some((a) => a.stato === "approvata") ? <PerLaTuaAttivita /> : null}
    </div>
  );
}
