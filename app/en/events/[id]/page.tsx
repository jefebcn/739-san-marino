import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvento, linkCalendario, linkIndicazioni, ora } from "@/lib/data";
import { Icona } from "@/components/Icona";
import Condividi from "@/components/Condividi";
import { giornoEn, metaEn } from "@/lib/lingua";
import { traduci } from "@/lib/traduci";

export const revalidate = 60;

// Come /eventi/[id]: si crea alla prima visita e resta in cache
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

/** «Today at 21:00», «Saturday 24 October at 21:00» */
const quando = (iso: string) => `${giornoEn(iso)} at ${ora(iso)}`;

/** Il contatto dell'organizzatore diventa un link: email, sito o telefono (come in /eventi/[id]) */
function linkContatto(c: string) {
  const t = c.trim();
  if (/^\S+@\S+\.\S+$/.test(t)) return { href: `mailto:${t}`, testo: t };
  if (/^https?:\/\//.test(t)) return { href: t, testo: t.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") };
  if (/^[+\d][\d\s./-]{5,}$/.test(t)) return { href: `tel:${t.replace(/[^\d+]/g, "")}`, testo: t };
  return { href: null, testo: t };
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const e = await getEvento(id);
  if (!e) return { title: "Event · 739 San Marino" };
  const dove = e.luogo?.nome ?? e.indirizzo;
  return metaEn(e.titolo, `${quando(e.inizio)}${dove ? `, ${dove}` : ""}, San Marino.`, `/eventi/${e.id}`, `/en/events/${e.id}`);
}

/** Un evento in inglese: date, orari e etichette tradotti; titolo e descrizione restano come li ha scritti chi organizza */
export default async function Event({ params }: Props) {
  const { id } = await params;
  const e = await getEvento(id);
  if (!e) notFound();

  const colore = e.castello?.colore ?? "#3F3F46";
  const contatto = e.contatto ? linkContatto(e.contatto) : null;

  return (
    <>
      {e.foto_url ? (
        <figure className="flex flex-col gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.foto_url} alt={e.titolo} className="aspect-[16/10] w-full rounded-2xl bg-superficie object-cover" />
          {e.foto_credito ? <figcaption className="text-xs text-testo-2">Photo: {e.foto_credito}</figcaption> : null}
        </figure>
      ) : null}
      <section className="copertina topo" style={{ background: `linear-gradient(160deg, #141416 55%, ${colore})` }}>
        <Link href="/en/events" className="indietro"><Icona nome="freccia" size={18} /> What&apos;s on</Link>
        <span className="meta">{quando(e.inizio)}</span>
        <h1 className="titolo" lang="it">{e.titolo}</h1>
        {e.castello ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="metri" style={{ background: "rgba(255,255,255,.14)", color: "#FFFFFF" }}>{e.castello.nome}</span>
          </div>
        ) : null}
      </section>

      {e.descrizione ? <p className="descrizione" lang="it">{e.descrizione}</p> : null}

      <section className="dati">
        <div>
          <Icona nome="orologio" />
          <span><b>{quando(e.inizio)}</b><span className="meta">{e.fine ? `until ${ora(e.fine)}` : "Start time"}</span></span>
        </div>
        {e.luogo ? (
          <div>
            <Icona nome="pin" />
            <span><b>{e.luogo.nome}</b><Link prefetch={false} href={`/en/map?luogo=${e.luogo.id}`} className="meta" style={{ color: "var(--accento)" }}>See on the map</Link></span>
          </div>
        ) : null}
        {!e.luogo && e.indirizzo ? (
          <div>
            <Icona nome="pin" />
            <span><b>Where</b><span className="meta">{e.indirizzo}</span></span>
          </div>
        ) : null}
        {e.per_chi ? (
          <div>
            <Icona nome="comunita" />
            <span><b>For</b><span className="meta">{traduci(e.per_chi)}</span></span>
          </div>
        ) : null}
        {e.prezzo ? (
          <div>
            <Icona nome="bandi" />
            <span><b>Price</b><span className="meta">{traduci(e.prezzo)}</span></span>
          </div>
        ) : null}
        {e.organizzatore ? (
          <div>
            <Icona nome="persona" />
            <span><b>Organised by</b><span className="meta">{e.organizzatore}</span></span>
          </div>
        ) : null}
        {contatto ? (
          <div>
            <Icona nome="telefono" />
            <span>
              <b>Information</b>
              {contatto.href ? (
                <a href={contatto.href} className="meta break-all" style={{ color: "var(--accento)" }} target={contatto.href.startsWith("http") ? "_blank" : undefined} rel="noopener">{contatto.testo}</a>
              ) : (
                <span className="meta">{contatto.testo}</span>
              )}
            </span>
          </div>
        ) : null}
      </section>

      <section className="azioni">
        <a href={linkCalendario(e)} target="_blank" rel="noopener" className="bottone secondario premibile">
          <Icona nome="calendario" size={20} /> Add to calendar
        </a>
        {e.luogo ? (
          <a href={linkIndicazioni(e.luogo.lat, e.luogo.lng)} target="_blank" rel="noopener" className="bottone secondario premibile">
            <Icona nome="indicazioni" size={20} /> Directions
          </a>
        ) : null}
        <Condividi titolo={e.titolo} testo={`${e.titolo}, ${quando(e.inizio)}, on 739`} percorso={`/en/events/${e.id}`} lingua="en" />
      </section>

      {e.fonte ? (
        <footer className="border-t border-linea pt-4">
          <p className="text-[13px] text-testo-2">
            Source: {e.link_fonte ? <a href={e.link_fonte} target="_blank" rel="noopener" className="underline">{e.fonte}</a> : e.fonte}
          </p>
        </footer>
      ) : null}
    </>
  );
}
