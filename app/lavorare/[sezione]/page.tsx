import PaginaSezione from "@/components/aree/PaginaSezione";
import { area as trovaArea, sezione as trovaSezione } from "@/lib/aree";

export const revalidate = 300;

// Le sezioni fatte di luoghi si preparano alla build e restano in cache (ISR)
export async function generateStaticParams() {
  return (trovaArea("lavorare")?.sezioni ?? []).filter((s) => s.categorie && s.href?.startsWith("/lavorare/")).map((s) => ({ sezione: s.slug }));
}

type Props = { params: Promise<{ sezione: string }> };

export async function generateMetadata({ params }: Props) {
  const { sezione } = await params;
  return { title: `${trovaSezione("lavorare", sezione)?.nome ?? "Sezione"} · 739 San Marino` };
}

// Le schede di Lavorare le aggiungono i titolari (migrazione 0036): all'inizio le sezioni sono vuote
const VUOTO: Record<string, string> = {
  aziende: "Le aziende arrivano dai titolari: ogni impresa di San Marino può aggiungere la sua scheda, gratis.",
  professionisti: "Gli studi arrivano dai titolari: commercialisti, avvocati, architetti e gli altri possono aggiungere la loro scheda, gratis.",
  artigiani: "Gli artigiani arrivano dai titolari: idraulici, elettricisti, falegnami e gli altri mestieri possono aggiungere la loro scheda, gratis.",
};

export default async function Sezione({ params }: Props) {
  const { sezione } = await params;
  return <PaginaSezione area="lavorare" sezione={sezione} vuoto={VUOTO[sezione]} />;
}
