import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import Partenze from "@/components/Partenze";
import { Icona } from "@/components/Icona";
import { getLinee } from "@/lib/servizi";
import { FONTI } from "@/lib/fonti";
import { metaEn } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = metaEn("Cable car and buses", "Next departures of the San Marino cable car and of the bus from Rimini, with fares and the local buses.", "/utili/trasporti", "/en/transport");

export default async function Transport() {
  const linee = await getLinee();
  return (
    <>
      <TestaPagina href="/en" verso="Today" titolo="Cable car and buses">
        <p className="sottotitolo">The cable car links Borgo Maggiore, at the foot of Monte Titano, with Città, the old town at the top. The bus from Rimini stops just below the old town.</p>
      </TestaPagina>
      <Partenze linee={linee} lingua="en" />
      <section className="card">
        <h3>Local buses and on-demand bus</h3>
        <span style={{ fontSize: 14, color: "var(--testo-2)" }}>
          The AASS lines (1, 2, 3D, 3S, 4, 5, 6, 7, 47) almost all leave from car parks P9 or P2 in Città and run on weekdays.
          On Sundays and public holidays there is SMUVI, a bus you book by phone.
        </span>
        <div className="riga-azioni">
          <a className="azione-mini premibile" href="tel:0549883700">Book SMUVI: 0549 883700</a>
          <a className="azione-mini premibile" href={FONTI.busInterni} target="_blank" rel="noopener" hrefLang="it">AASS timetable (Italian)</a>
        </div>
      </section>
      <Link href="/en/parking" className="bottone secondario premibile"><Icona nome="parcheggio" size={20} /> Car parks and fares</Link>
    </>
  );
}
