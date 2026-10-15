import TestaPagina from "@/components/Indietro";
import { getClassifica } from "@/lib/data";
import AggiungiAttivita from "@/modules/attivita/components/AggiungiAttivita";

export const metadata = {
  title: "Aggiungi la tua attività · 739 San Marino",
  description: "Hai un'azienda, uno studio, una bottega, un locale, un negozio o un'associazione a San Marino? Aggiungi gratis la tua scheda su 739.",
};

type Props = { searchParams: Promise<{ categoria?: string; tipo?: string }> };

// Da dove si arriva: la sezione che elenca quella categoria
const RITORNO: Record<string, { href: string; nome: string }> = {
  azienda: { href: "/lavorare/aziende", nome: "Aziende" },
  professionista: { href: "/lavorare/professionisti", nome: "Professionisti" },
  artigiano: { href: "/lavorare/artigiani", nome: "Artigiani" },
  locale: { href: "/uscire/mangiare", nome: "Mangiare e bere" },
  negozio: { href: "/uscire/negozi", nome: "Negozi e outlet" },
  animali: { href: "/vivere/animali", nome: "Animali" },
  dormire: { href: "/uscire/dormire", nome: "Dormire" },
  associazione: { href: "/comunita/associazioni", nome: "Associazioni" },
};
const RITORNO_TIPO: Record<string, { href: string; nome: string }> = {
  volontariato: { href: "/comunita/volontariato", nome: "Volontariato" },
  sportiva: { href: "/sport/societa", nome: "Società sportive" },
};

/** «Aggiungi la tua attività» (passo 2.3, migrazione 0036): profilo base gratis, verificato dalla redazione. */
export default async function PaginaAggiungi({ searchParams }: Props) {
  const { categoria, tipo } = await searchParams;
  const castelli = await getClassifica();
  const torna = (categoria === "associazione" && tipo && RITORNO_TIPO[tipo]) || (categoria && RITORNO[categoria]) || { href: "/lavorare", nome: "Lavorare" };
  const associazione = categoria === "associazione";
  return (
    <>
      <TestaPagina href={torna.href} verso={torna.nome} titolo={associazione ? "Aggiungi la tua associazione" : "Aggiungi la tua attività"}>
        <p className="sottotitolo">
          {associazione
            ? "Culturale, di volontariato, sportiva o un circolo: la scheda su 739 è gratis. La redazione verifica, poi la aggiorni tu."
            : "Azienda, studio, bottega, locale, negozio o associazione: la scheda su 739 è gratis. La redazione verifica, poi la aggiorni tu."}
        </p>
      </TestaPagina>
      <AggiungiAttivita categoria={categoria} tipo={tipo} castelli={[...castelli].sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome }))} />
    </>
  );
}
