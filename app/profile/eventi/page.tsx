import TestaPagina from "@/components/Indietro";
import MieiEventi from "@/modules/eventi/components/MieiEventi";
import Riservato from "@/modules/redazione/components/Riservato";

export const metadata = { title: "I miei eventi · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaMieiEventi() {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="I miei eventi">
        <p className="sottotitolo">Gli eventi che hai pubblicato: modificali, nascondili o aggiungine uno nuovo.</p>
      </TestaPagina>
      <Riservato ruolo="organizzatore">
        <MieiEventi />
      </Riservato>
    </>
  );
}
