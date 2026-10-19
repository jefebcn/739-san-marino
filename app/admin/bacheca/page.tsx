import TestaPagina from "@/components/Indietro";
import Riservato from "@/modules/redazione/components/Riservato";
import BachecaRedazione from "@/modules/bacheca/components/BachecaRedazione";
import { getClassifica } from "@/lib/data";

export const metadata = { title: "Bacheca, redazione · 739 San Marino", robots: { index: false, follow: false } };

export default async function PaginaBachecaRedazione() {
  const castelli = (await getClassifica()).map((c) => ({ id: c.id, nome: c.nome }));
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Bacheca">
        <p className="sottotitolo">Gli annunci di chi vive qui: si pubblicano solo dopo averli letti.</p>
      </TestaPagina>
      <Riservato ruolo="redattore">
        <BachecaRedazione castelli={castelli} />
      </Riservato>
    </>
  );
}
