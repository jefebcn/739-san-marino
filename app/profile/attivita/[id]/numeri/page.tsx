import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import NumeriAttivita from "@/modules/attivita/components/NumeriAttivita";

export const metadata = { title: "I numeri della scheda · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaNumeriAttivita({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <>
      <TestaPagina href={`/profile/attivita/${id}`} verso="La tua attività" titolo="I numeri della scheda">
        <p className="sottotitolo">Quante persone aprono la tua scheda e cosa toccano.</p>
      </TestaPagina>
      <NumeriAttivita id={id} />
    </>
  );
}
