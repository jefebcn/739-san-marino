import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import GestionePremi from "@/modules/premi/components/GestionePremi";

export const metadata = { title: "Premi dei metri della tua attività · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaPremiAttivita({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return (
    <>
      <TestaPagina href={`/profile/attivita/${id}`} verso="La tua attività" titolo="Premi dei metri">
        <p className="sottotitolo">Un premio per chi sale con 739: scegli il livello e ogni quanto, poi lo consegni leggendo il QR dell&apos;SMR ID.</p>
      </TestaPagina>
      <GestionePremi luogo={id} />
    </>
  );
}
