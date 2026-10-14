import { notFound } from "next/navigation";
import Checkin from "@/modules/eventi/components/Checkin";
import { getEvento } from "@/lib/data";

export const metadata = { title: "Check-in · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

/** Dove porta il QR stampato all'evento: registra il check-in con l'SMR ID. */
export default async function PaginaCheckin({ params }: Props) {
  const { id } = await params;
  const e = await getEvento(id);
  if (!e) notFound();
  return <Checkin evento={e.id} titolo={e.titolo} />;
}
