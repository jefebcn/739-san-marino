import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import Fornitori from "@/modules/lavorare/components/Fornitori";
import { getClassifica, getFornitori } from "@/lib/data";
import { metadatiCondivisione } from "@/lib/condivisione";

export const revalidate = 3600;

export const metadata = metadatiCondivisione({
  titolo: "Fornitori e preventivi a San Marino",
  descrizione: "Aziende, artigiani e studi professionali di San Marino per tipo, con i contatti per chiedere un preventivo.",
  percorso: "/lavorare/fornitori",
});

/** Fornitori e preventivi (Lavorare): chi ha un'attività trova chi gli serve e chiede un preventivo direttamente */
export default async function PaginaFornitori() {
  const [fornitori, castelli] = await Promise.all([getFornitori(), getClassifica()]);
  return (
    <>
      <TestaPagina href="/lavorare" verso="Lavorare" titolo="Fornitori e preventivi">
        <p className="sottotitolo">Aziende, artigiani e studi del territorio. Trova chi ti serve e chiedi un preventivo: la richiesta parte da te e va direttamente a loro.</p>
      </TestaPagina>
      <section className="flex flex-col gap-3">
        <Fornitori fornitori={fornitori} castelli={Object.fromEntries(castelli.map((c) => [c.id, c.nome]))} />
      </section>
      <section className="flex flex-col gap-2 rounded-2xl bg-superficie p-5">
        <h2 className="text-[17px] font-semibold tracking-tight">Sei un fornitore e non ci sei?</h2>
        <p className="text-sm leading-relaxed text-testo-2">Aggiungi la tua attività: è gratis. Con un&apos;email nella scheda ricevi le richieste di preventivo direttamente.</p>
        <Link href="/attivita/aggiungi?categoria=azienda" className="flex w-fit items-center gap-1 pt-1 text-sm font-semibold text-accento">Aggiungi la tua attività <Icona nome="avanti" size={14} /></Link>
      </section>
    </>
  );
}
