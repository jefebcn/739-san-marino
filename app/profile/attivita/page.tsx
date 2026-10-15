import TestaPagina from "@/components/Indietro";
import MieAttivita from "@/modules/attivita/components/MieAttivita";

export const metadata = { title: "Le mie attività · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaMieAttivita() {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Le mie attività">
        <p className="sottotitolo">Le schede dei locali e dei negozi che gestisci, e le richieste in verifica.</p>
      </TestaPagina>
      <MieAttivita />
    </>
  );
}
