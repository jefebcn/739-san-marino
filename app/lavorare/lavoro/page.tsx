import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import { Vuoto } from "@/components/Tano";
import ElencoOfferte from "@/modules/lavorare/components/ElencoOfferte";
import { getClassifica } from "@/lib/data";
import { getOfferteLavoro } from "@/modules/lavorare/offerte";
import { metadatiCondivisione } from "@/lib/condivisione";

export const revalidate = 300;

export const metadata = metadatiCondivisione({
  titolo: "Offerte di lavoro a San Marino",
  descrizione: "Chi cerca personale a San Marino: locali, negozi, aziende e studi del territorio, con contratto, orario e come candidarsi.",
  percorso: "/lavorare/lavoro",
});

/** Offerte di lavoro (Lavorare): le pubblicano le attività che gestiscono la loro scheda in 739 */
export default async function OfferteLavoro() {
  const [offerte, castelli] = await Promise.all([getOfferteLavoro(), getClassifica()]);
  const nomi = Object.fromEntries(castelli.map((c) => [c.id, c.nome]));
  return (
    <>
      <TestaPagina href="/lavorare" verso="Lavorare" titolo="Offerte di lavoro">
        <p className="sottotitolo">Chi cerca personale a San Marino. Le pubblicano le attività verificate dalla redazione; ti candidi scrivendo direttamente a loro.</p>
      </TestaPagina>

      {offerte.length === 0 ? (
        <Vuoto
          titolo="Nessuna offerta aperta in questo momento"
          testo="Hai un'attività e cerchi personale? Gestisci la scheda in 739 e pubblica l'offerta: va online subito."
          azione={{ href: "/attivita", testo: "Come funziona per le attività" }}
        />
      ) : (
        <section className="larga flex flex-col gap-3">
          <ElencoOfferte offerte={offerte} castelli={nomi} />
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-2xl bg-superficie p-5">
        <h2 className="text-[17px] font-semibold tracking-tight">Cerchi personale?</h2>
        <p className="text-sm leading-relaxed text-testo-2">
          Se gestisci la scheda della tua attività in 739, apri «Le mie attività», poi la scheda, e tocca «Offerte di lavoro». Se la scheda non è ancora tua, chiedila dalla scheda stessa o aggiungi l&apos;attività: è gratis.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          <Link href="/profile/attivita" className="flex items-center gap-1 text-sm font-semibold text-accento">Le mie attività <Icona nome="avanti" size={14} /></Link>
          <Link href="/attivita" className="flex items-center gap-1 text-sm font-semibold text-accento">739 per le attività <Icona nome="avanti" size={14} /></Link>
        </div>
      </section>
    </>
  );
}
