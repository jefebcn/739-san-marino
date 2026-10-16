import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import ModificaAttivita from "@/modules/attivita/components/ModificaAttivita";

export const metadata = { title: "La tua attività · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaModificaAttivita({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <>
      <TestaPagina href="/profile/attivita" verso="Le mie attività" titolo="La tua attività">
        <p className="sottotitolo">Com&apos;è messa adesso, la scheda da aggiornare, le offerte di lavoro e il Pro.</p>
      </TestaPagina>
      <ModificaAttivita id={id} />
    </>
  );
}
