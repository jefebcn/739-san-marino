import { notFound } from "next/navigation";
import { metaEn } from "@/lib/lingua";
import SchedaSentiero from "@/modules/itinerari/components/SchedaSentiero";
import { SENTIERI, dislivello, durata, km, percorso, sentiero, tempo, titolo } from "@/modules/itinerari/sentieri";

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
  return metaEn(
    titolo(s, "en"),
    [percorso(s, "en"), `${km(s.lunghezza_m, "en")}${d !== null ? `, ${d} m climb` : ""}, about ${durata(tempo(s).minuti)}.`, "Map, elevation profile and GPX track."].filter(Boolean).join(". "),
    `/uscire/itinerari/${s.slug}`,
    `/en/trails/${s.slug}`,
  );
}

/** A trail in English: labels and numbers translated; names and descriptions stay as on OpenStreetMap */
export default async function Trail({ params }: Props) {
  const s = sentiero((await params).slug);
  if (!s) notFound();
  return <SchedaSentiero s={s} lingua="en" />;
}
