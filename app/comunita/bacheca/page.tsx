import TestaPagina from "@/components/Indietro";
import { getClassifica } from "@/lib/data";
import { metadatiCondivisione } from "@/lib/condivisione";
import Bacheca from "@/modules/bacheca/components/Bacheca";

export const revalidate = 3600;

export const metadata = metadatiCondivisione({
  titolo: "Bacheca",
  descrizione: "Annunci di chi vive a San Marino: cerco, offro, regalo, perso e trovato, iniziative nei castelli. Ogni annuncio lo legge la redazione prima che esca.",
  percorso: "/comunita/bacheca",
});

/** La Bacheca (Comunità, migrazione 0048): gli annunci si leggono nel browser, così il contatto si vede solo con l'SMR ID */
export default async function PaginaBacheca() {
  const castelli = (await getClassifica()).sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome, colore: c.colore }));
  return (
    <>
      <TestaPagina href="/comunita" verso="Comunità" titolo="Bacheca">
        <p className="sottotitolo">Annunci di chi vive qui: cerco, offro, regalo, perso e trovato, iniziative nel tuo castello.</p>
      </TestaPagina>
      <section className="larga">
        <Bacheca castelli={castelli} />
      </section>
    </>
  );
}
