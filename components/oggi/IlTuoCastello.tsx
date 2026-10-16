"use client";

import Link from "next/link";
import { Icona } from "@/components/Icona";
import { ScegliCastello, useCastelloScelto } from "@/components/Castello";
import { EmblemaCastello } from "@/components/LogoCastello";
import { RaccoltaBreve } from "@/components/Raccolta";
import { useSessione } from "@/modules/core/store";
import { inCorso, type Avviso } from "@/lib/avvisi";
import type { Castello } from "@/lib/data";
import type { Raccolta } from "@/lib/servizi";

const fmt = new Intl.NumberFormat("it-IT");

/**
 * In Oggi, la fascia personale. Chi arriva sceglie il castello (l'unica cosa che 739 gli chiede);
 * chi l'ha scelto vede la sua scheda: posizione e metri, raccolta di domani, avvisi del castello.
 * Le due versioni stanno nella pagina insieme e le sceglie il CSS (`data-utente`), così non lampeggiano.
 */
export default function IlTuoCastello({ castelli, raccolta, avvisi }: { castelli: Castello[]; raccolta: Raccolta[]; avvisi: Avviso[] }) {
  const slug = useCastelloScelto();
  const profilo = useSessione((s) => s.profilo);
  const pos = castelli.findIndex((c) => c.slug === slug);
  const c = castelli[pos];
  const qualcunoHaMetri = castelli.some((x) => (x.metri ?? 0) > 0);
  const suoi = c ? avvisi.filter((a) => inCorso(a) && a.castello_id === c.id).length : 0;

  return (
    <>
      <section id="castello" className="per-nuovi flex scroll-mt-4 flex-col gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight">Qual è il tuo castello?</h2>
        <p className="-mt-1 text-sm text-testo-2">Sceglilo e Oggi ti mostra la raccolta dei rifiuti e gli avvisi di casa tua. Lo cambi quando vuoi dal menu in alto.</p>
        <ScegliCastello castelli={castelli} fila />
      </section>

      <section className="per-tornati flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[19px] font-semibold tracking-tight">Il tuo castello</h2>
          <Link href="/castelli" className="flex items-center gap-0.5 text-sm font-medium text-testo-2 hover:text-testo">
            Classifica <Icona nome="avanti" size={14} />
          </Link>
        </div>
        {c ? (
          <div className="flex flex-col overflow-hidden rounded-2xl bg-superficie">
            <Link href={`/castelli/${c.slug}`} className="flex items-center gap-3.5 p-4 transition-colors hover:bg-superficie-2">
              <EmblemaCastello c={c} className="size-14" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[17px] font-semibold">{c.nome}</span>
                <span className="text-[13px] text-testo-2">
                  {qualcunoHaMetri ? <><b className="font-mono font-medium text-testo">{pos + 1}°</b> dei nove, <span className="font-mono">{fmt.format(c.metri ?? 0)}</span> m</> : "Ogni metro guadagnato porta su il tuo castello"}
                </span>
              </span>
              <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
            </Link>
            <div className="grid grid-cols-2 divide-x divide-linea border-t border-linea">
              <Link href="/utili/rifiuti" className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-superficie-2">
                <span className="text-[13px] text-testo-2">Rifiuti domani</span>
                <span className="text-[15px] font-semibold leading-snug"><RaccoltaBreve raccolta={raccolta} castelli={castelli} compatto /></span>
              </Link>
              <Link href="/vivere/avvisi" className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-superficie-2">
                <span className="text-[13px] text-testo-2">Avvisi del castello</span>
                <span className="text-[15px] font-semibold leading-snug">{suoi ? `${suoi} in corso` : "Nessuno"}</span>
              </Link>
            </div>
            {/* L'SMR ID si propone qui, con calma: dopo il castello, non prima */}
            {profilo ? null : (
              <Link href="/profile" className="flex items-center gap-2 border-t border-linea px-4 py-3 text-sm font-medium text-accento transition-colors hover:bg-superficie-2">
                Crea il tuo SMR ID: i metri che guadagni vanno a {c.nome} <Icona nome="avanti" size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="h-[150px] animate-pulse rounded-2xl bg-superficie" aria-hidden="true" />
        )}
      </section>
    </>
  );
}
