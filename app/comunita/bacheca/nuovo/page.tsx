import TestaPagina from "@/components/Indietro";
import { getClassifica } from "@/lib/data";
import NuovoAnnuncio from "@/modules/bacheca/components/NuovoAnnuncio";

export const metadata = { title: "Scrivi in bacheca · 739 San Marino", robots: { index: false, follow: false } };

export default async function PaginaNuovoAnnuncio() {
  const castelli = (await getClassifica()).sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome, slug: c.slug }));
  return (
    <>
      <TestaPagina href="/comunita/bacheca" verso="Bacheca" titolo="Scrivi un annuncio">
        <p className="sottotitolo">Lo legge la redazione e poi va in bacheca, di solito in giornata.</p>
      </TestaPagina>
      <NuovoAnnuncio castelli={castelli} />
    </>
  );
}
