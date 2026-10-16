import TestaPagina from "@/components/Indietro";
import Riservato from "@/modules/redazione/components/Riservato";
import GestioneScadenze from "@/modules/redazione/components/GestioneScadenze";

export const metadata = { title: "Scadenze e bandi · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaScadenzeRedazione() {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Scadenze e bandi">
        <p className="sottotitolo">Le scadenze, i bandi e le nuove regole per le attività, in Lavorare. Ogni voce vuole la fonte ufficiale.</p>
      </TestaPagina>
      <Riservato ruolo="redattore">
        <GestioneScadenze />
      </Riservato>
    </>
  );
}
