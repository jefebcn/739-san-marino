import Link from "next/link";
import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import Condividi from "@/components/Condividi";
import { Icona } from "@/components/Icona";
import { getClassifica } from "@/lib/data";
import { metadatiCondivisione } from "@/lib/condivisione";
import Iscrizione from "@/modules/volontari/components/Iscrizione";
import { getChiamata } from "@/modules/volontari/dati";
import { quando } from "@/modules/volontari/api";

export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = /^[0-9a-f-]{36}$/.test(id) ? await getChiamata(id) : null;
  if (!c) return { title: "Cercano volontari · 739 San Marino" };
  return metadatiCondivisione({ titolo: c.titolo, descrizione: `${c.luogo} cerca volontari: ${quando(c.inizio, c.fine)}. ${c.descrizione}`, percorso: `/comunita/volontari/${c.id}` });
}

/** Una chiamata di volontari: cosa, quando, dove, chi la fa, e l'iscrizione */
export default async function PaginaChiamata({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [c, castelli] = await Promise.all([getChiamata(id), getClassifica()]);
  if (!c) notFound();
  const castello = castelli.find((x) => x.id === c.castello_id);
  return (
    <>
      <TestaPagina href="/comunita/volontari" verso="Cercano volontari" titolo={c.titolo}>
        <p className="sottotitolo">{quando(c.inizio, c.fine)}</p>
      </TestaPagina>
      <section className="flex flex-col gap-5">
        <p className="whitespace-pre-line text-[16px] leading-relaxed">{c.descrizione}</p>
        <dl className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie text-[15px]">
          <div className="flex gap-4 px-4 py-3"><dt className="w-28 shrink-0 text-testo-2">Chi la fa</dt><dd><Link href={`/luoghi/${c.luogo_id}`} className="font-medium text-accento underline-offset-2 hover:underline">{c.luogo}</Link></dd></div>
          <div className="flex gap-4 px-4 py-3"><dt className="w-28 shrink-0 text-testo-2">Dove</dt><dd>{c.dove ?? c.indirizzo ?? "Nella sede dell'associazione"}</dd></div>
          {castello ? <div className="flex gap-4 px-4 py-3"><dt className="w-28 shrink-0 text-testo-2">Castello</dt><dd className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: castello.colore }} />{castello.nome}</dd></div> : null}
          <div className="flex gap-4 px-4 py-3"><dt className="w-28 shrink-0 text-testo-2">Persone</dt><dd><span className="font-mono">{c.iscritti}</span> iscritte su <span className="font-mono">{c.posti}</span></dd></div>
        </dl>
        <Iscrizione iniziale={c} />
        <Condividi titolo={c.titolo} testo={`${c.luogo} cerca volontari`} percorso={`/comunita/volontari/${c.id}`} />
        <p className="flex items-start gap-2 text-[13px] leading-relaxed text-testo-2">
          <span className="mt-0.5 shrink-0"><Icona nome="info" size={16} /></span>
          La chiamata la scrive l&apos;associazione, che ne risponde. Per domande sul turno contatta l&apos;associazione dalla sua scheda.
        </p>
      </section>
    </>
  );
}
