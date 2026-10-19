import { metaEn } from "@/lib/lingua";
import PaginaSentieri from "@/modules/itinerari/components/PaginaSentieri";
import { SENTIERI } from "@/modules/itinerari/sentieri";

export const revalidate = 86400;

export const metadata = metaEn(
  "Walking trails",
  `The ${SENTIERI.length} waymarked trails of San Marino, from the Monte Titano cliffs to the Monte Cerreto park: length, climb, elevation profile, map and GPX track. Data from OpenStreetMap.`,
  "/uscire/itinerari",
  "/en/trails",
);

export default function Trails() {
  return <PaginaSentieri lingua="en" />;
}
