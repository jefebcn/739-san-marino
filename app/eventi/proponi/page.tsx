import TestaPagina from "@/components/Indietro";
import ProponiEvento from "@/modules/eventi/components/ProponiEvento";
import { getClassifica, getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = {
  title: "Proponi un evento · 739 San Marino",
  description: "Organizzi qualcosa a San Marino? Proponilo a 739: la redazione lo controlla e lo mette nel calendario.",
};

// Fontanelle, bagni e colonnine non ospitano eventi
const ESCLUSI = new Set(["acqua", "bagni", "ricarica", "farmacia", "parcheggio"]);

export default async function PaginaProponi() {
  const [luoghi, castelli] = await Promise.all([getLuoghi(), getClassifica()]);
  return (
    <>
      <TestaPagina href="/eventi" verso="Eventi" titolo="Proponi un evento">
        <p className="sottotitolo">Organizzi qualcosa sul Titano? Raccontacelo: dopo un controllo finisce nel calendario di 739.</p>
      </TestaPagina>
      <ProponiEvento
        luoghi={luoghi.filter((l) => !ESCLUSI.has(l.categoria)).map((l) => ({ id: l.id, nome: l.nome }))}
        castelli={[...castelli].sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome }))}
      />
    </>
  );
}
