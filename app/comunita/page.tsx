import PaginaArea from "@/components/aree/PaginaArea";
import { getClassifica } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Comunità · 739 San Marino" };

export default async function Comunita() {
  const classifica = await getClassifica();
  const vetta = classifica[0];
  return <PaginaArea slug="comunita" stato={vetta ? { castelli: <>In vetta adesso: <b className="font-semibold text-testo">{vetta.nome}</b></> } : {}} />;
}
