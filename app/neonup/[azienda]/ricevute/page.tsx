import { notFound } from "next/navigation";
import Guscio from "@/modules/neonup/components/Guscio";
import Passive from "@/modules/neonup/components/Passive";

export const metadata = { title: "Fatture ricevute · NeonUp · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ azienda: string }> };

export default async function PaginaRicevute({ params }: Props) {
  const { azienda } = await params;
  if (!/^[0-9a-f-]{36}$/.test(azienda)) notFound();
  return <Guscio azienda={azienda} sezione="ricevute"><Passive /></Guscio>;
}
