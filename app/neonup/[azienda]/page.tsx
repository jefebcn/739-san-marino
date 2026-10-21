import { notFound } from "next/navigation";
import { CruscottoAzienda } from "@/modules/neonup/components/Documenti";
import Guscio from "@/modules/neonup/components/Guscio";

export const metadata = { title: "NeonUp · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ azienda: string }> };

export default async function PaginaCruscotto({ params }: Props) {
  const { azienda } = await params;
  if (!/^[0-9a-f-]{36}$/.test(azienda)) notFound();
  return <Guscio azienda={azienda} sezione="cruscotto"><CruscottoAzienda /></Guscio>;
}
