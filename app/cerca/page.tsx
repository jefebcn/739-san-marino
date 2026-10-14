import Ricerca from "@/components/Ricerca";
import { getClassifica, getEventi, getLuoghi } from "@/lib/data";
import { getLuoghiOsm } from "@/lib/osm";

export const revalidate = 300;

export const metadata = { title: "Cerca · 739 San Marino" };

export default async function Cerca() {
  const [eventi, db, castelli] = await Promise.all([getEventi(80), getLuoghi(), getClassifica()]);
  const luoghi = [...db, ...(await getLuoghiOsm(db))];
  return (
    <>
      <h1 className="sr-only">Cerca</h1>
      <Ricerca eventi={eventi} luoghi={luoghi} castelli={castelli} />
    </>
  );
}
