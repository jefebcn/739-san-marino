import TestaPagina from "@/components/Indietro";
import MiePrenotazioni from "@/modules/prenotazioni/components/MiePrenotazioni";

export const metadata = { title: "Le mie prenotazioni · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaMiePrenotazioni() {
  return (
    <>
      <TestaPagina href="/profile" verso="SMR ID" titolo="Le mie prenotazioni">
        <p className="sottotitolo">Campi, sale e servizi prenotati con 739 nei centri del territorio.</p>
      </TestaPagina>
      <MiePrenotazioni />
    </>
  );
}
