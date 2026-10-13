import { getEventi, formatData } from "@/lib/data";

export const revalidate = 60;

export const metadata = { title: "Eventi · 739 San Marino" };

export default async function Eventi() {
  const eventi = await getEventi(50);

  return (
    <>
      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="etichetta">Calendario</span>
        <h1 className="titolo">Eventi sul Titano</h1>
        <p className="sottotitolo">Ogni check-in vale metri per te e per il tuo castello.</p>
      </section>

      {eventi.length === 0 ? (
        <p className="vuoto">Nessun evento in calendario. Aggiungili dal database Supabase, tabella eventi.</p>
      ) : (
        <div className="lista">
          {eventi.map((e) => (
            <article key={e.id} className="card" style={{ alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h3>{e.titolo}</h3>
                <div className="meta">
                  {formatData(e.inizio)}
                  {e.luogo ? ` · ${e.luogo.nome}` : ""}
                </div>
                {e.descrizione ? <p style={{ margin: 0, fontSize: 14, color: "#304556" }}>{e.descrizione}</p> : null}
              </div>
              <span className="metri">+{e.metri} m</span>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
