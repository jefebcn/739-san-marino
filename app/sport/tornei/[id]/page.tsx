import DettaglioTorneo from "@/modules/sport/components/DettaglioTorneo";
import { getSport } from "@/modules/sport/dati";
import { getClassifica } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Torneo · 739 San Marino" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaTorneo({ params }: Props) {
  const { id } = await params;
  const [sport, castelli] = await Promise.all([getSport(), getClassifica()]);
  return <DettaglioTorneo id={id} sport={sport} castelli={castelli} />;
}
