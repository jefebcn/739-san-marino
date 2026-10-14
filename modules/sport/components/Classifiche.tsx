"use client";

import { useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import type { Castello } from "@/lib/data";
import { useSessione } from "@/modules/core/store";
import { classificaCastelli, classificaSport } from "../api";
import type { RigaCastello, RigaClassifica } from "../tipi";

export default function Classifiche({ sport, castelli }: { sport: string; castelli: Castello[] }) {
  const stato = useSessione((s) => s.stato);
  const [giocatori, setGiocatori] = useState<RigaClassifica[] | null>(null);
  const [perCastello, setPerCastello] = useState<RigaCastello[] | null>(null);

  useEffect(() => {
    if (stato === "caricamento") return;
    let attivo = true;
    setGiocatori(null);
    setPerCastello(null);
    classificaCastelli(sport).then((r) => attivo && setPerCastello(r.righe));
    if (stato === "connesso") classificaSport(sport).then((r) => attivo && setGiocatori(r.righe));
    else setGiocatori([]);
    return () => {
      attivo = false;
    };
  }, [sport, stato]);

  const castello = (id: number | null) => castelli.find((c) => c.id === id);

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Giocatori</h2>
          <span className="text-sm text-testo-2">rating Glicko-2</span>
        </div>
        {stato !== "connesso" ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-linea p-5">
            <p className="text-sm text-testo-2">La classifica dei giocatori è visibile a chi ha un SMR ID.</p>
            <PrimaryButton href="/profile" dimensione="sm" variante="secondario">Accedi</PrimaryButton>
          </div>
        ) : !giocatori ? (
          <div className="h-40 animate-pulse rounded-2xl bg-superficie" />
        ) : giocatori.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-linea p-5 text-sm text-testo-2">Ancora nessuna partita registrata in questo sport: la classifica parte con la prima.</p>
        ) : (
          <ol className="overflow-hidden rounded-2xl border border-linea">
            {giocatori.map((g) => (
              <li key={g.posizione} className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-linea px-4 py-3 last:border-b-0 ${g.sono_io ? "bg-accento-tenue" : ""}`}>
                <span className={`font-mono text-sm font-bold ${g.posizione <= 3 ? "text-accento" : "text-testo-2"}`}>{g.posizione}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: castello(g.castello_id)?.colore ?? "#52525B" }} />
                  <span className="truncate text-[15px] font-medium">{g.nome}{g.sono_io ? " (tu)" : ""}</span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-[15px] font-semibold">{Math.round(g.rating)}</span>
                  <span className="block font-mono text-[10.5px] text-testo-2">{g.vittorie}/{g.partite} vinte</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Castelli</h2>
        {!perCastello ? (
          <div className="h-32 animate-pulse rounded-2xl bg-superficie" />
        ) : perCastello.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-linea p-5 text-sm text-testo-2">I castelli entrano in classifica con le prime vittorie dei loro giocatori.</p>
        ) : (
          <ol className="overflow-hidden rounded-2xl border border-linea">
            {perCastello.map((r, i) => (
              <li key={r.castello_id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-linea px-4 py-3 last:border-b-0">
                <span className="font-mono text-sm font-bold text-testo-2">{i + 1}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: castello(r.castello_id)?.colore }} />
                  <span className="truncate text-[15px] font-medium">{castello(r.castello_id)?.nome}</span>
                </span>
                <span className="text-right font-mono text-xs text-testo-2">
                  <span className="block text-[15px] font-semibold text-testo">{r.vittorie} vittorie</span>
                  {r.giocatori} giocatori, media {Math.round(r.rating_medio)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
