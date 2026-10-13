import Link from "next/link";
import { getClassifica, getEventi, oggiLungo, ora, etichettaGiorno, saluto, testoSu } from "@/lib/data";
import { Cime } from "@/components/Logo";
import { Icona } from "@/components/Icona";
import Installa from "@/components/Installa";

export const revalidate = 60;

const fmt = new Intl.NumberFormat("it-IT");

export default async function Home() {
  const [eventi, classifica] = await Promise.all([getEventi(6), getClassifica()]);
  const podio = classifica.slice(0, 3);

  return (
    <>
      <Installa />
      <section className="intro">
        <span className="etichetta">{oggiLungo()}</span>
        <h1 className="titolo">{saluto()}, San Marino</h1>
      </section>

      <section className="quota" aria-label="La tua quota">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 700 }}>La tua quota</span>
          <span className="meta" style={{ color: "#9CCDEA" }}>Valle · 0 / 739 m</span>
        </div>
        <strong>0 m</strong>
        <div className="barra"><span style={{ width: "2%" }} /></div>
        <span style={{ fontSize: 14, color: "#CFE6F4" }}>
          Partecipa agli eventi e fai check-in per salire verso la vetta.
        </span>
        <span className="cime"><Cime width={150} /></span>
      </section>

      <section className="sezione">
        <div className="sezione-head">
          <h2>In arrivo</h2>
          <Link href="/eventi">Tutti</Link>
        </div>
        {eventi.length === 0 ? (
          <p className="vuoto">Nessun evento in calendario per ora.</p>
        ) : (
          <div className="carosello">
            {eventi.map((e) => (
              <Link key={e.id} href={`/eventi/${e.id}`} className="locandina premibile">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="meta">{etichettaGiorno(e.inizio)} · {ora(e.inizio)}</span>
                  <span className="metri">+{e.metri} m</span>
                </div>
                <div>
                  <h3>{e.titolo}</h3>
                  {e.luogo ? <div className="meta" style={{ marginTop: 6 }}>{e.luogo.nome}</div> : null}
                </div>
                <span className="fascia" style={{ background: e.castello?.colore ?? "#5EB6E4" }} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {podio.length === 3 ? (
        <section className="sezione">
          <div className="sezione-head">
            <h2>Castelli in vetta</h2>
            <Link href="/castelli">Classifica</Link>
          </div>
          <div className="podio">
            {[podio[1], podio[0], podio[2]].map((c) => (
              <Link key={c.id} href={`/castelli/${c.slug}`} className="premibile" style={{ background: c.colore, color: testoSu(c.colore) }}>
                <em>{classifica.indexOf(c) + 1}°</em>
                <b>{c.nome}</b>
                <span>{fmt.format(c.metri ?? 0)} m</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="griglia" aria-label="Sezioni">
        <Link href="/mappa" className="tasto premibile"><Icona nome="mappa" /><span>Mappa<small>Luoghi e servizi</small></span></Link>
        <Link href="/eventi" className="tasto premibile"><Icona nome="eventi" /><span>Eventi<small>Il calendario</small></span></Link>
        <Link href="/castelli" className="tasto premibile"><Icona nome="castelli" /><span>Castelli<small>La classifica</small></span></Link>
        <Link href="/utili" className="tasto allerta premibile"><Icona nome="scudo" /><span>Utili<small>Emergenze e servizi</small></span></Link>
      </section>

      <a href="tel:112" className="sos premibile">
        <span>Emergenza?<br /><span style={{ fontWeight: 400, fontSize: 14 }}>Chiama subito</span></span>
        <strong>112</strong>
      </a>
    </>
  );
}
