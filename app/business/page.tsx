import ComingSoon from "@/components/ui/ComingSoon";
import { Icona } from "@/components/Icona";

export const metadata = { title: "Business · 739 San Marino" };

export default function Business() {
  return (
    <ComingSoon
      modulo="Network aziendale"
      titolo="Le imprese di San Marino, in rete"
      descrizione="Uno spazio per aziende e professionisti del territorio."
      icona={<Icona nome="business" />}
      punti={["Profilo aziendale verificato", "Contatti e opportunità tra imprese sammarinesi", "Strumenti per raggiungere chi usa 739"]}
    />
  );
}
