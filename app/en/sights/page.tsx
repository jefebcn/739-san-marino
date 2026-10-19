import PaginaSezione from "@/components/aree/PaginaSezione";
import { metaEn } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = metaEn("Museums and monuments", "The towers, gates, museums and monuments of San Marino, with opening hours and directions.", "/uscire/cultura", "/en/sights");

export default function Sights() {
  return (
    <PaginaSezione
      area="uscire"
      sezione="cultura"
      lingua="en"
      en={{ titolo: "Museums and monuments", descrizione: "The three towers, the city gates, the State museums and the monuments of the oldest republic in the world." }}
    />
  );
}
