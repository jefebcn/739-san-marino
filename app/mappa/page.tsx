import MappaTerritorio from "@/components/MappaTerritorio";
import { getLuoghi } from "@/lib/data";

export const revalidate = 300;

export const metadata = { title: "Mappa · 739 San Marino" };

export default async function Mappa() {
  const luoghi = await getLuoghi();

  return (
    <>
      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="etichetta">Mappa del territorio</span>
        <h1 className="titolo">Tutto quello che c&apos;è, e dove</h1>
      </section>

      <MappaTerritorio luoghi={luoghi} />

      <section className="lista" aria-label="Luoghi">
        {luoghi.length === 0 ? (
          <p className="vuoto">Nessun luogo ancora. Aggiungili dal database Supabase, tabella luoghi.</p>
        ) : (
          luoghi.map((l) => (
            <article key={l.id} className="card">
              <div>
                <h3>{l.nome}</h3>
                <div className="meta">{l.categoria}{l.descrizione ? ` · ${l.descrizione}` : ""}</div>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
