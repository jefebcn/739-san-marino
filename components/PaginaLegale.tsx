import TestaPagina from "./Indietro";
import Testo from "./Testo";

/** Privacy e Termini (passo 1.8, approvati da Alex il 14/10/2026): testo in markdown. */
export default function PaginaLegale({ titolo, aggiornata, testo }: { titolo: string; aggiornata: string; testo: string }) {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo={titolo}>
        <p className="sottotitolo">Ultimo aggiornamento: {aggiornata}</p>
      </TestaPagina>
      <Testo>{testo}</Testo>
    </>
  );
}
