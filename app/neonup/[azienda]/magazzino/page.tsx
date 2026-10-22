import { notFound } from "next/navigation";
import { Suspense } from "react";
import Guscio from "@/modules/neonup/components/Guscio";
import Magazzino from "@/modules/neonup/components/Magazzino";

export const metadata = { title: "Magazzino · NeonUp · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ azienda: string }> };

export default async function PaginaMagazzino({ params }: Props) {
  const { azienda } = await params;
  if (!/^[0-9a-f-]{36}$/.test(azienda)) notFound();
  return <Guscio azienda={azienda} sezione="magazzino"><Suspense><Magazzino /></Suspense></Guscio>;
}
