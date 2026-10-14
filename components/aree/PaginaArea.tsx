import Link from "next/link";
import type { ReactNode } from "react";
import { Icona } from "@/components/Icona";
import { area as trovaArea, type SlugArea } from "@/lib/aree";

/**
 * Pagina di un'area: le sezioni attive con il loro stato di adesso, poi quelle in arrivo
 * con una riga su cosa conterranno. `stato` dà il testo vivo di una sezione (es. «3 farmacie aperte»).
 */
export default function PaginaArea({
  slug,
  stato = {},
  testa,
  coda,
}: {
  slug: SlugArea;
  stato?: Record<string, ReactNode>;
  /** Contenuto subito sotto il titolo (es. i numeri di emergenza in Vivere) */
  testa?: ReactNode;
  /** Contenuto dopo le sezioni attive */
  coda?: ReactNode;
}) {
  const a = trovaArea(slug);
  if (!a) return null;
  const attive = a.sezioni.filter((s) => s.href);
  const inArrivo = a.sezioni.filter((s) => !s.href);

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <Link href="/esplora" className="mb-1 flex w-fit items-center gap-1 text-sm font-medium text-accento">
          <Icona nome="freccia" size={16} /> Esplora
        </Link>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{a.nome}</h1>
        <p className="text-[15px] text-testo-2">{a.descrizione}</p>
      </section>

      {testa}

      <section className="flex flex-col gap-2" aria-label={`Sezioni di ${a.nome}`}>
        {attive.map((s) => (
          <Link
            key={s.slug}
            id={s.slug}
            href={s.href!}
            className="flex items-center gap-3.5 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2 active:scale-[0.99]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fondo text-testo">
              <Icona nome={s.icona} size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold leading-snug">{s.nome}</span>
              <span className="text-sm leading-snug text-testo-2">{stato[s.slug] ?? s.descrizione}</span>
            </span>
            <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
          </Link>
        ))}
      </section>

      {coda}

      {inArrivo.length ? (
        <section className="flex flex-col gap-3" aria-label="In arrivo">
          <h2 className="text-[19px] font-semibold tracking-tight">In arrivo</h2>
          <ul className="divide-y divide-linea rounded-2xl border border-linea">
            {inArrivo.map((s) => (
              <li key={s.slug} id={s.slug} className="flex items-start gap-3 px-4 py-3.5">
                <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome={s.icona} size={20} /></span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-medium leading-snug">{s.nome}</span>
                  <span className="text-[13px] leading-snug text-testo-2">{s.descrizione}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
