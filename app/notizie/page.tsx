import TestaPagina from "@/components/Indietro";
import ElencoNotizie, { type NotiziaConData } from "@/components/Notizie";
import { Vuoto } from "@/components/Tano";
import { etichettaGiorno, ora } from "@/lib/data";
import { FONTE_NOTIZIE, getNotizie } from "@/lib/notizie";

export const revalidate = 900;

export const metadata = {
  title: "Notizie · 739 San Marino",
  description: "Cronaca, attualità, politica, economia, cultura e sport di San Marino, aggiornate con San Marino RTV.",
};

/** Le notizie di San Marino dai feed di San Marino RTV (lib/notizie.ts), aggiornate ogni 15 minuti */
export default async function Notizie() {
  const notizie: NotiziaConData[] = (await getNotizie()).map((n) => ({ ...n, quando: `${etichettaGiorno(n.data).toLowerCase()} alle ${ora(n.data)}` }));
  return (
    <>
      <TestaPagina href="/" verso="Oggi" titolo="Notizie">
        <p className="sottotitolo">Cronaca, attualità, politica e sport di San Marino, aggiornate ogni quarto d&apos;ora.</p>
      </TestaPagina>
      {notizie.length ? (
        <ElencoNotizie notizie={notizie} />
      ) : (
        <Vuoto titolo="Le notizie non sono arrivate" testo="Il sito di San Marino RTV in questo momento non risponde. Riprova tra qualche minuto." azione={{ href: "/", testo: "Torna a Oggi" }} />
      )}
      <p className="fonte">
        Fonte: <a href={FONTE_NOTIZIE.link} target="_blank" rel="noopener">{FONTE_NOTIZIE.nome}</a>, dai suoi feed RSS pubblici. Titoli e testi sono di San Marino RTV.
      </p>
    </>
  );
}
