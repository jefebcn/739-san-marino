import { notFound } from "next/navigation";
import Guscio from "@/modules/neonup/components/Guscio";
import Soggetti from "@/modules/neonup/components/Soggetti";

export const metadata = { title: "Clienti e fornitori · NeonUp · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ azienda: string }> };

export default async function PaginaClienti({ params }: Props) {
  const { azienda } = await params;
  if (!/^[0-9a-f-]{36}$/.test(azienda)) notFound();
  return <Guscio azienda={azienda} sezione="clienti"><Soggetti /></Guscio>;
}
