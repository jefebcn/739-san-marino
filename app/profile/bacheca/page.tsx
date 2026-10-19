import TestaPagina from "@/components/Indietro";
import MieiAnnunci from "@/modules/bacheca/components/MieiAnnunci";

export const metadata = { title: "I miei annunci · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaMieiAnnunci() {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="I miei annunci">
        <p className="sottotitolo">Quello che hai scritto in bacheca, con lo stato e la risposta della redazione.</p>
      </TestaPagina>
      <MieiAnnunci />
    </>
  );
}
