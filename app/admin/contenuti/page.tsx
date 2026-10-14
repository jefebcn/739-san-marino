import Contenuti from "@/modules/redazione/components/Contenuti";
import Riservato from "@/modules/redazione/components/Riservato";
import { etichettaGiorno, getClassifica, getEventi, getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Contenuti · 739 San Marino", robots: { index: false, follow: false } };

export default async function PaginaContenuti() {
  const [luoghi, eventi, castelli] = await Promise.all([getLuoghi(), getEventi(200), getClassifica()]);
  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Contenuti</h1>
        <p className="text-[15px] text-testo-2">Bollettino, rubriche, liste e storie: scrivi, pubblica o programma per giorno e ora.</p>
      </section>
      <Riservato ruolo="redattore">
        <Contenuti
          luoghi={luoghi.map((l) => ({ id: l.id, nome: l.nome }))}
          eventi={eventi.map((e) => ({ id: e.id, nome: `${e.titolo} (${etichettaGiorno(e.inizio)})` }))}
          castelli={[...castelli].sort((a, b) => a.id - b.id).map((c) => ({ id: String(c.id), nome: c.nome }))}
        />
      </Riservato>
    </>
  );
}
