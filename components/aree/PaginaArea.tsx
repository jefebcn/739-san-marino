import Link from "next/link";
import type { ReactNode } from "react";
import { Icona } from "@/components/Icona";
import { area as trovaArea, type Sezione, type SlugArea } from "@/lib/aree";

/** Le sezioni attive in griglia: icona, nome, lo stato di adesso (o la riga), freccia */
function Griglia({ sezioni, stato, etichetta }: { sezioni: Sezione[]; stato: Record<string, ReactNode>; etichetta: string }) {
  return (
    // Su computer 3 colonne; 2 quando le sezioni sono 2 o 4, così nessuna resta sola in una riga
    <div className={`flex flex-col gap-2 lg:grid lg:gap-3 ${sezioni.length === 2 || sezioni.length === 4 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`} aria-label={etichetta}>
      {sezioni.map((s) => (
        <Link
          key={s.slug}
          id={s.slug}
          href={s.href!}
          className="flex items-center gap-3.5 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2 active:scale-[0.99]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fondo text-testo">
            <Icona nome={s.icona} size={28} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold leading-snug">{s.nome}</span>
            <span className="text-sm leading-snug text-testo-2">{stato[s.slug] ?? s.descrizione}</span>
          </span>
          <span className="shrink-0 text-testo-2"><Icona nome="avanti" size={18} /></span>
        </Link>
      ))}
    </div>
  );
}

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
  // Le aree con i gruppi (Lavorare) mostrano le sezioni sotto il titolo del loro gruppo, nell'ordine di lib/aree.ts
  const gruppi = attive.some((s) => s.gruppo)
    ? attive.reduce<{ nome: string; sezioni: Sezione[] }[]>((acc, s) => {
        const nome = s.gruppo ?? "Altro";
        const g = acc.find((x) => x.nome === nome);
        if (g) g.sezioni.push(s);
        else acc.push({ nome, sezioni: [s] });
        return acc;
      }, [])
    : null;

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <Link href="/esplora" className="mb-1 flex w-fit items-center gap-1 text-sm font-medium text-accento lg:hidden">
          <Icona nome="freccia" size={16} /> Esplora
        </Link>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{a.nome}</h1>
        <p className="text-[15px] text-testo-2">{a.descrizione}</p>
      </section>

      {testa}

      {gruppi ? (
        gruppi.map((g, i) => (
          <section key={g.nome} className="larga flex flex-col gap-3" aria-labelledby={`gruppo-${i}`}>
            <h2 id={`gruppo-${i}`} className="text-[19px] font-semibold tracking-tight">{g.nome}</h2>
            <Griglia sezioni={g.sezioni} stato={stato} etichetta={g.nome} />
          </section>
        ))
      ) : (
        <section className="larga" aria-label={`Sezioni di ${a.nome}`}>
          <Griglia sezioni={attive} stato={stato} etichetta={`Sezioni di ${a.nome}`} />
        </section>
      )}

      {coda}

      {inArrivo.length ? (
        <section className="flex flex-col gap-3" aria-label="In arrivo">
          <h2 className="text-[19px] font-semibold tracking-tight">In arrivo</h2>
          <ul className="divide-y divide-linea rounded-2xl border border-linea lg:grid lg:grid-cols-3 lg:gap-3 lg:divide-y-0 lg:border-0">
            {inArrivo.map((s) => (
              <li key={s.slug} id={s.slug} className="flex items-start gap-3 px-4 py-3.5 lg:rounded-2xl lg:border lg:border-linea">
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
