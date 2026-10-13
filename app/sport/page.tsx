import SportHome from "@/modules/sport/components/SportHome";
import { getSport } from "@/modules/sport/dati";
import { getClassifica } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Sport · 739 San Marino" };

export default async function Sport() {
  const [sport, castelli] = await Promise.all([getSport(), getClassifica()]);
  return <SportHome sport={sport} castelli={castelli} />;
}
