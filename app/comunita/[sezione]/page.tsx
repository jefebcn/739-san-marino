import PaginaSezione from "@/components/aree/PaginaSezione";
import { area as trovaArea, sezione as trovaSezione } from "@/lib/aree";

export const revalidate = 300;

// Le sezioni fatte di luoghi si preparano alla build e restano in cache (ISR)
export async function generateStaticParams() {
  return (trovaArea("comunita")?.sezioni ?? []).filter((s) => s.categorie && s.href?.startsWith("/comunita/")).map((s) => ({ sezione: s.slug }));
}

type Props = { params: Promise<{ sezione: string }> };

export async function generateMetadata({ params }: Props) {
  const { sezione } = await params;
  return { title: `${trovaSezione("comunita", sezione)?.nome ?? "Sezione"} · 739 San Marino` };
}

export default async function Sezione({ params }: Props) {
  const { sezione } = await params;
  return <PaginaSezione area="comunita" sezione={sezione} />;
}
