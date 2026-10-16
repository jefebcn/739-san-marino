import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import Scadenze from "@/components/lavoro/Scadenze";
import { getScadenze, oggiSM } from "@/lib/scadenze";
import { TITOLARE } from "@/lib/legale";
import { metadatiCondivisione } from "@/lib/condivisione";

export const revalidate = 900;

export const metadata = metadatiCondivisione({
  titolo: "Bandi e contributi per le attività",
  descrizione: "I bandi e i contributi pubblici aperti per chi ha un'attività a San Marino, con la data di chiusura e la fonte ufficiale.",
  percorso: "/lavorare/bandi",
});

/** Bandi (Lavorare): le scadenze di tipo «bando», in ordine di chiusura */
export default async function PaginaBandi() {
  const bandi = await getScadenze({ tipo: "bando", da: oggiSM() });
  return (
    <>
      <TestaPagina href="/lavorare" verso="Lavorare" titolo="Bandi">
        <p className="sottotitolo">Contributi e bandi pubblici aperti, dal più vicino alla chiusura. Ogni bando ha il link alla fonte ufficiale.</p>
      </TestaPagina>
      {bandi.length ? (
        <Scadenze scadenze={bandi} />
      ) : (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] leading-relaxed text-testo-2">Nessun bando aperto in 739 in questo momento. La redazione li aggiunge appena escono dalle fonti ufficiali.</p>
      )}
      <section className="flex flex-col gap-2 rounded-2xl bg-superficie p-5">
        <h2 className="text-[17px] font-semibold tracking-tight">Conosci un bando che manca?</h2>
        <p className="text-sm leading-relaxed text-testo-2">Mandaci il link alla pagina ufficiale: lo controlliamo e lo aggiungiamo.</p>
        <a href={`mailto:${TITOLARE.email}?subject=${encodeURIComponent("Un bando per 739")}`} className="flex w-fit items-center gap-1 pt-1 text-sm font-semibold text-accento">Scrivici <Icona nome="avanti" size={14} /></a>
      </section>
      <Link href="/lavorare/scadenze" className="flex w-fit items-center gap-1 text-sm font-semibold text-accento">Tutte le scadenze e i servizi online dello Stato <Icona nome="avanti" size={14} /></Link>
    </>
  );
}
