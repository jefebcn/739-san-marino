import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassifica, getEventi, getLuoghi, CATEGORIE } from "@/lib/data";
import EventoRiga from "@/components/EventoRiga";
import { Icona } from "@/components/Icona";
import { LogoCastello, haLogo } from "@/components/LogoCastello";
import { ritornoDiCategoria } from "@/lib/aree";

export const revalidate = 60;

// I nove castelli si preparano alla build e restano in cache (ISR)
export async function generateStaticParams() {
  return (await getClassifica()).map((c) => ({ slug: c.slug }));
}

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
  // La Giunta del castello (dati del portale gov.sm, arrivati dalla redazione)
  const giunta = luoghi.find((l) => l.categoria === "ufficio" && l.sottocategoria === "giunta di castello");
  // I luoghi del castello per tipo, con il numero: un elenco di centinaia di nomi non serve a nessuno
  const perCategoria = Object.entries(
    luoghi.filter((l) => l !== giunta).reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.categoria]: (acc[l.categoria] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);

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

      {giunta ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-semibold tracking-tight">La Giunta di castello</h2>
          <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
            {giunta.descrizione ? <p className="text-[15px] leading-relaxed">{giunta.descrizione}</p> : null}
            {giunta.indirizzo ? <p className="text-[13px] text-testo-2">{giunta.indirizzo}</p> : null}
            <div className="flex flex-wrap gap-2">
              {giunta.telefono ? (
                <a href={`tel:${giunta.telefono.replace(/[^+0-9]/g, "")}`} className="flex h-10 items-center gap-2 rounded-xl bg-fondo px-3 text-sm font-semibold transition-colors hover:bg-superficie-2">
                  <Icona nome="telefono" size={16} /> Chiama
                </a>
              ) : null}
              {giunta.email ? (
                <a href={`mailto:${giunta.email}`} className="flex h-10 items-center gap-2 rounded-xl bg-fondo px-3 text-sm font-semibold transition-colors hover:bg-superficie-2">
                  <Icona nome="email" size={16} /> Scrivi
                </a>
              ) : null}
              <Link prefetch={false} href={`/luoghi/${giunta.id}`} className="flex h-10 items-center gap-1 px-2 text-sm font-semibold text-accento">
                La scheda <Icona nome="avanti" size={16} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="sezione">
        <div className="sezione-head"><h2>Eventi a {c.nome}</h2></div>
        {eventi.length === 0 ? (
          <p className="vuoto">Nessun evento in programma qui per ora.</p>
        ) : (
          <div className="lista">{eventi.map((e) => <EventoRiga key={e.id} e={e} />)}</div>
        )}
      </section>

      <section className="sezione">
        <div className="sezione-head"><h2>Luoghi</h2><Link prefetch={false} href="/mappa">Mappa</Link></div>
        {perCategoria.length === 0 ? (
          <p className="vuoto">Nessun luogo segnato in questo castello per ora.</p>
        ) : (
          <ul className="divide-y divide-linea rounded-2xl bg-superficie">
            {perCategoria.map(([cat, n]) => (
              <li key={cat}>
                <Link prefetch={false} href={ritornoDiCategoria(cat).href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2">
                  <span className="flex-1 text-[15px] font-medium">{CATEGORIE[cat] ?? cat}</span>
                  <span className="font-mono text-sm font-medium text-testo-2">{n}</span>
                  <span className="text-testo-2"><Icona nome="avanti" size={16} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
