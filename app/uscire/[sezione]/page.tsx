import PaginaSezione from "@/components/aree/PaginaSezione";
import { area as trovaArea, sezione as trovaSezione } from "@/lib/aree";
import { alternati, traduzione } from "@/lib/lingua";

export const revalidate = 300;

// Le sezioni fatte di luoghi si preparano alla build e restano in cache (ISR)
export async function generateStaticParams() {
  return (trovaArea("uscire")?.sezioni ?? []).filter((s) => s.categorie && s.href?.startsWith("/uscire/")).map((s) => ({ sezione: s.slug }));
}

type Props = { params: Promise<{ sezione: string }> };

export async function generateMetadata({ params }: Props) {
  const { sezione } = await params;
  const percorso = `/uscire/${sezione}`;
  const inglese = traduzione("en", percorso);
  return { title: `${trovaSezione("uscire", sezione)?.nome ?? "Sezione"} · 739 San Marino`, ...(inglese ? { alternates: alternati(percorso, inglese, "it") } : {}) };
}

export default async function Sezione({ params }: Props) {
  const { sezione } = await params;
  return <PaginaSezione area="uscire" sezione={sezione} />;
}
