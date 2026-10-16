import PaginaSezione from "@/components/aree/PaginaSezione";
import { metaEn } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = metaEn("Where to eat and drink", "Restaurants, pizzerias, piadina bars, cafés and ice cream in San Marino, with opening hours and directions.", "/uscire/mangiare", "/en/eat");

export default function Eat() {
  return (
    <PaginaSezione
      area="uscire"
      sezione="mangiare"
      lingua="en"
      en={{ titolo: "Where to eat and drink", descrizione: "Restaurants, pizzerias, piadina bars, cafés and ice cream across the nine castelli. Try a piadina: the flatbread of Romagna and San Marino." }}
    />
  );
}
