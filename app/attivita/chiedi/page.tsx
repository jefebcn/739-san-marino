import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import { getLuogo } from "@/lib/data";
import ChiediAttivita from "@/modules/attivita/components/ChiediAttivita";
import { CATEGORIE_ATTIVITA } from "@/modules/attivita/api";

export const metadata = { title: "La tua attività · 739 San Marino", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ luogo?: string }> };

/** «È la tua attività?»: il titolare chiede la scheda del suo locale o negozio (profilo base, gratis). */
export default async function PaginaChiedi({ searchParams }: Props) {
  const { luogo: id } = await searchParams;
  const l = id && /^[0-9a-f-]{36}$/.test(id) ? await getLuogo(id) : null;
  if (!l || !CATEGORIE_ATTIVITA.has(l.categoria)) notFound();
  return (
    <>
      <TestaPagina href={`/luoghi/${l.id}`} verso={l.nome} titolo="È la tua attività?">
        <p className="sottotitolo">Chiedi la scheda di {l.nome}: dopo una verifica della redazione la aggiorni tu, quando vuoi.</p>
      </TestaPagina>
      <ChiediAttivita luogo={{ id: l.id, nome: l.nome }} />
    </>
  );
}
