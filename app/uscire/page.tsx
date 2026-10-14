import PaginaArea from "@/components/aree/PaginaArea";
import { getEventi, getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Uscire · 739 San Marino" };

export default async function Uscire() {
  const [eventi, luoghi] = await Promise.all([getEventi(80), getLuoghi()]);
  const settimana = Date.now() + 7 * 86_400_000;
  const prossimi = eventi.filter((e) => new Date(e.inizio).getTime() < settimana).length;
  const conta = (c: string[]) => luoghi.filter((l) => c.includes(l.categoria)).length;
  return (
    <PaginaArea
      slug="uscire"
      stato={{
        eventi: prossimi ? <><b className="font-mono font-medium text-testo">{prossimi}</b> {prossimi === 1 ? "evento" : "eventi"} nei prossimi 7 giorni</> : undefined,
        cultura: <><b className="font-mono font-medium text-testo">{conta(["cultura", "luogo"])}</b> tra musei, torri e monumenti</>,
        natura: <><b className="font-mono font-medium text-testo">{conta(["panorama"])}</b> punti panoramici</>,
      }}
    />
  );
}
