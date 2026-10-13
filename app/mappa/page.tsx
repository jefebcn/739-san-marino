import MappaTerritorio from "@/components/MappaTerritorio";
import { getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Mappa · 739 San Marino" };

type Props = { searchParams: Promise<{ luogo?: string }> };

export default async function Mappa({ searchParams }: Props) {
  const [{ luogo }, luoghi] = await Promise.all([searchParams, getLuoghi()]);

  return (
    <>
      <section className="intro">
        <span className="etichetta">Mappa del territorio</span>
        <h1 className="titolo">Tutto quello che c&apos;è, e dove</h1>
      </section>
      {luoghi.length === 0 ? (
        <p className="vuoto">Nessun luogo ancora sulla mappa.</p>
      ) : (
        <MappaTerritorio luoghi={luoghi} focus={luogo} />
      )}
    </>
  );
}
