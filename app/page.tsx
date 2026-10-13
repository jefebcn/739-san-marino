import Link from "next/link";
import { getClassifica, getEventi, oggiLungo, ora, etichettaGiorno, saluto, testoSu } from "@/lib/data";
import { Cime } from "@/components/Logo";
import { Icona } from "@/components/Icona";
import Installa from "@/components/Installa";
import { MioCastello, RiapriGuida, ScegliCastello } from "@/components/Castello";
import { EtichetteScala, Scala } from "@/components/Quota";
import { ProssimaPartenza } from "@/components/Partenze";
import { livello } from "@/lib/quota";
import { ConteggioAperte } from "@/components/Farmacie";
import { getFarmacie, getLinee } from "@/lib/servizi";

export const revalidate = 60;

const fmt = new Intl.NumberFormat("it-IT");

const COSA_TROVI = [
  { href: "/eventi", icona: "eventi", titolo: "Eventi", testo: "Cosa succede oggi e nel weekend, in tutti i castelli." },
  { href: "/mappa", icona: "mappa", titolo: "Mappa", testo: "Luoghi, parcheggi e servizi, con le indicazioni per arrivarci." },
  { href: "/castelli", icona: "castelli", titolo: "Castelli", testo: "La sfida tra i nove castelli: chi sale più in alto?" },
  { href: "/utili", icona: "scudo", titolo: "Utili", testo: "Numeri di emergenza e servizi, sempre a portata di mano." },
] as const;

const PASSI = [
  { titolo: "Vai a un evento", testo: "Concerti, tornei, serate: trovi tutto nel calendario." },
  { titolo: "Fai check-in", testo: "Ogni partecipazione ti fa salire di qualche metro." },
  { titolo: "Porta in alto il tuo castello", testo: "I tuoi metri si sommano a quelli del tuo castello. La vetta è a 739 m." },
];

export default async function Home() {
  const [eventi, classifica, farmacie, linee] = await Promise.all([getEventi(6), getClassifica(), getFarmacie(), getLinee()]);
  const podio = classifica.slice(0, 3);
  const funivia = linee.find((l) => l.tipo === "funivia");
  // I metri personali arriveranno con l'accesso.
  const metri = 0;
  const { prossimo, mancano } = livello(metri);

  return (
    <>
      {/* ——— Per chi arriva la prima volta ——— */}
      <section className="benvenuto topo per-nuovi">
        <span className="etichetta" style={{ color: "var(--ottone-chiaro)" }}>Benvenuto su 739</span>
        <h1>Tutto San Marino in un&apos;app</h1>
        <p>Cosa succede, dove andare, cosa serve. E una sfida tra i nove castelli: chi arriva più in alto?</p>
        <div className="cta">
          <a href="#scegli" className="bottone primario-chiaro premibile">Scegli il tuo castello</a>
          <a href="#in-arrivo" className="bottone fantasma premibile">Cosa c&apos;è in arrivo</a>
        </div>
        <span className="cime-sfondo"><Cime width={260} /></span>
      </section>

      <section className="sezione per-nuovi" aria-labelledby="t-cosa">
        <div className="sezione-head"><h2 id="t-cosa">Cosa trovi</h2></div>
        <div className="lista">
          {COSA_TROVI.map((v) => (
            <Link key={v.href} href={v.href} className="spiega premibile">
              <span className="icona-tonda"><Icona nome={v.icona} /></span>
              <span><b>{v.titolo}</b><span>{v.testo}</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sezione per-nuovi" aria-labelledby="t-metri">
        <div className="sezione-head"><h2 id="t-metri">Come funzionano i metri</h2></div>
        <ol className="passi">
          {PASSI.map((p, i) => (
            <li key={p.titolo}>
              <span className="numero">{i + 1}</span>
              <span><b>{p.titolo}</b><span>{p.testo}</span></span>
            </li>
          ))}
        </ol>
        <div className="salita" aria-label="Livelli da 0 a 739 metri">
          <div className="salita-barra"><span /><span /><span /><span /></div>
          <div className="salita-livelli">
            <span>Valle<small>0 m</small></span>
            <span>Mura<small>200 m</small></span>
            <span>Torri<small>450 m</small></span>
            <span>Vetta<small>739 m</small></span>
          </div>
        </div>
      </section>

      <section className="sezione per-nuovi" id="scegli" aria-labelledby="t-scegli">
        <div className="sezione-head"><h2 id="t-scegli">Scegli il tuo castello</h2></div>
        <p className="sottotitolo">Dove vivi o quello che senti tuo. Puoi cambiarlo quando vuoi.</p>
        <ScegliCastello castelli={classifica} />
      </section>

      {/* ——— Per chi torna ——— */}
      <section className="intro per-tornati">
        <span className="etichetta">{oggiLungo()}</span>
        <h1 className="titolo">{saluto()}!</h1>
      </section>

      <section className="pannello quota topo cornice per-tornati" aria-label="La tua quota">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <span className="etichetta">La tua quota</span>
          <span className="etichetta">Vetta 739 m</span>
        </div>
        <span className="quota-num">{metri}<small>m</small></span>
        <div style={{ color: "var(--pannello-testo)" }}>
          <Scala metri={metri} grande />
          <EtichetteScala />
        </div>
        <p style={{ fontSize: 14, color: "var(--pannello-testo)" }}>
          {prossimo ? <>Mancano <b style={{ color: "#fff" }}>{mancano} m</b> a {prossimo.nome}. </> : null}
          I check-in agli eventi si attivano con l&apos;accesso, in arrivo.
        </p>
        <span className="cime"><Cime width={170} /></span>
      </section>

      <div className="per-tornati" style={{ display: "contents" }}>
        <Installa />
        <MioCastello classifica={classifica} />
      </div>

      <section className="sezione per-tornati" aria-labelledby="t-adesso">
        <div className="sezione-head"><h2 id="t-adesso">Adesso</h2><Link href="/utili">Utili</Link></div>
        <div className="adesso">
          <Link href="/utili/farmacie" className="premibile">
            <span className="etichetta" style={{ color: "var(--segnale)" }}>Farmacie</span>
            <ConteggioAperte farmacie={farmacie} />
            <span className="meta">Cailungo sempre aperta</span>
          </Link>
          <Link href="/utili/trasporti" className="premibile">
            <span className="etichetta">Prossima funivia</span>
            {funivia ? <ProssimaPartenza partenze={funivia.partenze.filter((p) => p.direzione === "Borgo Maggiore → Città")} /> : <b>Orari in arrivo</b>}
            <span className="meta">da Borgo a Città</span>
          </Link>
        </div>
      </section>

      {/* ——— Per tutti ——— */}
      <section className="sezione" id="in-arrivo">
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
        <Link href="/utili" className="tasto allerta premibile"><Icona nome="scudo" /><span>Utili<small>Emergenze e servizi</small></span></Link>
        <Link href="/castelli" className="tasto premibile"><Icona nome="castelli" /><span>Castelli<small>La classifica</small></span></Link>
        <Link href="/food" className="tasto premibile"><Icona nome="food" /><span>Food<small>In arrivo</small></span></Link>
        <Link href="/business" className="tasto premibile"><Icona nome="business" /><span>Business<small>In arrivo</small></span></Link>
      </section>

      <a href="tel:112" className="sos premibile">
        <span>Emergenza?<br /><span style={{ fontWeight: 400, fontSize: 14 }}>Chiama subito</span></span>
        <strong>112</strong>
      </a>

      <div className="per-tornati" style={{ textAlign: "center" }}>
        <RiapriGuida />
      </div>
    </>
  );
}
