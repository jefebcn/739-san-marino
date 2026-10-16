"use client";

import Link from "next/link";
import { useState } from "react";
import { Icona } from "@/components/Icona";
import { CONTRATTI, leggiGiorno, type OffertaLavoro } from "@/lib/lavoro";

/** Una offerta in un elenco: chi cercano, l'attività e il castello, contratto, orario e fino a quando resta online */
export function RigaOfferta({ o, castello }: { o: OffertaLavoro; castello?: string | null }) {
  return (
    <Link href={`/lavorare/lavoro/${o.id}`} prefetch={false} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[16px] font-semibold leading-snug">{o.titolo}</span>
        <span className="truncate text-[13px] text-testo-2">{[o.attivita, castello].filter(Boolean).join(", ")}</span>
        <span className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="rounded-md bg-fondo px-2 py-0.5 text-[12px] font-medium">{CONTRATTI[o.contratto]}</span>
          <span className="rounded-md bg-fondo px-2 py-0.5 text-[12px] font-medium">{o.orario === "part-time" ? "Part-time" : "Tempo pieno"}</span>
          <span className="px-1 py-0.5 text-[12px] text-testo-2">fino al {leggiGiorno(o.scadenza)}</span>
        </span>
      </span>
      <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
    </Link>
  );
}

const FILTRI: { id: string; nome: string; vale: (o: OffertaLavoro) => boolean }[] = [
  { id: "tutte", nome: "Tutte", vale: () => true },
  { id: "pieno", nome: "Tempo pieno", vale: (o) => o.orario === "tempo pieno" },
  { id: "part", nome: "Part-time", vale: (o) => o.orario === "part-time" },
  { id: "stagionale", nome: "Stagionali", vale: (o) => o.contratto === "stagionale" },
  { id: "stage", nome: "Stage e apprendistato", vale: (o) => o.contratto === "stage" || o.contratto === "apprendistato" },
];

/** L'elenco delle offerte aperte con i filtri (compaiono solo i filtri che trovano qualcosa) */
export default function ElencoOfferte({ offerte, castelli }: { offerte: OffertaLavoro[]; castelli: Record<number, string> }) {
  const [filtro, setFiltro] = useState("tutte");
  const filtri = FILTRI.filter((f) => f.id === "tutte" || offerte.some(f.vale));
  const scelto = FILTRI.find((f) => f.id === filtro) ?? FILTRI[0];
  const lista = offerte.filter(scelto.vale);
  return (
    <div className="flex flex-col gap-3">
      {filtri.length > 2 ? (
        <div className="chips" role="tablist" aria-label="Filtra le offerte">
          {filtri.map((f) => (
            <button key={f.id} type="button" role="tab" className="chip" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.nome}</button>
          ))}
        </div>
      ) : null}
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie lg:grid lg:grid-cols-2 lg:divide-y-0 lg:gap-px lg:bg-linea">
        {lista.map((o) => (
          <li key={o.id} className="bg-superficie">
            <RigaOfferta o={o} castello={o.castello_id ? castelli[o.castello_id] : null} />
          </li>
        ))}
      </ul>
    </div>
  );
}
