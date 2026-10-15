import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import EventoRiga from "@/components/EventoRiga";
import { Icona } from "@/components/Icona";
import { Vuoto } from "@/components/Tano";
import { chiaveGiorno, etichettaGiorno, getEventiPerChi, type Evento } from "@/lib/data";
import { PER_LAVORO } from "@/lib/eventi-lavoro";

export const revalidate = 300;

export const metadata = {
  title: "Fiere e convegni · 739 San Marino",
  description: "Fiere, convegni e incontri per professionisti e aziende a San Marino.",
};

/** Fiere e convegni (Lavorare): gli eventi in calendario per professionisti e aziende */
export default async function Fiere() {
  const eventi = await getEventiPerChi(PER_LAVORO, 60);
  const gruppi: { chiave: string; etichetta: string; eventi: Evento[] }[] = [];
  for (const e of eventi) {
    const k = chiaveGiorno(e.inizio);
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.chiave === k) ultimo.eventi.push(e);
    else gruppi.push({ chiave: k, etichetta: etichettaGiorno(e.inizio), eventi: [e] });
  }
  return (
    <>
      <TestaPagina href="/lavorare" verso="Lavorare" titolo="Fiere e convegni">
        <p className="sottotitolo">Fiere, convegni e incontri per chi lavora a San Marino, dal calendario di 739.</p>
      </TestaPagina>

      {gruppi.length === 0 ? (
        <Vuoto
          titolo="Nessuna fiera o convegno in calendario"
          testo="Organizzi un incontro per professionisti e aziende? Proponilo: la redazione lo controlla e lo pubblica."
          azione={{ href: "/eventi/proponi?per=lavoro", testo: "Proponi un evento" }}
        />
      ) : (
        <>
          {gruppi.map((g) => (
            <section key={g.chiave} className="sezione larga" style={{ gap: 10 }}>
              <h2 className="giorno">{g.etichetta}</h2>
              <div className="lista lg:grid lg:grid-cols-2">
                {g.eventi.map((e) => <EventoRiga key={e.id} e={e} />)}
              </div>
            </section>
          ))}
          <Link href="/eventi/proponi?per=lavoro" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-accento">
            <Icona nome="piu" size={16} /> Proponi una fiera o un convegno
          </Link>
        </>
      )}
    </>
  );
}
