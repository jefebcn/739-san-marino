import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import GestioneVolontari from "@/modules/volontari/components/GestioneVolontari";

export const metadata = { title: "Volontari della tua associazione · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaVolontariAssociazione({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <>
      <TestaPagina href={`/profile/attivita/${id}`} verso="La tua attività" titolo="Volontari">
        <p className="sottotitolo">Chiedi una mano per una pulizia, una raccolta, una festa: chi viene si iscrive con l&apos;SMR ID e dopo il turno riceve i metri.</p>
      </TestaPagina>
      <GestioneVolontari luogo={id} />
    </>
  );
}
