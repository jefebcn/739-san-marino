import PaginaArea from "@/components/aree/PaginaArea";
import { getClassifica, getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Comunità · 739 San Marino" };

export default async function Comunita() {
  const [classifica, luoghi] = await Promise.all([getClassifica(), getLuoghi()]);
  const vetta = classifica[0];
  const chiese = luoghi.filter((l) => l.categoria === "chiesa").length;
  const associazioni = luoghi.filter((l) => l.categoria === "associazione");
  const volontariato = associazioni.filter((l) => l.sottocategoria === "volontariato").length;
  const giunte = luoghi.filter((l) => l.sottocategoria === "giunta di castello").length;
  const conta = (n: number, uno: string, tanti: string) => (n ? <><b className="font-mono font-medium text-testo">{n}</b> {n === 1 ? uno : tanti}</> : "Aggiungi la tua, è gratis");
  return (
    <PaginaArea
      slug="comunita"
      stato={{
        ...(vetta ? { castelli: <>In vetta adesso: <b className="font-semibold text-testo">{vetta.nome}</b></> } : {}),
        giunte: giunte ? <>Sede e contatti delle <b className="font-mono font-medium text-testo">{giunte}</b> Giunte</> : "Sede e contatti in arrivo",
        associazioni: conta(associazioni.length, "associazione", "associazioni"),
        volontariato: conta(volontariato, "associazione di volontariato", "associazioni di volontariato"),
        bacheca: "Cerco, offro, regalo, perso e trovato",
        chiese: chiese ? <><b className="font-mono font-medium text-testo">{chiese}</b> chiese e luoghi di culto</> : "Arrivano da OpenStreetMap",
      }}
    />
  );
}
