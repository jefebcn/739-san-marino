import { notFound } from "next/navigation";
import Link from "next/link";
import Scheda from "@/components/Scheda";
import { Icona } from "@/components/Icona";
import { getClassifica, getGestito, getLuogo, getPro } from "@/lib/data";
import ContaScheda from "@/components/ContaScheda";
import { CATEGORIE_ATTIVITA } from "@/modules/attivita/api";
import { CATEGORIA_SINGOLA_EN, metaEn, ritornoEn } from "@/lib/lingua";

export const revalidate = 300;

// Come /luoghi/[id]: si crea alla prima visita e resta in cache
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const l = await getLuogo(id);
  if (!l) return { title: "Place · 739 San Marino" };
  const descrizione = [CATEGORIA_SINGOLA_EN[l.categoria], l.indirizzo, "San Marino"].filter(Boolean).join(", ");
  return metaEn(l.nome, descrizione, `/luoghi/${l.id}`, `/en/places/${l.id}`);
}

/** La scheda di un luogo in inglese: la stessa di /luoghi/[id], con le etichette in inglese */
export default async function Place({ params }: Props) {
  const { id } = await params;
  const [l, castelli, gestito, pro] = await Promise.all([getLuogo(id), getClassifica(), getGestito(id), getPro(id)]);
  if (!l) notFound();
  const castello = castelli.find((c) => c.id === l.castello_id) ?? null;
  const ritorno = ritornoEn(l.categoria);

  return (
    <>
      <Link href={ritorno.href} className="-mb-2 flex w-fit items-center gap-1 text-sm font-medium text-accento">
        <Icona nome="freccia" size={16} /> {ritorno.nome}
      </Link>
      <Scheda l={l} castello={castello} gestito={gestito} pro={pro} lingua="en" />
      {CATEGORIE_ATTIVITA.has(l.categoria) ? <ContaScheda luogo={l.id} /> : null}
    </>
  );
}
