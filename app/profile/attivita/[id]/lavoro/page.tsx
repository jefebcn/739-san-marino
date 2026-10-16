import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import OfferteLavoroAttivita from "@/modules/attivita/components/OfferteLavoroAttivita";

export const metadata = { title: "Offerte di lavoro della tua attività · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaOfferteAttivita({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <>
      <TestaPagina href={`/profile/attivita/${id}`} verso="La tua attività" titolo="Offerte di lavoro">
        <p className="sottotitolo">Cerchi personale? Pubblica l&apos;offerta: va online subito in Lavorare e nella scheda della tua attività.</p>
      </TestaPagina>
      <OfferteLavoroAttivita id={id} />
    </>
  );
}
