import PaginaArea from "@/components/aree/PaginaArea";
import { getClassifica, getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Comunità · 739 San Marino" };

export default async function Comunita() {
  const [classifica, luoghi] = await Promise.all([getClassifica(), getLuoghi()]);
  const vetta = classifica[0];
  const chiese = luoghi.filter((l) => l.categoria === "chiesa").length;
  return (
    <PaginaArea
      slug="comunita"
      stato={{
        ...(vetta ? { castelli: <>In vetta adesso: <b className="font-semibold text-testo">{vetta.nome}</b></> } : {}),
        chiese: chiese ? <><b className="font-mono font-medium text-testo">{chiese}</b> chiese e luoghi di culto</> : "Arrivano da OpenStreetMap",
      }}
    />
  );
}
