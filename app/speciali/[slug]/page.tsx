import Link from "next/link";
import { notFound } from "next/navigation";
import Testo from "@/components/Testo";
import EventoRiga from "@/components/EventoRiga";
import MappaPunti, { type Punto } from "@/components/MappaPunti";
import { Icona } from "@/components/Icona";
import { RigaAvviso } from "@/components/Avvisi";
import { CATEGORIE, chiaveGiorno, etichettaGiorno, getClassifica } from "@/lib/data";
import { getSpeciale, perGiorno, testoPeriodo } from "@/lib/speciali";
import { metadatiCondivisione } from "@/lib/condivisione";
import Condividi from "@/components/Condividi";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const s = await getSpeciale(slug);
  if (!s) return { title: "Speciale · 739 San Marino" };
  return metadatiCondivisione({ titolo: s.contenuto.titolo, descrizione: s.contenuto.sommario ?? s.contenuto.corpo, percorso: `/speciali/${s.contenuto.slug}`, tipo: "article" });
}

const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Titolo({ children, nota }: { children: React.ReactNode; nota?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-[21px] font-semibold tracking-tight">{children}</h2>
      {nota ? <p className="text-[13px] text-testo-2">{nota}</p> : null}
    </div>
  );
}

/**
 * Uno speciale (Natale delle Meraviglie, Giornate Medievali, 3 settembre): introduzione, avvisi del periodo,
 * programma giorno per giorno, mappa dei luoghi, parcheggi e navette. La struttura è la stessa per ogni occasione.
 */
