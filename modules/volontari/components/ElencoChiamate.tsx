"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { useSessione } from "@/modules/core/store";
import { chiamate as leggiChiamate, mieiTurni, quando, type Chiamata, type Turno } from "../api";

type Castello = { id: number; nome: string; colore: string };
const STATO_TURNO: Record<Turno["stato"], string> = { iscritto: "Iscritto", ritirato: "Ritirato", presente: "C'eri", assente: "Non risulti presente" };

/** Le chiamate di volontari aperte; con l'SMR ID anche i miei turni */
export default function ElencoChiamate({ iniziali, castelli }: { iniziali: Chiamata[]; castelli: Castello[] }) {
  const { stato } = useSessione();
  const [lista, setLista] = useState(iniziali);
  const [turni, setTurni] = useState<Turno[]>([]);

  useEffect(() => {
    if (stato !== "connesso") return;
    leggiChiamate().then((r) => { if (!r.errore) setLista(r.chiamate); });
    mieiTurni().then((r) => setTurni(r.turni));
  }, [stato]);

  const prossimi = turni.filter((t) => t.stato === "iscritto" && Date.parse(t.fine) > Date.now() && t.stato_chiamata !== "annullata");
  const passati = turni.filter((t) => t.stato === "presente" || t.stato === "assente");

  return (
    <div className="flex flex-col gap-6">
      {prossimi.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="t-turni">
          <h2 id="t-turni" className="text-[19px] font-semibold tracking-tight">I tuoi turni</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-[#09090B] text-white">
            {prossimi.map((t) => (
              <li key={t.chiamata_id}>
                <Link href={`/comunita/volontari/${t.chiamata_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold">{t.titolo}</span>
                    <span className="text-[13px] text-zinc-400">{t.luogo}, {quando(t.inizio, t.fine)}</span>
                  </span>
                  <Icona nome="avanti" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lista.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.map((c) => {
            const castello = castelli.find((x) => x.id === c.castello_id);
            const liberi = Math.max(0, c.posti - c.iscritti);
            return (
              <li key={c.id}>
                <Link prefetch={false} href={`/comunita/volontari/${c.id}`} className="flex h-full flex-col gap-2 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[17px] font-semibold leading-snug">{c.titolo}</span>
                    {c.mio_stato === "iscritto" ? <span className="shrink-0 rounded-md bg-metallo px-2 py-0.5 text-[12px] font-semibold text-su-accento">Ci sei</span> : null}
                  </span>
                  <span className="text-[14px]">{c.luogo}</span>
                  <span className="text-[13px] text-testo-2">{quando(c.inizio, c.fine)}{c.dove ? `, ${c.dove}` : ""}</span>
                  <span className="line-clamp-2 text-[14px] leading-snug text-testo-2">{c.descrizione}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[13px]">
                    {castello ? <span className="flex items-center gap-1.5 text-testo-2"><span className="size-2 rounded-full" style={{ background: castello.colore }} />{castello.nome}</span> : null}
                    <span className={liberi ? "font-medium" : "text-testo-2"}><b className="font-mono font-medium">{liberi}</b> {liberi === 1 ? "posto libero" : "posti liberi"} su {c.posti}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] leading-relaxed text-testo-2">
          Adesso nessuna associazione cerca volontari. Le chiamate arrivano dalle associazioni che gestiscono la loro scheda su 739.
        </p>
      )}

      {passati.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="t-fatti">
          <h2 id="t-fatti" className="text-[19px] font-semibold tracking-tight">I turni che hai fatto</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {passati.map((t) => (
              <li key={t.chiamata_id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                <span className="min-w-0"><b className="font-semibold">{t.titolo}</b>, {t.luogo}</span>
                <span className="shrink-0 text-testo-2">{t.stato === "presente" && t.metri ? <span className="metri">+{t.metri} m</span> : STATO_TURNO[t.stato]}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
