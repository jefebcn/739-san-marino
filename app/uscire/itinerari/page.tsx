import { metadatiCondivisione } from "@/lib/condivisione";
import PaginaSentieri from "@/modules/itinerari/components/PaginaSentieri";
import { SENTIERI } from "@/modules/itinerari/sentieri";

// I sentieri sono nel file dei dati; dal database solo i nomi e i colori dei castelli
export const revalidate = 86400;

export const metadata = metadatiCondivisione({
  titolo: "Itinerari: i sentieri di San Marino",
  descrizione: `I ${SENTIERI.length} sentieri segnati del territorio, dalla Rupe del Monte Titano al Parco di Monte Cerreto: lunghezza, dislivello, profilo, mappa e traccia GPX. Dati di OpenStreetMap.`,
  percorso: "/uscire/itinerari",
  inglese: "/en/trails",
});

/** Itinerari: i sentieri di San Marino da OpenStreetMap (la pagina è in modules/itinerari, uguale in inglese) */
export default function PaginaItinerari() {
  return <PaginaSentieri />;
}
