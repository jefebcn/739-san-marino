import TestaPagina from "@/components/Indietro";
import { getClassifica } from "@/lib/data";
import { metadatiCondivisione } from "@/lib/condivisione";
import ElencoChiamate from "@/modules/volontari/components/ElencoChiamate";
import { getChiamate } from "@/modules/volontari/dati";
import { METRI_TURNO } from "@/modules/volontari/api";

// Cambiano quando un'associazione pubblica o modifica (/api/rivalida rigenera subito)
export const revalidate = 300;

export const metadata = metadatiCondivisione({
  titolo: "Cercano volontari",
  descrizione: "I turni da volontario delle associazioni di San Marino: pulizie, raccolte, feste. Ti iscrivi con l'SMR ID e guadagni metri per te e il tuo castello.",
  percorso: "/comunita/volontari",
});

/** Le chiamate di volontari delle associazioni (migrazione 0051) */
export default async function PaginaVolontari() {
  const [lista, classifica] = await Promise.all([getChiamate(), getClassifica()]);
  const castelli = classifica.sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome, colore: c.colore }));
  return (
    <>
      <TestaPagina href="/comunita" verso="Comunità" titolo="Cercano volontari">
        <p className="sottotitolo">Le associazioni del territorio chiedono una mano. Ti iscrivi con l&apos;SMR ID; dopo il turno l&apos;associazione segna chi c&apos;era e ti arrivano {METRI_TURNO} m, per te e il tuo castello.</p>
      </TestaPagina>
      <section className="larga flex flex-col gap-6">
        <ElencoChiamate iniziali={lista} castelli={castelli} />
      </section>
    </>
  );
}
