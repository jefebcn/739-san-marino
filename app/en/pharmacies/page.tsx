import TestaPagina from "@/components/Indietro";
import ElencoFarmacie from "@/components/Farmacie";
import { getFarmacie } from "@/lib/servizi";
import { FONTI } from "@/lib/fonti";
import { metaEn } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = metaEn("Pharmacies open now", "Which pharmacies in San Marino are open right now, with opening hours, phone numbers and directions.", "/utili/farmacie", "/en/pharmacies");

export default async function Pharmacies() {
  const farmacie = await getFarmacie();
  return (
    <>
      <TestaPagina href="/en" verso="Today" titolo="Pharmacies open now" />
      <ElencoFarmacie farmacie={farmacie} lingua="en" />
      <p className="fonte">
        Source: <a href={FONTI.farmacie} target="_blank" rel="noopener" hrefLang="it">Istituto per la Sicurezza Sociale</a>. Holiday hours may change. In an emergency call 118.
      </p>
    </>
  );
}
