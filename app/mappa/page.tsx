import MappaTerritorio from "@/components/MappaTerritorio";
import { getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Mappa · 739 San Marino" };

type Props = { searchParams: Promise<{ luogo?: string }> };

export default async function Mappa({ searchParams }: Props) {
  const [{ luogo }, luoghi] = await Promise.all([searchParams, getLuoghi()]);

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
