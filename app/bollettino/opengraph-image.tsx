import { anteprima, DIMENSIONI } from "@/lib/anteprima";
import { oggiLungo } from "@/lib/data";
import { cielo, getMeteo, gradi } from "@/lib/meteo";

export const alt = "Il Bollettino di 739 San Marino";
export const size = DIMENSIONI;
export const contentType = "image/png";
// La data cambia ogni giorno: l'immagine si rifà ogni ora
export const revalidate = 3600;

export default async function Anteprima() {
  const meteo = await getMeteo();
  const tempo = meteo ? `${cielo(meteo.codice, meteo.giorno).testo}, ${gradi(meteo.temperatura)}` : null;
  return anteprima({
    etichetta: oggiLungo().replace(/^./, (x) => x.toUpperCase()),
    titolo: "Il Bollettino delle 7:39",
    sotto: tempo ? `A San Marino: ${tempo.toLowerCase()}. Eventi, farmacie, funivia e raccolta di oggi.` : "Eventi, farmacie, funivia e raccolta di oggi.",
  });
}
