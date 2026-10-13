import ComingSoon from "@/components/ui/ComingSoon";
import { Icona } from "@/components/Icona";

export const metadata = { title: "Food · 739 San Marino" };

export default function Food() {
  return (
    <ComingSoon
      modulo="Ristorazione e commercio"
      titolo="Mangiare e comprare, a San Marino"
      descrizione="Ristoranti, bar e negozi del territorio collegati al tuo SMR ID."
      icona={<Icona nome="food" />}
      punti={["Locali aperti adesso, con menu e orari", "Vantaggi riservati a chi ha l'SMR ID, con il QR alla cassa", "Prenotazioni e ordini dai locali del tuo castello"]}
    />
  );
}
