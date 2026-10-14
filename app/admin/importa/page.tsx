import Importa from "@/modules/redazione/components/Importa";
import Riservato from "@/modules/redazione/components/Riservato";
import { etichettaGiorno, getClassifica, getEventi, getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Importa · 739 San Marino", robots: { index: false, follow: false } };

export default async function PaginaImporta() {
  const [luoghi, eventi, castelli] = await Promise.all([getLuoghi(), getEventi(200), getClassifica()]);
  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Importa</h1>
        <p className="text-[15px] text-testo-2">Incolla un file JSON con luoghi, eventi, avvisi e contenuti: tutto entra nella coda e lo approvi da lì.</p>
      </section>
      <Riservato ruolo="redattore">
        <Importa
          riferimenti={{
            castelli: castelli.map((c) => ({ id: c.id, nome: c.nome, slug: c.slug })),
            luoghi: luoghi.map((l) => ({ id: l.id, nome: l.nome })),
            eventi: eventi.map((e) => ({ id: e.id, nome: `${e.titolo} (${etichettaGiorno(e.inizio)})` })),
          }}
        />
      </Riservato>
    </>
  );
}
