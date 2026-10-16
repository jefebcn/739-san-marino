import TestaPagina from "@/components/Indietro";
import ElencoFarmacie from "@/components/Farmacie";
import { getFarmacie } from "@/lib/servizi";
import { FONTI } from "@/lib/fonti";
import { alternati } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = { title: "Farmacie · 739 San Marino", alternates: alternati("/utili/farmacie", "/en/pharmacies", "it") };

export default async function Farmacie() {
  const farmacie = await getFarmacie();
  return (
    <>
      <TestaPagina href="/vivere" verso="Vivere" etichetta="Salute" titolo="Farmacie aperte" />
      <ElencoFarmacie farmacie={farmacie} />
      <p className="fonte">
        Fonte: <a href={FONTI.farmacie} target="_blank" rel="noopener">Istituto per la Sicurezza Sociale</a>. Gli orari dei festivi possono cambiare. In caso di urgenza chiama il 118.
      </p>
    </>
  );
}
