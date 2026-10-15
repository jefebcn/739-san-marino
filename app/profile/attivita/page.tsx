import TestaPagina from "@/components/Indietro";
import MieAttivita from "@/modules/attivita/components/MieAttivita";

export const metadata = { title: "Le mie attività · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaMieAttivita() {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Le mie attività">
        <p className="sottotitolo">Le schede delle attività che gestisci e quelle in verifica.</p>
      </TestaPagina>
      <MieAttivita />
    </>
  );
}
