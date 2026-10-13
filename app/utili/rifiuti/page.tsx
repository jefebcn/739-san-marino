import TestaPagina from "@/components/Indietro";
import CalendarioRaccolta from "@/components/Raccolta";
import { getClassifica } from "@/lib/data";
import { getRaccolta } from "@/lib/servizi";
import { FONTI } from "@/lib/fonti";

export const revalidate = 300;

export const metadata = { title: "Raccolta rifiuti · 739 San Marino" };

export default async function Rifiuti() {
  const [raccolta, castelli] = await Promise.all([getRaccolta(), getClassifica()]);
  return (
    <>
      <TestaPagina href="/utili" verso="Utili" etichetta="Casa" titolo="Raccolta rifiuti">
        <p className="sottotitolo">Il calendario del tuo castello: cosa si raccoglie oggi, domani e nella settimana.</p>
      </TestaPagina>
      <CalendarioRaccolta raccolta={raccolta} castelli={castelli} />
      <p className="fonte">Fonte: <a href={FONTI.rifiuti} target="_blank" rel="noopener">AASS, Azienda Autonoma di Stato per i Servizi Pubblici</a>.</p>
    </>
  );
}
