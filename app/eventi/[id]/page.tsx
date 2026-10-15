import Link from "next/link";
import { notFound } from "next/navigation";
import { formatData, getEvento, linkCalendario, linkIndicazioni, ora } from "@/lib/data";
import { Icona } from "@/components/Icona";
import SegnalaErrore from "@/components/SegnalaErrore";
import QrCheckin from "@/modules/eventi/components/QrCheckin";
import { metadatiCondivisione } from "@/lib/condivisione";
import Condividi from "@/components/Condividi";

export const revalidate = 60;

// Nessuna pagina pronta alla build: si crea alla prima visita e poi resta in cache (ISR) fino al revalidate
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

/** Il contatto dell'organizzatore diventa un link: email, sito o telefono */
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
  if (!e) return { title: "Evento · 739 San Marino" };
  const dove = e.luogo?.nome ?? e.indirizzo;
  return metadatiCondivisione({
    titolo: e.titolo,
    descrizione: `${formatData(e.inizio).replace(" · ", " alle ").replace(/^./, (x) => x.toUpperCase())}${dove ? `, ${dove}` : ""}. ${e.descrizione ?? ""}`,
    percorso: `/eventi/${e.id}`,
  });
}

export default async function DettaglioEvento({ params }: Props) {
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
          {e.foto_credito ? <figcaption className="text-xs text-testo-2">Foto: {e.foto_credito}</figcaption> : null}
        </figure>
      ) : null}
      <section className="copertina topo" style={{ background: `linear-gradient(160deg, #141416 55%, ${colore})` }}>
        <Link href="/eventi" className="indietro"><Icona nome="freccia" size={18} /> Eventi</Link>
        <span className="meta">{formatData(e.inizio)}</span>
        <h1 className="titolo">{e.titolo}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="metri" style={{ background: "rgba(201,164,92,.22)", color: "var(--ottone-chiaro)" }}>+{e.metri} m al check-in</span>
          {e.castello ? <span className="metri" style={{ background: "rgba(255,255,255,.14)", color: "#FFFFFF" }}>{e.castello.nome}</span> : null}
        </div>
      </section>

      {e.descrizione ? <p className="descrizione">{e.descrizione}</p> : null}

      <section className="dati">
        <div>
          <Icona nome="orologio" />
          <span><b>{formatData(e.inizio)}</b><span className="meta">{e.fine ? `fino alle ${ora(e.fine)}` : "Orario di inizio"}</span></span>
        </div>
        {e.luogo ? (
          <div>
            <Icona nome="pin" />
            <span><b>{e.luogo.nome}</b><Link prefetch={false} href={`/mappa?luogo=${e.luogo.id}`} className="meta" style={{ color: "var(--accento)" }}>Vedi sulla mappa</Link></span>
          </div>
        ) : null}
        {!e.luogo && e.indirizzo ? (
          <div>
            <Icona nome="pin" />
            <span><b>Dove</b><span className="meta">{e.indirizzo}</span></span>
          </div>
        ) : null}
        {e.per_chi ? (
          <div>
            <Icona nome="comunita" />
            <span><b>Per chi</b><span className="meta">{e.per_chi}</span></span>
          </div>
        ) : null}
        {e.prezzo ? (
          <div>
            <Icona nome="bandi" />
            <span><b>Prezzo</b><span className="meta">{e.prezzo}</span></span>
          </div>
        ) : null}
        {e.organizzatore ? (
          <div>
            <Icona nome="persona" />
            <span><b>Organizza</b><span className="meta">{e.organizzatore}</span></span>
          </div>
        ) : null}
        {contatto ? (
          <div>
            <Icona nome="telefono" />
            <span>
              <b>Informazioni</b>
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
        {e.metri > 0 ? (
          <div className="flex items-start gap-3 rounded-2xl bg-accento-tenue p-4">
            <span className="mt-0.5 text-accento"><Icona nome="qr" size={22} /></span>
            <p className="text-sm leading-relaxed text-testo">
              <b className="font-semibold">+{e.metri} m con il check-in.</b> All&apos;evento inquadra con la fotocamera il QR di 739: i metri vanno a te e al tuo castello.
            </p>
          </div>
        ) : null}
        <a href={linkCalendario(e)} target="_blank" rel="noopener" className="bottone secondario premibile">
          <Icona nome="calendario" size={20} /> Aggiungi al calendario
        </a>
        {e.luogo ? (
          <a href={linkIndicazioni(e.luogo.lat, e.luogo.lng)} target="_blank" rel="noopener" className="bottone secondario premibile">
            <Icona nome="indicazioni" size={20} /> Indicazioni
          </a>
        ) : null}
        <Condividi titolo={e.titolo} testo={`${e.titolo}, ${formatData(e.inizio).replace(" · ", " alle ")} su 739`} percorso={`/eventi/${e.id}`} />
      </section>

      <QrCheckin evento={e.id} titolo={e.titolo} />

      <footer className="flex flex-col gap-2 border-t border-linea pt-4">
        {e.fonte ? (
          <p className="text-[13px] text-testo-2">
            Fonte: {e.link_fonte ? <a href={e.link_fonte} target="_blank" rel="noopener" className="underline">{e.fonte}</a> : e.fonte}
          </p>
        ) : null}
        <SegnalaErrore evento={e.id} />
      </footer>
    </>
  );
}
