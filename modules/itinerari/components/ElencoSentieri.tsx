"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icona } from "@/components/Icona";
import type { Lingua } from "@/lib/lingua";

export type RigaSentiero = {
  slug: string;
  numero: string | null;
  nome: string;
  percorso: string | null;
  km: string;
  dislivello: number | null;
  tempo: string;
  fascia: "breve" | "media" | "lunga";
  anello: boolean;
  segnalato: false | null;
  castelli: number[];
};
type Castello = { id: number; nome: string; colore: string };

type Filtro = "tutti" | "breve" | "media" | "lunga" | "anello";

const T = {
  it: {
    filtri: { tutti: "Tutti", breve: "Fino a 1,5 km", media: "1,5-3 km", lunga: "Oltre 3 km", anello: "Ad anello" },
    castello: "Castello", tutti: "Tutti i castelli", uno: "sentiero", molti: "sentieri", dislivello: "m di dislivello", circa: "circa",
    anello: "Ad anello", nonSegnalato: "Non segnalato", nessuno: "Nessun sentiero con questi filtri.",
  },
  en: {
    filtri: { tutti: "All", breve: "Up to 1.5 km", media: "1.5-3 km", lunga: "Over 3 km", anello: "Loops" },
    castello: "Castle", tutti: "All castles", uno: "trail", molti: "trails", dislivello: "m climb", circa: "about",
    anello: "Loop", nonSegnalato: "Not waymarked", nessuno: "No trails match these filters.",
  },
};

/** L'elenco dei sentieri con i filtri per lunghezza, anelli e castello; i nomi dei sentieri restano come su OSM */
export default function ElencoSentieri({ sentieri, castelli, lingua = "it", base = "/uscire/itinerari" }: { sentieri: RigaSentiero[]; castelli: Castello[]; lingua?: Lingua; base?: string }) {
  const t = T[lingua];
  const it = lingua === "it" ? undefined : "it";
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [castello, setCastello] = useState<number | null>(null);

  const lista = useMemo(
    () => sentieri.filter((s) => (filtro === "tutti" || (filtro === "anello" ? s.anello : s.fascia === filtro)) && (castello === null || s.castelli.includes(castello))),
    [sentieri, filtro, castello],
  );
  const chip = (attivo: boolean) => `h-10 shrink-0 rounded-xl px-4 text-[14px] font-medium transition-colors ${attivo ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <div className="-mx-[var(--lato)] flex gap-2 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
          {(Object.keys(t.filtri) as Filtro[]).map((f) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={chip(filtro === f)}>{t.filtri[f]}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[14px] text-testo-2">
          {t.castello}
          <select value={castello ?? ""} onChange={(e) => setCastello(e.target.value ? Number(e.target.value) : null)} className="h-10 rounded-xl border border-linea bg-superficie px-3 text-[14px] text-testo">
            <option value="">{t.tutti}</option>
            {castelli.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      </div>

      <p className="text-[13px] text-testo-2" aria-live="polite">
        <b className="font-mono font-medium text-testo">{lista.length}</b> {lista.length === 1 ? t.uno : t.molti}
      </p>

      {lista.length ? (
        <ul className="grid gap-2.5">
          {lista.map((s) => (
            <li key={s.slug}>
              <Link prefetch={false} href={`${base}/${s.slug}`} className="flex h-full items-start gap-3.5 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2 active:scale-[0.99]">
                <span className="taglio-piccolo voce-logo flex h-9 min-w-11 shrink-0 items-center justify-center bg-metallo text-[16px] text-su-accento">{s.numero ?? "-"}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span lang={it} className="text-[16px] font-semibold leading-snug">{s.nome}</span>
                  {s.percorso ? <span className="line-clamp-1 text-[13px] text-testo-2">{s.percorso}</span> : null}
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[13px]">
                    <span className="font-mono font-medium">{s.km}</span>
                    {s.dislivello !== null ? <span className="font-mono text-testo-2">{s.dislivello} {t.dislivello}</span> : null}
                    <span className="text-testo-2">{t.circa} {s.tempo}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-testo-2">
                    {s.castelli.map((id) => {
                      const c = castelli.find((x) => x.id === id);
                      return c ? <span key={id} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: c.colore }} />{c.nome}</span> : null;
                    })}
                    {s.anello ? <span>{t.anello}</span> : null}
                    {s.segnalato === false ? <span className="font-medium text-testo">{t.nonSegnalato}</span> : null}
                  </span>
                </span>
                <span className="mt-2 shrink-0 text-testo-2"><Icona nome="avanti" size={16} /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">{t.nessuno}</p>
      )}
    </div>
  );
}
