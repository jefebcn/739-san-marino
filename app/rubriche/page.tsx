import Link from "next/link";
import { TIPI, TIPI_ORDINE, getContenuti, type TipoContenuto } from "@/lib/contenuti";

export const revalidate = 300;

export const metadata = { title: "Rubriche · 739 San Marino" };

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });

type Props = { searchParams: Promise<{ tipo?: string }> };

/** Archivio dei contenuti della redazione, per rubrica. */
export default async function Rubriche({ searchParams }: Props) {
  const { tipo: richiesto } = await searchParams;
  const tipo = TIPI_ORDINE.includes(richiesto as TipoContenuto) ? (richiesto as TipoContenuto) : undefined;
  const contenuti = await getContenuti({ tipo, limite: 60 });

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{tipo ? TIPI[tipo].nome : "Rubriche"}</h1>
        <p className="text-[15px] text-testo-2">{tipo ? TIPI[tipo].riga : "Quello che la redazione di 739 racconta ogni settimana."}</p>
      </section>

      <nav aria-label="Rubriche" className="-mx-[var(--lato)] flex gap-2 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none]">
        <Link href="/rubriche" aria-current={!tipo ? "page" : undefined} className="h-10 shrink-0 content-center rounded-xl bg-superficie px-3.5 text-sm font-medium text-testo-2 aria-[current=page]:bg-testo aria-[current=page]:text-fondo">
          Tutte
        </Link>
        {TIPI_ORDINE.map((t) => (
          <Link key={t} href={`/rubriche?tipo=${t}`} aria-current={tipo === t ? "page" : undefined} className="h-10 shrink-0 content-center rounded-xl bg-superficie px-3.5 text-sm font-medium text-testo-2 aria-[current=page]:bg-testo aria-[current=page]:text-fondo">
            {TIPI[t].nome}
          </Link>
        ))}
      </nav>

      {contenuti.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">
          {tipo ? "Ancora niente in questa rubrica: i primi numeri arrivano presto." : "Le rubriche partono presto: il Bollettino ogni mattina, il castello della settimana ogni lunedì, il weekend dalla vetta ogni giovedì."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {contenuti.map((c) => (
            <li key={c.id}>
              <Link href={`/storie/${c.slug}`} className="flex gap-3.5 rounded-2xl bg-superficie p-3.5 transition-colors hover:bg-superficie-2">
                {c.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.foto_url} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl bg-fondo object-cover" />
                ) : null}
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[13px] text-testo-2">
                    {TIPI[c.tipo].nome}
                    {c.pubblicato_il ? `, ${giorno.format(new Date(c.pubblicato_il))}` : ""}
                  </span>
                  <span className="text-[16px] font-semibold leading-snug">{c.titolo}</span>
                  {c.sommario ? <span className="line-clamp-2 text-sm text-testo-2">{c.sommario}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
