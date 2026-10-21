import { notFound } from "next/navigation";
import Documento from "@/modules/neonup/components/Documento";
import Guscio from "@/modules/neonup/components/Guscio";

export const metadata = { title: "Documento · NeonUp · 739 San Marino", robots: { index: false, follow: false } };

type Props = { params: Promise<{ azienda: string; doc: string }> };

export default async function PaginaDocumento({ params }: Props) {
  const { azienda, doc } = await params;
  if (!/^[0-9a-f-]{36}$/.test(azienda) || !/^[0-9a-f-]{36}$/.test(doc)) notFound();
  return <Guscio azienda={azienda} sezione="documenti"><Documento id={doc} /></Guscio>;
}
