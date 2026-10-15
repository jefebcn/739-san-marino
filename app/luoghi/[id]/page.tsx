import { notFound } from "next/navigation";
import Link from "next/link";
import Scheda from "@/components/Scheda";
import SegnalaErrore from "@/components/SegnalaErrore";
import { Icona } from "@/components/Icona";
import { CATEGORIE, getClassifica, getGestito, getLuogo } from "@/lib/data";
import { ritornoDiCategoria } from "@/lib/aree";
import { metadatiCondivisione } from "@/lib/condivisione";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const l = await getLuogo(id);
  if (!l) return { title: "Luogo · 739 San Marino" };
  return metadatiCondivisione({ titolo: l.nome, descrizione: [CATEGORIE[l.categoria], l.indirizzo, l.descrizione].filter(Boolean).join(". "), percorso: `/luoghi/${l.id}` });
}

/** La pagina di un luogo: la scheda unica, aperta dalla mappa, dalla ricerca e dalle sezioni. */
export default async function PaginaLuogo({ params }: Props) {
  const { id } = await params;
  const [l, castelli, gestito] = await Promise.all([getLuogo(id), getClassifica(), getGestito(id)]);
  if (!l) notFound();
  const castello = castelli.find((c) => c.id === l.castello_id) ?? null;
  const ritorno = ritornoDiCategoria(l.categoria);

  return (
    <>
      <Link href={ritorno.href} className="-mb-2 flex w-fit items-center gap-1 text-sm font-medium text-accento">
        <Icona nome="freccia" size={16} /> {ritorno.nome}
      </Link>
      <Scheda l={l} castello={castello} gestito={gestito} azioni={<SegnalaErrore luogo={l.id} />} />
    </>
  );
}
