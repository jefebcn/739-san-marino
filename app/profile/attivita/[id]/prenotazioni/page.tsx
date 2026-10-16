import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import GestionePrenotazioni from "@/modules/prenotazioni/components/GestionePrenotazioni";

export const metadata = { title: "Prenotazioni della tua attività · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaPrenotazioniAttivita({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <>
      <TestaPagina href={`/profile/attivita/${id}`} verso="La tua attività" titolo="Prenotazioni">
        <p className="sottotitolo">Campi, sale o servizi da prenotare con 739: scegli tu orari e regole, si paga sul posto.</p>
      </TestaPagina>
      <GestionePrenotazioni luogo={id} />
    </>
  );
}
