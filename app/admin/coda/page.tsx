import Coda from "@/modules/coda/components/Coda";
import { getClassifica, getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Coda delle bozze · 739 San Marino", robots: { index: false, follow: false } };

// Nei luoghi da proporre per un evento non servono fontanelle, bagni e colonnine
const ESCLUSI = new Set(["acqua", "bagni", "ricarica"]);

export default async function PaginaCoda() {
  const [luoghi, castelli] = await Promise.all([getLuoghi(), getClassifica()]);
  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Coda delle bozze</h1>
        <p className="text-[15px] text-testo-2">Quello che arriva da fuori passa da qui prima di andare online: completa, pubblica o scarta.</p>
      </section>
      <Coda
        luoghi={luoghi.filter((l) => !ESCLUSI.has(l.categoria)).map((l) => ({ id: l.id, nome: l.nome, castello_id: l.castello_id }))}
        castelli={[...castelli].sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome }))}
      />
    </>
  );
}
