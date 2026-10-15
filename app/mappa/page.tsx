import MappaTerritorio from "@/components/MappaTerritorio";
import { getLuogo, type Luogo } from "@/lib/data";
import { getAvvisi } from "@/lib/avvisi";

export const revalidate = 300;

export const metadata = { title: "Mappa · 739 San Marino" };

type Props = { searchParams: Promise<{ luogo?: string }> };

// I luoghi non viaggiano più nella pagina: la mappa li chiede al database per l'area che si guarda (lib/mappa-dati.ts).
// Qui arrivano solo gli avvisi con una posizione e, con ?luogo=, il luogo da aprire subito.
export default async function Mappa({ searchParams }: Props) {
  const { luogo } = await searchParams;
  const [avvisi, iniziale] = await Promise.all([getAvvisi(), luogo && /^[0-9a-f-]{36}$/.test(luogo) ? getLuogo(luogo) : null]);
  // Gli avvisi con una posizione compaiono sulla mappa come segnali (categoria «avviso», area Vivere)
  const segnali: Luogo[] = avvisi
    .filter((a) => a.lat != null || a.luogo)
    .map((a) => ({
      id: `avviso-${a.id}`,
      nome: a.titolo,
      categoria: "avviso",
      descrizione: a.testo,
      lat: a.lat ?? a.luogo!.lat,
      lng: a.lng ?? a.luogo!.lng,
      castello_id: a.castello_id,
      indirizzo: a.luogo?.nome ?? null,
      telefono: null,
      orari: null,
      tariffa: null,
      posti: null,
      da_verificare: false,
      orari_settimana: null,
      fonte: "avviso",
    }));

  return <MappaTerritorio segnali={segnali} iniziale={iniziale} />;
}
