"use client";

import { useState } from "react";
import { Icona } from "./Icona";
import { CATEGORIE_NOTIZIE, type CategoriaNotizia, type NotiziaRTV } from "@/lib/notizie";

export type NotiziaConData = NotiziaRTV & { quando: string };

/** Una notizia: categoria e ora, titolo, sommario; si apre l'articolo su sanmarinortv.sm */
export function RigaNotizia({ n, sommario = true }: { n: NotiziaConData; sommario?: boolean }) {
  return (
    <a href={n.link} target="_blank" rel="noopener" className="flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-superficie-2">
      <span className="text-[13px] text-testo-2">
        <span className="font-medium text-accento">{n.nomeCategoria}</span>, {n.quando}
      </span>
      <span className="text-[15px] font-semibold leading-snug">{n.titolo}</span>
      {sommario && n.sommario ? <span className="line-clamp-2 text-sm leading-relaxed text-testo-2">{n.sommario}</span> : null}
    </a>
  );
}

/** L'elenco della pagina Notizie, con i filtri per categoria */
export default function ElencoNotizie({ notizie }: { notizie: NotiziaConData[] }) {
  const [scelta, setScelta] = useState<CategoriaNotizia | "tutte">("tutte");
  const visibili = scelta === "tutte" ? notizie : notizie.filter((n) => n.categoria === scelta);
  const presenti = CATEGORIE_NOTIZIE.filter((c) => notizie.some((n) => n.categoria === c.slug));
  return (
    <div className="flex flex-col gap-4">
      <div className="chips" role="group" aria-label="Categorie">
        <button type="button" className="chip" aria-pressed={scelta === "tutte"} onClick={() => setScelta("tutte")}>Tutte</button>
        {presenti.map((c) => (
          <button key={c.slug} type="button" className="chip" aria-pressed={scelta === c.slug} onClick={() => setScelta(c.slug)}>{c.nome}</button>
        ))}
      </div>
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {visibili.map((n) => (
          <li key={n.link}><RigaNotizia n={n} /></li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-[13px] text-testo-2">
        <Icona nome="stampa" size={16} /> Ogni notizia si apre sul sito di San Marino RTV.
      </p>
    </div>
  );
}
