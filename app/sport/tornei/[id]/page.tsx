import DettaglioTorneo from "@/modules/sport/components/DettaglioTorneo";
import { getSport } from "@/modules/sport/dati";
import { getClassifica } from "@/lib/data";

export const revalidate = 300;

// Nessuna pagina pronta alla build: si crea alla prima visita e poi resta in cache (ISR) fino al revalidate
export async function generateStaticParams() {
  return [];
}

export const metadata = { title: "Torneo · 739 San Marino" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaTorneo({ params }: Props) {
  const { id } = await params;
  const [sport, castelli] = await Promise.all([getSport(), getClassifica()]);
  return <DettaglioTorneo id={id} sport={sport} castelli={castelli} />;
}
