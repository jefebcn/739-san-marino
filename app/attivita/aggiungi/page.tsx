import TestaPagina from "@/components/Indietro";
import { getClassifica } from "@/lib/data";
import AggiungiAttivita from "@/modules/attivita/components/AggiungiAttivita";

export const metadata = {
  title: "Aggiungi la tua attività · 739 San Marino",
  description: "Hai un'azienda, uno studio, una bottega, un locale o un negozio a San Marino? Aggiungi gratis la tua scheda su 739.",
};

type Props = { searchParams: Promise<{ categoria?: string }> };

// Da dove si arriva: la sezione che elenca quella categoria
const RITORNO: Record<string, { href: string; nome: string }> = {
  azienda: { href: "/lavorare/aziende", nome: "Aziende" },
  professionista: { href: "/lavorare/professionisti", nome: "Professionisti" },
  artigiano: { href: "/lavorare/artigiani", nome: "Artigiani" },
  locale: { href: "/uscire/mangiare", nome: "Mangiare e bere" },
  negozio: { href: "/uscire/negozi", nome: "Negozi e outlet" },
};

/** «Aggiungi la tua attività» (passo 2.3, migrazione 0036): profilo base gratis, verificato dalla redazione. */
export default async function PaginaAggiungi({ searchParams }: Props) {
  const { categoria } = await searchParams;
  const castelli = await getClassifica();
  const torna = (categoria && RITORNO[categoria]) || { href: "/lavorare", nome: "Lavorare" };
  return (
    <>
      <TestaPagina href={torna.href} verso={torna.nome} titolo="Aggiungi la tua attività">
        <p className="sottotitolo">Azienda, studio, bottega, locale o negozio: la scheda su 739 è gratis. La redazione verifica, poi la aggiorni tu.</p>
      </TestaPagina>
      <AggiungiAttivita categoria={categoria} castelli={[...castelli].sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome }))} />
    </>
  );
}
