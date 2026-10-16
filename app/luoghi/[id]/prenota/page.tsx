import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import { getLuogo } from "@/lib/data";
import Prenota from "@/modules/prenotazioni/components/Prenota";

export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const l = await getLuogo(id);
  return { title: `Prenota${l ? `: ${l.nome}` : ""} · 739 San Marino`, robots: { index: false, follow: true } };
}

/** Prenotare con 739 un campo, una sala o un servizio del centro (migrazione 0046). Orari e posti li legge il browser. */
export default async function PaginaPrenota({ params }: Props) {
  const { id } = await params;
  const l = await getLuogo(id);
  if (!l) notFound();
  return (
    <>
      <TestaPagina href={`/luoghi/${l.id}`} verso={l.nome} titolo="Prenota con 739">
        <p className="sottotitolo">{l.nome}{l.indirizzo ? `, ${l.indirizzo}` : ""}</p>
      </TestaPagina>
      <Prenota luogo={l.id} nome={l.nome} />
    </>
  );
}
