import { notFound } from "next/navigation";
import Articoli from "@/modules/neonup/components/Articoli";
import Guscio from "@/modules/neonup/components/Guscio";

export const metadata = { title: "Articoli · NeonUp · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ azienda: string }> };

export default async function PaginaArticoli({ params }: Props) {
  const { azienda } = await params;
  if (!/^[0-9a-f-]{36}$/.test(azienda)) notFound();
  return <Guscio azienda={azienda} sezione="articoli"><Articoli /></Guscio>;
}
