import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Testo from "@/components/Testo";
import { Icona } from "@/components/Icona";
import { TIPI, getContenuto } from "@/lib/contenuti";
import { CAMPI_LUOGO, getClassifica, etichettaGiorno, ora, type Luogo } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { metadatiCondivisione } from "@/lib/condivisione";
import Condividi from "@/components/Condividi";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

const giornoLungo = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/San_Marino" });

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const c = await getContenuto(slug);
  if (!c) return { title: "Storia · 739 San Marino" };
  return metadatiCondivisione({ titolo: c.titolo, descrizione: c.sommario ?? c.corpo, percorso: `/storie/${c.slug}`, tipo: "article" });
}

/** Luoghi ed eventi collegati a un contenuto, nell'ordine scelto dalla redazione. */
async function collegati(luoghi: string[], eventi: string[]) {
  const db = supabase();
  if (!db) return { luoghi: [] as Luogo[], eventi: [] as { id: string; titolo: string; inizio: string }[] };
  const [l, e] = await Promise.all([
    luoghi.length ? db.from("luoghi").select(CAMPI_LUOGO).in("id", luoghi) : Promise.resolve({ data: [] }),
    eventi.length ? db.from("eventi").select("id, titolo, inizio").in("id", eventi).eq("pubblicato", true) : Promise.resolve({ data: [] }),
  ]);
  const ordina = <T extends { id: string }>(righe: T[], ids: string[]) => ids.map((id) => righe.find((r) => r.id === id)).filter(Boolean) as T[];
  return {
    luoghi: ordina((l.data ?? []) as Luogo[], luoghi),
    eventi: ordina((e.data ?? []) as { id: string; titolo: string; inizio: string }[], eventi),
  };
}

export default async function Storia({ params }: Props) {
  const { slug } = await params;
  const c = await getContenuto(slug);
  if (!c) notFound();
  // Gli speciali hanno la loro pagina, con programma per giorno, mappa e parcheggi
  if (c.tipo === "speciale") redirect(`/speciali/${c.slug}`);
  const [extra, castelli] = await Promise.all([collegati(c.luoghi, c.eventi), getClassifica()]);
  const castello = castelli.find((x) => x.id === c.castello_id);
  const tipo = TIPI[c.tipo];

  return (
    <article className="flex flex-col gap-5">
      <Link href={`/rubriche?tipo=${c.tipo}`} className="-mb-1 flex w-fit items-center gap-1 text-sm font-medium text-accento">
        <Icona nome="freccia" size={16} /> {tipo.nome}
      </Link>

      {c.foto_url ? (
        <figure className="-mx-[var(--lato)] flex flex-col gap-1.5 sm:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.foto_url} alt="" className="aspect-[4/3] w-full bg-superficie object-cover sm:rounded-2xl" />
          {c.foto_credito ? <figcaption className="px-[var(--lato)] text-xs text-testo-2 sm:px-0">Foto: {c.foto_credito}</figcaption> : null}
        </figure>
      ) : null}

      <header className="flex flex-col gap-2.5">
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance]">{c.titolo}</h1>
        {c.sommario ? <p className="text-[17px] leading-snug text-testo-2">{c.sommario}</p> : null}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-testo-2">
          {c.pubblicato_il ? <span>{giornoLungo.format(new Date(c.pubblicato_il))}</span> : null}
          {castello ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: castello.colore }} />
              {castello.nome}
            </span>
          ) : null}
        </p>
      </header>

      {c.corpo.trim() ? <Testo>{c.corpo}</Testo> : null}

      <Condividi titolo={c.titolo} testo={c.sommario ?? undefined} percorso={`/storie/${c.slug}`} />

      {extra.eventi.length ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-tight">Gli eventi</h2>
          <ul className="divide-y divide-linea rounded-2xl bg-superficie">
            {extra.eventi.map((e) => (
              <li key={e.id}>
                <Link href={`/eventi/${e.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-superficie-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-medium leading-snug">{e.titolo}</span>
                    <span className="text-[13px] text-testo-2">{etichettaGiorno(e.inizio)} alle {ora(e.inizio)}</span>
                  </span>
                  <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {extra.luoghi.length ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-semibold tracking-tight">I luoghi</h2>
          <ul className="divide-y divide-linea rounded-2xl bg-superficie">
            {extra.luoghi.map((l) => (
              <li key={l.id}>
                <Link href={`/luoghi/${l.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-superficie-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-medium leading-snug">{l.nome}</span>
                    {l.indirizzo ? <span className="text-[13px] text-testo-2">{l.indirizzo}</span> : null}
                  </span>
                  <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {c.fonte_nome ? (
        <p className="border-t border-linea pt-4 text-[13px] text-testo-2">
          Fonte: {c.fonte_link ? <a href={c.fonte_link} target="_blank" rel="noopener" className="underline">{c.fonte_nome}</a> : c.fonte_nome}
        </p>
      ) : null}
    </article>
  );
}
