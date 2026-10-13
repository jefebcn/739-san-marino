import { getClassifica } from "@/lib/data";

export const revalidate = 60;

export const metadata = { title: "Castelli · 739 San Marino" };

const fmt = new Intl.NumberFormat("it-IT");

export default async function Castelli() {
  const classifica = await getClassifica();
  const max = Math.max(1, ...classifica.map((c) => c.metri ?? 0));

  return (
    <>
      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="etichetta">Classifica in metri</span>
        <h1 className="titolo">I nove castelli</h1>
        <p className="sottotitolo">I metri di ogni persona si sommano a quelli del suo castello.</p>
      </section>

      {classifica.length === 0 ? (
        <p className="vuoto">La classifica non è disponibile. Controlla il collegamento a Supabase.</p>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {classifica.map((c, i) => (
            <li key={c.id} className="riga">
              <span className="meta" style={{ color: "#0B1F2E" }}>{i + 1}</span>
              <span className="punto" style={{ background: c.colore }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{c.nome}</div>
                <div className="barra">
                  <span style={{ width: `${((c.metri ?? 0) / max) * 100}%`, background: c.colore }} />
                </div>
              </div>
              <span className="metri" style={{ color: "#4E6272" }}>{fmt.format(c.metri ?? 0)} m</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
