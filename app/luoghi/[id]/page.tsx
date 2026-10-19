import { notFound } from "next/navigation";
import Link from "next/link";
import Scheda from "@/components/Scheda";
import SegnalaErrore from "@/components/SegnalaErrore";
import { Icona } from "@/components/Icona";
import { CATEGORIE, getClassifica, getGestito, getLuogo, getPrenotaAperta, getPro, getSimili } from "@/lib/data";
import Simili from "@/components/luoghi/Simili";
import ContaScheda from "@/components/ContaScheda";
import GestisciScheda from "@/components/luoghi/GestisciScheda";
import { CATEGORIE_ATTIVITA } from "@/modules/attivita/api";
import { ritornoDiCategoria } from "@/lib/aree";
import { metadatiCondivisione } from "@/lib/condivisione";
import { getOfferteLavoro } from "@/modules/lavorare/offerte";
import { RigaOfferta } from "@/modules/lavorare/components/ElencoOfferte";
import { getPremi } from "@/modules/premi/dati";
import { OGNI, nomeSoglia } from "@/modules/premi/api";

export const revalidate = 300;

// Nessuna pagina pronta alla build: si crea alla prima visita e poi resta in cache (ISR) fino al revalidate
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const l = await getLuogo(id);
  if (!l) return { title: "Luogo · 739 San Marino" };
  return metadatiCondivisione({ titolo: l.nome, descrizione: [CATEGORIE[l.categoria], l.indirizzo, l.descrizione].filter(Boolean).join(". "), percorso: `/luoghi/${l.id}`, inglese: `/en/places/${l.id}` });
}

/** La pagina di un luogo: la scheda unica, aperta dalla mappa, dalla ricerca e dalle sezioni. */
export default async function PaginaLuogo({ params }: Props) {
  const { id } = await params;
  const [l, castelli, gestito, pro, offerte, prenota, premi] = await Promise.all([getLuogo(id), getClassifica(), getGestito(id), getPro(id), getOfferteLavoro(), getPrenotaAperta(id), getPremi(id)]);
  if (!l) notFound();
  const castello = castelli.find((c) => c.id === l.castello_id) ?? null;
  const ritorno = ritornoDiCategoria(l.categoria, l.sottocategoria);
  const lavoro = offerte.filter((o) => o.luogo_id === l.id);
  const simili = await getSimili(l);

  return (
    <>
      <Link href={ritorno.href} className="-mb-2 flex w-fit items-center gap-1 text-sm font-medium text-accento">
        <Icona nome="freccia" size={16} /> {ritorno.nome}
      </Link>
      <Scheda l={l} castello={castello} gestito={gestito} pro={pro} prenota={prenota} azioni={<SegnalaErrore luogo={l.id} />} />
      {lavoro.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="cercano">
          <h2 id="cercano" className="text-[19px] font-semibold tracking-tight">Cercano personale</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {lavoro.map((o) => <li key={o.id}><RigaOfferta o={o} /></li>)}
          </ul>
        </section>
      ) : null}
      {premi.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="premi">
          <h2 id="premi" className="text-[19px] font-semibold tracking-tight">Premi dei metri</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {premi.map((p) => (
              <li key={p.id} className="flex items-start gap-3 p-4">
                <span className="taglio-piccolo shrink-0 bg-metallo py-0.5 text-[12px] font-semibold text-su-accento">{nomeSoglia(p.metri_min)}</span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{p.titolo}</span>
                  {p.descrizione ? <span className="text-[14px] leading-snug text-testo-2">{p.descrizione}</span> : null}
                  <span className="text-[12px] text-testo-2">{OGNI[p.ogni].riga}{p.rimasti !== null ? `, ${p.rimasti} rimasti` : ""}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-testo-2">Mostra il QR del tuo SMR ID alla cassa. <Link href="/premi" className="underline underline-offset-2">Tutti i premi</Link></p>
        </section>
      ) : null}
      <Simili vicini={simili} />
      {CATEGORIE_ATTIVITA.has(l.categoria) ? <GestisciScheda luogo={l.id} /> : null}
      {CATEGORIE_ATTIVITA.has(l.categoria) ? <ContaScheda luogo={l.id} /> : null}
    </>
  );
}
