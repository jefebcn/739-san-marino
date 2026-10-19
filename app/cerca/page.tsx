import Ricerca from "@/components/Ricerca";
import { getClassifica, getEventi, getLuoghi, getPratiche } from "@/lib/data";
import { SENTIERI, km, percorso, titolo } from "@/modules/itinerari/sentieri";

export const revalidate = 300;

export const metadata = { title: "Cerca · 739 San Marino" };

export default async function Cerca() {
  const [eventi, luoghi, castelli, pratiche] = await Promise.all([getEventi(80), getLuoghi(), getClassifica(), getPratiche(["ufficio", "salute"])]);
  return (
    <>
      <h1 className="sr-only">Cerca</h1>
      <Ricerca
        eventi={eventi}
        luoghi={luoghi}
        castelli={castelli}
        pratiche={pratiche}
        sentieri={SENTIERI.map((s) => ({ slug: s.slug, titolo: titolo(s), sotto: [percorso(s), km(s.lunghezza_m)].filter(Boolean).join(", "), testo: [s.da, s.a, s.via].filter(Boolean).join(" ") }))}
      />
    </>
  );
}
