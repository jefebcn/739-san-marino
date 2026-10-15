import TestaPagina from "@/components/Indietro";
import Fonti from "@/modules/fonti/components/Fonti";
import Riservato from "@/modules/redazione/components/Riservato";

export const metadata = { title: "Fonti dei luoghi · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaFonti() {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Fonti dei luoghi">
        <p className="sottotitolo">Luoghi da fonti aperte (Overture Maps): si caricano, si controllano i doppioni e si decide cosa pubblicare sulla mappa.</p>
      </TestaPagina>
      <Riservato ruolo="amministratore">
        <Fonti />
      </Riservato>
    </>
  );
}
