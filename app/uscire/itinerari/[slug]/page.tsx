import { notFound } from "next/navigation";
import { metadatiCondivisione } from "@/lib/condivisione";
import SchedaSentiero from "@/modules/itinerari/components/SchedaSentiero";
import { SENTIERI, dislivello, durata, km, percorso, sentiero, tempo, titolo } from "@/modules/itinerari/sentieri";

// I luoghi lungo il percorso cambiano poco: la pagina si rifà una volta al giorno
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return SENTIERI.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const s = sentiero((await params).slug);
  if (!s) return {};
  const d = dislivello(s);
  return metadatiCondivisione({
    titolo: titolo(s),
    descrizione: [percorso(s), `${km(s.lunghezza_m)}${d !== null ? `, ${d} m di dislivello` : ""}, circa ${durata(tempo(s).minuti)}.`, "Mappa, profilo altimetrico e traccia GPX."].filter(Boolean).join(". "),
    percorso: `/uscire/itinerari/${s.slug}`,
    inglese: `/en/trails/${s.slug}`,
  });
}

/** Un sentiero (la pagina è in modules/itinerari, uguale in inglese) */
export default async function PaginaSentiero({ params }: Props) {
  const s = sentiero((await params).slug);
  if (!s) notFound();
  return <SchedaSentiero s={s} />;
}
