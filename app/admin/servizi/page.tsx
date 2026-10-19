import TestaPagina from "@/components/Indietro";
import Riservato from "@/modules/redazione/components/Riservato";
import GestioneServizi from "@/modules/redazione/components/GestioneServizi";
import { getClassifica } from "@/lib/data";

export const metadata = { title: "Orari e raccolta · 739 San Marino", robots: { index: false, follow: false } };

export default async function PaginaServiziRedazione() {
  const castelli = await getClassifica();
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Orari e raccolta">
        <p className="sottotitolo">Le corse di funivia e bus e i giorni della raccolta dei rifiuti, da aggiornare quando escono quelli nuovi. Sempre dalla fonte ufficiale.</p>
      </TestaPagina>
      <Riservato ruolo="redattore">
        <GestioneServizi castelli={[...castelli].sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome }))} />
      </Riservato>
    </>
  );
}
