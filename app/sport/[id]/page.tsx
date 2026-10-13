import DettaglioPartita from "@/modules/sport/components/DettaglioPartita";
import { getSport } from "@/modules/sport/dati";
import { getClassifica } from "@/lib/data";

export const metadata = { title: "Partita · 739 San Marino" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaPartita({ params }: Props) {
  const { id } = await params;
  const [sport, castelli] = await Promise.all([getSport(), getClassifica()]);
  return <DettaglioPartita id={id} sport={sport} castelli={castelli} />;
}
