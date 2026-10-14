import MappaTerritorio from "@/components/MappaTerritorio";
import { getLuoghi, type Luogo } from "@/lib/data";
import { getAvvisi } from "@/lib/avvisi";

export const revalidate = 300;

export const metadata = { title: "Mappa · 739 San Marino" };

type Props = { searchParams: Promise<{ luogo?: string }> };

export default async function Mappa({ searchParams }: Props) {
  const [{ luogo }, db, avvisi] = await Promise.all([searchParams, getLuoghi(), getAvvisi()]);
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
  const luoghi = [...segnali, ...db];

  if (luoghi.length === 0) {
    return (
      <>
        <section className="intro">
          <h1 className="titolo">Tutto quello che c&apos;è, e dove</h1>
        </section>
        <p className="vuoto">Nessun luogo ancora sulla mappa.</p>
      </>
    );
  }

  return <MappaTerritorio luoghi={luoghi} focus={luogo} />;
}
