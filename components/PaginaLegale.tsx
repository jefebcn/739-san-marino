import TestaPagina from "./Indietro";
import Testo from "./Testo";
import { Icona } from "./Icona";

/** Privacy e Termini (passo 1.8): bozze in markdown con l'avviso che vanno riviste da un professionista. */
export default function PaginaLegale({ titolo, aggiornata, testo }: { titolo: string; aggiornata: string; testo: string }) {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo={titolo}>
        <p className="sottotitolo">Ultimo aggiornamento: {aggiornata}</p>
      </TestaPagina>
      <p role="note" className="flex max-w-[65ch] items-start gap-2 rounded-2xl bg-accento-tenue p-4 text-sm leading-relaxed">
        <span className="mt-0.5 shrink-0 text-accento"><Icona nome="scudo" size={18} /></span>
        <span>Questa è una bozza, da rivedere con un professionista prima del lancio pubblico di 739.</span>
      </p>
      <Testo>{testo}</Testo>
    </>
  );
}
