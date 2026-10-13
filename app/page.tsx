import Link from "next/link";
import { getEventi, formatData } from "@/lib/data";

export const revalidate = 60;

export default async function Home() {
  const eventi = await getEventi(3);

  return (
    <>
      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="etichetta">Tutto San Marino, dalla vetta</span>
        <h1 className="titolo">Cosa succede oggi a San Marino</h1>
      </section>

      <section className="quota" aria-label="La tua quota">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 700 }}>La tua quota</span>
          <span className="meta" style={{ color: "#9CCDEA" }}>Valle</span>
        </div>
        <strong>0 m</strong>
        <div className="barra"><span style={{ width: "0%" }} /></div>
        <span style={{ fontSize: 14, color: "#CFE6F4" }}>
          Fai check-in agli eventi per salire verso i 739 m. L&apos;accesso arriva nel prossimo passo.
        </span>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ fontSize: 20 }}>Prossimi eventi</h2>
          <Link href="/eventi" className="meta">Tutti</Link>
        </div>
        {eventi.length === 0 ? (
          <p className="vuoto">Nessun evento in calendario. Aggiungili dal database Supabase, tabella eventi.</p>
        ) : (
          <div className="lista">
            {eventi.map((e) => (
              <article key={e.id} className="card">
                <div>
                  <h3>{e.titolo}</h3>
                  <div className="meta">
                    {formatData(e.inizio)}
                    {e.luogo ? ` · ${e.luogo.nome}` : ""}
                  </div>
                </div>
                <span className="metri">+{e.metri} m</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="griglia" aria-label="Sezioni">
        <Link href="/mappa" className="tasto">Mappa<span>Luoghi e parcheggi</span></Link>
        <Link href="/eventi" className="tasto">Eventi<span>Il calendario</span></Link>
        <Link href="/castelli" className="tasto">Castelli<span>La classifica</span></Link>
        <Link href="/utili" className="tasto allerta">Utili ed emergenze<span>Numeri e servizi</span></Link>
      </section>
    </>
  );
}
