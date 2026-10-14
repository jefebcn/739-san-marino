import Link from "next/link";
import { notFound } from "next/navigation";
import { formatData, getEvento, linkCalendario, linkIndicazioni, ora } from "@/lib/data";
import { Icona } from "@/components/Icona";
import { Cime } from "@/components/Logo";
import SegnalaErrore from "@/components/SegnalaErrore";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const e = await getEvento(id);
  return { title: e ? `${e.titolo} · 739 San Marino` : "Evento · 739 San Marino" };
}

export default async function DettaglioEvento({ params }: Props) {
  const { id } = await params;
  const e = await getEvento(id);
  if (!e) notFound();

  const colore = e.castello?.colore ?? "#3F3F46";

  return (
    <>
      <section className="copertina topo" style={{ background: `linear-gradient(160deg, #141416 55%, ${colore})` }}>
        <Link href="/eventi" className="indietro"><Icona nome="freccia" size={18} /> Eventi</Link>
        <span className="meta">{formatData(e.inizio)}</span>
        <h1 className="titolo">{e.titolo}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="metri" style={{ background: "rgba(201,164,92,.22)", color: "var(--ottone-chiaro)" }}>+{e.metri} m al check-in</span>
          {e.castello ? <span className="metri" style={{ background: "rgba(255,255,255,.14)", color: "#FFFFFF" }}>{e.castello.nome}</span> : null}
        </div>
        <span style={{ position: "absolute", right: -12, bottom: -8, opacity: 0.16 }}><Cime width={170} /></span>
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
            <span><b>{e.luogo.nome}</b><Link href={`/mappa?luogo=${e.luogo.id}`} className="meta" style={{ color: "var(--accento)" }}>Vedi sulla mappa</Link></span>
          </div>
        ) : null}
        {e.organizzatore ? (
          <div>
            <Icona nome="persona" />
            <span><b>Organizza</b><span className="meta">{e.organizzatore}</span></span>
          </div>
        ) : null}
      </section>

      <section className="azioni">
        <button type="button" className="bottone primario" disabled>Fai check-in (+{e.metri} m)</button>
        <p className="nota">Il check-in si attiva con l&apos;accesso, in arrivo a breve.</p>
        <a href={linkCalendario(e)} target="_blank" rel="noopener" className="bottone secondario premibile">
          <Icona nome="calendario" size={20} /> Aggiungi al calendario
        </a>
        {e.luogo ? (
          <a href={linkIndicazioni(e.luogo.lat, e.luogo.lng)} target="_blank" rel="noopener" className="bottone secondario premibile">
            <Icona nome="indicazioni" size={20} /> Indicazioni
          </a>
        ) : null}
      </section>

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
