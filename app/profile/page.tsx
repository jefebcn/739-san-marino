import Profilo from "@/modules/core/components/Profilo";
import { getClassifica } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "SMR ID · 739 San Marino" };

export default async function PaginaProfilo() {
  const castelli = await getClassifica();
  return <Profilo castelli={castelli} />;
}
