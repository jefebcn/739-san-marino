import PaginaSezione from "@/components/aree/PaginaSezione";
import { metaEn } from "@/lib/lingua";

export const revalidate = 300;

export const metadata = metaEn("Where to stay", "Hotels, bed and breakfasts, apartment hotels and campsites in San Marino, with phone numbers and directions.", "/uscire/dormire", "/en/stay");

export default function Stay() {
  return (
    <PaginaSezione
      area="uscire"
      sezione="dormire"
      lingua="en"
      en={{ titolo: "Where to stay", descrizione: "Hotels, bed and breakfasts and apartment hotels, in the old town and in the other castelli." }}
    />
  );
}
