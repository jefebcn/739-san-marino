import PaginaSezione from "@/components/aree/PaginaSezione";
import { sezione as trovaSezione } from "@/lib/aree";

export const revalidate = 300;

type Props = { params: Promise<{ sezione: string }> };

export async function generateMetadata({ params }: Props) {
  const { sezione } = await params;
  return { title: `${trovaSezione("comunita", sezione)?.nome ?? "Sezione"} · 739 San Marino` };
}

export default async function Sezione({ params }: Props) {
  const { sezione } = await params;
  return <PaginaSezione area="comunita" sezione={sezione} />;
}
