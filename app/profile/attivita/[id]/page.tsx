import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import ModificaAttivita from "@/modules/attivita/components/ModificaAttivita";

export const metadata = { title: "Modifica la scheda · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaModificaAttivita({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <>
      <TestaPagina href="/profile/attivita" verso="Le mie attività" titolo="Modifica la scheda">
        <p className="sottotitolo">Descrizione, contatti, orari e foto della tua attività.</p>
      </TestaPagina>
      <ModificaAttivita id={id} />
    </>
  );
}
