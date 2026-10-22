import { notFound } from "next/navigation";
import { Suspense } from "react";
import Contabilita from "@/modules/neonup/components/Contabilita";
import Guscio from "@/modules/neonup/components/Guscio";

export const metadata = { title: "Contabilità · NeonUp · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ azienda: string }> };

export default async function PaginaContabilita({ params }: Props) {
  const { azienda } = await params;
  if (!/^[0-9a-f-]{36}$/.test(azienda)) notFound();
  return <Guscio azienda={azienda} sezione="contabilita"><Suspense><Contabilita /></Suspense></Guscio>;
}
