import PaginaArea from "@/components/aree/PaginaArea";
import { getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Lavorare · 739 San Marino" };

export default async function Lavorare() {
  const luoghi = await getLuoghi();
  const conta = (c: string) => luoghi.filter((l) => l.categoria === c).length;
  const riga = (n: number, uno: string, tanti: string) => (n ? <><b className="font-mono font-medium text-testo">{n}</b> {n === 1 ? uno : tanti}</> : "Aggiungi la tua, è gratis");
  return (
    <PaginaArea
      slug="lavorare"
      stato={{
        aziende: riga(conta("azienda"), "azienda", "aziende"),
        professionisti: riga(conta("professionista"), "studio", "studi"),
        artigiani: riga(conta("artigiano"), "artigiano", "artigiani"),
      }}
    />
  );
}
