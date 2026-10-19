import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { getClassifica } from "@/lib/data";
import { metadatiCondivisione } from "@/lib/condivisione";
import ElencoPremi from "@/modules/premi/components/ElencoPremi";
import { getPremi } from "@/modules/premi/dati";

// I premi cambiano quando un titolare li salva (/api/rivalida rigenera la pagina subito)
export const revalidate = 600;

export const metadata = metadatiCondivisione({
  titolo: "Premi dei metri",
  descrizione: "Sali con i metri di 739 e ritira i premi delle attività di San Marino: mostri il QR del tuo SMR ID e il titolare te lo consegna.",
  percorso: "/premi",
});

/** I premi dei metri (migrazione 0050): quelli aperti, per livello */
export default async function PaginaPremi() {
  const [premi, classifica] = await Promise.all([getPremi(), getClassifica()]);
  const castelli = classifica.sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome, colore: c.colore }));
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Premi dei metri">
        <p className="sottotitolo">Le attività del territorio premiano chi sale con 739. Mostri il QR del tuo SMR ID e il titolare ti consegna il premio.</p>
      </TestaPagina>
      <section className="larga flex flex-col gap-6">
        <ElencoPremi iniziali={premi} castelli={castelli} />
        <p className="text-[13px] leading-relaxed text-testo-2">
          I premi li offrono e li consegnano le attività: 739 controlla i tuoi metri e quante volte li hai ritirati. Hai un&apos;attività?{" "}
          <Link href="/attivita" className="underline underline-offset-2">Offri un premio</Link> dalla tua scheda.
        </p>
      </section>
    </>
  );
}
