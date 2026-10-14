"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { mieiEventi, type MioEvento } from "../api";

const quando = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });

/** Gli eventi pubblicati da un organizzatore: prossimi e passati, con lo stato e il link per modificarli. */
export default function MieiEventi() {
  const [eventi, setEventi] = useState<MioEvento[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    mieiEventi().then((r) => {
      setEventi(r.eventi);
      setErrore(r.errore);
    });
  }, []);

  if (errore) return <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p>;
  if (!eventi) return <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;

  const adesso = Date.now();
  const prossimi = eventi.filter((e) => new Date(e.fine ?? e.inizio).getTime() >= adesso).reverse();
  const passati = eventi.filter((e) => new Date(e.fine ?? e.inizio).getTime() < adesso);

  const elenco = (lista: MioEvento[]) => (
    <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
      {lista.map((e) => (
        <li key={e.id} className="flex items-center gap-3 px-4 py-3.5">
          <Link href={`/eventi/${e.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{e.titolo}</span>
            <span className="text-[13px] text-testo-2">
              {quando.format(new Date(e.inizio))}
              {e.pubblicato ? "" : ", nascosto"}
            </span>
          </Link>
          <Link href={`/eventi/proponi?id=${e.id}`} aria-label={`Modifica ${e.titolo}`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-fondo text-testo transition-colors hover:bg-superficie-2">
            <Icona nome="modifica" size={18} />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-6">
      <PrimaryButton href="/eventi/proponi" icona={<Icona nome="piu" />} className="w-fit">Nuovo evento</PrimaryButton>
      {eventi.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Non hai ancora pubblicato eventi. Quelli che pubblichi compaiono qui, e da qui li modifichi.</p>
      ) : (
        <>
          {prossimi.length ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-[19px] font-semibold tracking-tight">In programma</h2>
              {elenco(prossimi)}
            </section>
          ) : null}
          {passati.length ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-[19px] font-semibold tracking-tight">Passati</h2>
              {elenco(passati)}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
