import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";

export const metadata = { title: "Come funziona · 739 San Marino" };

const COSA_TROVI = [
  { href: "/sport", icona: "sport", titolo: "Sport", testo: "Partite e tornei locali, squadre bilanciate dal tuo rating." },
  { href: "/eventi", icona: "eventi", titolo: "Eventi", testo: "Cosa succede oggi e nel weekend, in tutti i castelli." },
  { href: "/mappa", icona: "mappa", titolo: "Mappa", testo: "Luoghi, parcheggi, farmacie e servizi, con le indicazioni." },
  { href: "/utili", icona: "scudo", titolo: "Utili", testo: "Emergenze, farmacie aperte, funivia, bus, raccolta rifiuti." },
  { href: "/castelli", icona: "castelli", titolo: "Castelli", testo: "La sfida tra i nove castelli: chi sale più in alto?" },
  { href: "/profile", icona: "id", titolo: "SMR ID", testo: "La tua tessera digitale con QR personale." },
] as const;

const PASSI = [
  { titolo: "Crea il tuo SMR ID", testo: "Nome, email e castello: ricevi la tessera digitale con il QR." },
  { titolo: "Vai a un evento o a una partita", testo: "Concerti, tornei, serate e partite tra residenti." },
  { titolo: "Sali di quota", testo: "Ogni partecipazione vale metri per te e per il tuo castello. La vetta è a 739 m." },
];

/** Guida di benvenuto: cosa c'è in 739 e come funzionano i metri. */
export default function Guida() {
  return (
    <>
      <TestaPagina href="/" verso="Home" etichetta="Benvenuto" titolo="Come funziona 739">
        <p className="sottotitolo">Tutto San Marino in un&apos;app: cosa succede, dove andare, cosa serve. E una sfida tra i nove castelli.</p>
      </TestaPagina>

      <section className="sezione">
        <div className="sezione-head"><h2>Cosa trovi</h2></div>
        <div className="lista">
          {COSA_TROVI.map((v) => (
            <Link key={v.href} href={v.href} className="spiega premibile">
              <span className="icona-tonda"><Icona nome={v.icona} /></span>
              <span><b>{v.titolo}</b><span>{v.testo}</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sezione">
        <div className="sezione-head"><h2>Come funzionano i metri</h2></div>
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

      <PrimaryButton href="/profile" pieno>Crea il tuo SMR ID</PrimaryButton>
    </>
  );
}
