import Link from "next/link";
import { getClassifica, testoSu } from "@/lib/data";

export const revalidate = 60;

export const metadata = { title: "Castelli · 739 San Marino" };

const fmt = new Intl.NumberFormat("it-IT");

export default async function Castelli() {
  const classifica = await getClassifica();
  const max = Math.max(1, ...classifica.map((c) => c.metri ?? 0));
  const podio = classifica.slice(0, 3);

  return (
    <>
      <section className="intro">
        <span className="etichetta">Classifica in metri · live</span>
        <h1 className="titolo">I nove castelli</h1>
        <p className="sottotitolo">I metri di ogni persona si sommano a quelli del suo castello. Chi arriva più in alto?</p>
      </section>

      {classifica.length === 0 ? (
        <p className="vuoto">La classifica non è disponibile in questo momento.</p>
      ) : (
        <>
          {podio.length === 3 ? (
            <div className="podio" aria-label="Podio">
              {[podio[1], podio[0], podio[2]].map((c) => (
                <Link key={c.id} href={`/castelli/${c.slug}`} className="premibile" style={{ background: c.colore, color: testoSu(c.colore) }}>
                  <em>{classifica.indexOf(c) + 1}°</em>
                  <b>{c.nome}</b>
                  <span>{fmt.format(c.metri ?? 0)} m</span>
                </Link>
              ))}
            </div>
          ) : null}

          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
            {classifica.map((c, i) => (
              <li key={c.id}>
                <Link href={`/castelli/${c.slug}`} className="riga premibile">
                  <span className="pos">{String(i + 1).padStart(2, "0")}</span>
                  <span className="punto" style={{ background: c.colore }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{c.nome}</div>
                    <div className="barra">
                      <span style={{ width: `${Math.max(2, ((c.metri ?? 0) / max) * 100)}%`, background: c.colore }} />
                    </div>
                  </div>
                  <span className="meta">{fmt.format(c.metri ?? 0)} m</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
