import PaginaSezione from "@/components/aree/PaginaSezione";
import { metaEn } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = metaEn("Viewpoints", "The viewpoints of San Marino: from Monte Titano you can see the Adriatic coast and the Apennines.", "/uscire/natura", "/en/viewpoints");

export default function Viewpoints() {
  return (
    <PaginaSezione
      area="uscire"
      sezione="natura"
      lingua="en"
      en={{ titolo: "Viewpoints", descrizione: "From Monte Titano, 739 metres high, on a clear day you can see the Adriatic coast and the Apennines." }}
    />
  );
}
