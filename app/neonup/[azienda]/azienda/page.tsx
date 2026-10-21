import { notFound } from "next/navigation";
import PaginaDatiAzienda from "@/modules/neonup/components/PaginaDatiAzienda";
import Guscio from "@/modules/neonup/components/Guscio";

export const metadata = { title: "Dati dell'azienda · NeonUp · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ azienda: string }> };

export default async function PaginaAzienda({ params }: Props) {
  const { azienda } = await params;
  if (!/^[0-9a-f-]{36}$/.test(azienda)) notFound();
  return <Guscio azienda={azienda} sezione="azienda"><PaginaDatiAzienda /></Guscio>;
}
