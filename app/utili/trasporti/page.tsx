import TestaPagina from "@/components/Indietro";
import Partenze from "@/components/Partenze";
import { getLinee } from "@/lib/servizi";
import { FONTI } from "@/lib/fonti";

export const revalidate = 300;

export const metadata = { title: "Bus e funivia · 739 San Marino" };

export default async function Trasporti() {
  const linee = await getLinee();
  return (
    <>
      <TestaPagina href="/utili" verso="Utili" etichetta="Muoversi" titolo="Bus e funivia" />
      <Partenze linee={linee} />
      <section className="card">
        <h3>Bus interni e bus a chiamata</h3>
        <span style={{ fontSize: 14, color: "var(--testo-2)" }}>
          Le linee AASS (1, 2, 3D, 3S, 4, 5, 6, 7, 47) partono quasi tutte da P9 o P2 a Città e corrono nei giorni feriali.
          Domenica e festivi c&apos;è SMUVI, il bus a chiamata.
        </span>
        <div className="riga-azioni">
          <a className="azione-mini premibile" href="tel:0549883700">Prenota SMUVI · 0549 883700</a>
          <a className="azione-mini premibile" href={FONTI.busInterni} target="_blank" rel="noopener">Orari AASS</a>
        </div>
      </section>
    </>
  );
}
