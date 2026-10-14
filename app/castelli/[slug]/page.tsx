import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassifica, getEventi, getLuoghi, CATEGORIE } from "@/lib/data";
import EventoRiga from "@/components/EventoRiga";
import { Icona } from "@/components/Icona";
import { LogoCastello, haLogo } from "@/components/LogoCastello";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const fmt = new Intl.NumberFormat("it-IT");

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const c = (await getClassifica()).find((x) => x.slug === slug);
  return { title: c ? `${c.nome} · 739 San Marino` : "Castello · 739 San Marino" };
}

export default async function Castello({ params }: Props) {
  const { slug } = await params;
  const classifica = await getClassifica();
  const posizione = classifica.findIndex((x) => x.slug === slug);
  const c = classifica[posizione];
  if (!c) notFound();

  const [eventi, luoghi] = await Promise.all([getEventi(20, c.id), getLuoghi(c.id)]);

  return (
    <>
      <section className={`copertina ${haLogo(c.slug) ? "bg-pannello" : "topo bg-pannello"}`}>
        <Link href="/castelli" className="indietro"><Icona nome="freccia" size={18} /> Castelli</Link>
        {haLogo(c.slug) ? (
          <>
            <LogoCastello c={c} className="mx-auto w-full max-w-[360px]" />
            <h1 className="titolo text-center">{c.nome}</h1>
          </>
        ) : (
          <>
            <span className="meta">Castello di San Marino</span>
            <h1 className="titolo">{c.nome}</h1>
          </>
        )}
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[44px] leading-none font-medium tracking-[-0.05em]">{posizione + 1}°</span>
          <span className="font-mono text-sm text-white/80">{fmt.format(c.metri ?? 0)} m in classifica</span>
        </div>
      </section>

      <section className="sezione">
        <div className="sezione-head"><h2>Eventi a {c.nome}</h2></div>
        {eventi.length === 0 ? (
          <p className="vuoto">Nessun evento in programma qui per ora.</p>
        ) : (
          <div className="lista">{eventi.map((e) => <EventoRiga key={e.id} e={e} />)}</div>
        )}
      </section>

      <section className="sezione">
        <div className="sezione-head"><h2>Luoghi</h2><Link href="/mappa">Mappa</Link></div>
        {luoghi.length === 0 ? (
          <p className="vuoto">Nessun luogo segnato in questo castello per ora.</p>
        ) : (
          <div className="lista">
            {luoghi.map((l) => (
              <Link key={l.id} href={`/luoghi/${l.id}`} className="luogo premibile">
                <Icona nome="pin" size={20} />
                <div style={{ minWidth: 0 }}>
                  <h3>{l.nome}</h3>
                  <div className="meta">{CATEGORIE[l.categoria] ?? l.categoria}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
