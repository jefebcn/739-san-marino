import ComingSoon from "@/components/ui/ComingSoon";
import { Icona } from "@/components/Icona";

export const metadata = { title: "Sport · 739 San Marino" };

// Segnaposto: il modulo Sport & Eventi arriva con lo step 4.
export default function Sport() {
  return (
    <ComingSoon
      modulo="Sport & Eventi"
      titolo="Gioca, sfida, sali in classifica"
      descrizione="Partite e tornei locali con squadre bilanciate dal tuo rating."
      icona={<Icona nome="sport" />}
      punti={["Trova una partita vicino a te", "Squadre equilibrate con il rating Glicko-2", "Classifiche per sport e per castello"]}
    />
  );
}