export default async function PaginaSpeciale({ params }: Props) {
  const { slug } = await params;
  const [s, castelli] = await Promise.all([getSpeciale(slug), getClassifica()]);
  if (!s) notFound();
  const c = s.contenuto;
  const giorni = perGiorno(s.eventi);
  const oggi = chiaveGiorno(new Date().toISOString());
  // Il programma parte da oggi; i giorni già passati restano in fondo, più chiari
  const daOggi = giorni.filter(([k]) => k >= oggi);
  const passati = giorni.filter(([k]) => k < oggi);

  // Sulla mappa: i luoghi collegati e quelli degli eventi, una volta sola
  const punti: Punto[] = [];
  const visti = new Set<string>();
  for (const l of s.luoghi) {
    if (visti.has(l.id)) continue;
    visti.add(l.id);
    punti.push({ id: l.id, nome: l.nome, lat: l.lat, lng: l.lng, categoria: l.categoria, href: `/luoghi/${l.id}` });
  }
  for (const e of s.eventi) {
    if (!e.luogo || visti.has(e.luogo.id)) continue;
    visti.add(e.luogo.id);
    punti.push({ id: e.luogo.id, nome: e.luogo.nome, lat: e.luogo.lat, lng: e.luogo.lng, categoria: "luogo", href: `/luoghi/${e.luogo.id}` });
  }
  if (s.parcheggiScelti) for (const p of s.parcheggi) punti.push({ id: p.id, nome: p.nome, lat: p.lat, lng: p.lng, categoria: p.categoria, href: `/luoghi/${p.id}` });

  return (
    <article className="flex flex-col gap-7">
      <Link href="/rubriche?tipo=speciale" className="-mb-3 flex w-fit items-center gap-1 text-sm font-medium text-accento">
        <Icona nome="freccia" size={16} /> Speciali
      </Link>

      <header className="flex flex-col gap-4">
        {c.foto_url ? (
          <figure className="-mx-[var(--lato)] flex flex-col gap-1.5 sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.foto_url} alt="" className="aspect-[4/3] w-full bg-superficie object-cover sm:rounded-2xl" />
            {c.foto_credito ? <figcaption className="px-[var(--lato)] text-xs text-testo-2 sm:px-0">Foto: {c.foto_credito}</figcaption> : null}
          </figure>
        ) : null}
        <div className="flex flex-col gap-2.5">
          {s.periodo ? <p className="text-[15px] font-medium text-accento">{maiuscola(testoPeriodo(s.periodo))}</p> : null}
          <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance]">{c.titolo}</h1>
          {c.sommario ? <p className="text-[17px] leading-snug text-testo-2">{c.sommario}</p> : null}
        </div>
        {/* Scorciatoie alle sezioni della pagina */}
        <nav aria-label="In questa pagina" className="flex flex-wrap gap-2">
          {[
            giorni.length ? ["#programma", "Programma"] : null,
            punti.length ? ["#mappa", "Mappa"] : null,
            ["#parcheggi", "Parcheggi e navette"],
            s.avvisi.length ? ["#avvisi", `Avvisi (${s.avvisi.length})`] : null,
          ]
            .filter((x): x is string[] => Boolean(x))
            .map(([href, nome]) => (
              <a key={href} href={href} className="rounded-xl bg-superficie px-3.5 py-2 text-sm font-medium transition-colors hover:bg-superficie-2">{nome}</a>
            ))}
        </nav>
        <Condividi titolo={c.titolo} testo={c.sommario ?? undefined} percorso={`/speciali/${c.slug}`} />
      </header>

      {c.corpo.trim() ? <Testo>{c.corpo}</Testo> : null}

      {giorni.length ? (
        <section id="programma" className="flex scroll-mt-20 flex-col gap-4">
          <Titolo nota={`${s.eventi.length} ${s.eventi.length === 1 ? "evento" : "eventi"}, con i metri del check-in`}>Il programma</Titolo>
          {[...daOggi, ...passati].map(([k, evs]) => (
            <div key={k} className={`flex flex-col gap-2 ${k < oggi ? "opacity-60" : ""}`}>
              <h3 className={`text-[15px] font-semibold ${k === oggi ? "text-accento" : ""}`}>
                {maiuscola(etichettaGiorno(evs[0].inizio))}
                {k === oggi && etichettaGiorno(evs[0].inizio) !== "Oggi" ? <span className="ml-2 rounded-md bg-accento-tenue px-1.5 py-0.5 text-xs font-medium text-accento">Oggi</span> : null}
                {k < oggi ? <span className="ml-2 text-xs font-normal text-testo-2">già passato</span> : null}
              </h3>
              <div className="lista">{evs.map((e) => <EventoRiga key={e.id} e={e} />)}</div>
            </div>
          ))}
        </section>
      ) : (
        <p className="rounded-2xl bg-superficie p-4 text-[15px] text-testo-2">Il programma arriva presto: la redazione sta raccogliendo gli eventi.</p>
      )}

      {punti.length ? (
        <section id="mappa" className="flex scroll-mt-20 flex-col gap-3">
          <Titolo nota="Tocca un punto per aprire la scheda. Con due dita sposti la mappa.">Dove</Titolo>
          <MappaPunti punti={punti} etichetta={`Mappa dei luoghi di ${c.titolo}`} />
          {s.luoghi.length ? (
            <ul className="divide-y divide-linea rounded-2xl bg-superficie">
              {s.luoghi.map((l) => (
                <li key={l.id}>
                  <Link href={`/luoghi/${l.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-superficie-2">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-medium leading-snug">{l.nome}</span>
                      <span className="text-[13px] text-testo-2">{l.indirizzo ?? CATEGORIE[l.categoria] ?? l.categoria}</span>
                    </span>
                    <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section id="parcheggi" className="flex scroll-mt-20 flex-col gap-3">
        <Titolo nota={s.parcheggiScelti ? "Scelti dalla redazione per questa occasione." : "I parcheggi del territorio: per arrivare in centro storico conviene la funivia da Borgo Maggiore."}>
          Parcheggi e navette
        </Titolo>
        <ul className="divide-y divide-linea rounded-2xl bg-superficie">
          {s.parcheggi.slice(0, s.parcheggiScelti ? 20 : 6).map((p) => (
            <li key={p.id}>
              <Link href={`/luoghi/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-superficie-2">
                <span className="text-testo-2"><Icona nome={p.categoria === "trasporti" ? "trasporti" : "parcheggio"} size={22} /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-medium leading-snug">{p.nome}</span>
                  <span className="text-[13px] text-testo-2">
                    {[p.posti ? `${p.posti} posti` : null, p.tariffa].filter(Boolean).join(", ") || (p.indirizzo ?? CATEGORIE[p.categoria])}
                  </span>
                </span>
                <span className="text-testo-2"><Icona nome="avanti" size={18} /></span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          <Link href="/utili/trasporti" className="text-accento">Funivia e bus, prossime partenze</Link>
          {s.parcheggiScelti ? null : <Link href="/utili/parcheggi" className="text-accento">Tutti i parcheggi</Link>}
        </div>
      </section>

      {s.avvisi.length ? (
        <section id="avvisi" className="flex scroll-mt-20 flex-col gap-3">
          <Titolo nota="Strade chiuse, servizi e cambi di programma nei giorni dello speciale.">Avvisi</Titolo>
          {s.avvisi.map((a) => <RigaAvviso key={a.id} a={a} castello={castelli.find((x) => x.id === a.castello_id)} />)}
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
