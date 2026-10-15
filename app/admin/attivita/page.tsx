import TestaPagina from "@/components/Indietro";
import Riservato from "@/modules/redazione/components/Riservato";
import RichiesteAttivita from "@/modules/attivita/components/RichiesteAttivita";

export const metadata = { title: "Attività · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaAttivita() {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Attività">
        <p className="sottotitolo">I titolari che chiedono la scheda della loro attività o ne aggiungono una nuova. Verifica e decidi.</p>
      </TestaPagina>
      <Riservato ruolo="redattore">
        <RichiesteAttivita />
      </Riservato>
    </>
  );
}
