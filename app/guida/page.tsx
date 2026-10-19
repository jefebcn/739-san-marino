import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Completo } from "@/components/Logo";
import Tano from "@/components/Tano";
import { Icona, type NomeIcona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { AREE } from "@/lib/aree";

export const metadata = { title: "Come funziona · 739 San Marino" };

const COSA_TROVI: { href: string; icona: NomeIcona; titolo: string; testo: string }[] = [
  { href: "/", icona: "home", titolo: "Oggi", testo: "La porta: cosa succede adesso, il meteo, i servizi aperti." },
  ...AREE.map((a) => ({ href: a.href, icona: a.icona, titolo: a.nome, testo: a.descrizione })),
  { href: "/mappa", icona: "mappa", titolo: "Mappa", testo: "Luoghi, parcheggi, farmacie e servizi, con le indicazioni." },
  { href: "/profile", icona: "id", titolo: "SMR ID", testo: "La tua tessera digitale con QR personale." },
];

const PASSI = [
  { titolo: "Crea il tuo SMR ID", testo: "Nome, email e castello: ricevi la tessera digitale con il QR." },
  { titolo: "Vai a un evento o a una partita", testo: "Concerti, tornei, serate e partite tra residenti." },
  { titolo: "Sali di quota", testo: "Ogni partecipazione vale metri per te e per il tuo castello. La vetta è a 739 m." },
  { titolo: "Ritira i premi", testo: "Le attività del territorio premiano chi sale: mostri il QR del tuo SMR ID e il titolare ti consegna il premio." },
];

/** Guida di benvenuto: cosa c'è in 739 e come funzionano i metri. */
export default function Guida() {
  return (
    <>
      <TestaPagina href="/" verso="Oggi" titolo="Come funziona 739">
        <p className="sottotitolo">Tutto San Marino in un&apos;app: cosa succede, dove andare, cosa serve. E una sfida tra i nove castelli.</p>
      </TestaPagina>

      <div className="flex items-end justify-center gap-6 overflow-hidden rounded-2xl bg-superficie px-6 pt-6">
        <Completo etichetta="739 San Marino" className="mb-8 h-28 w-auto text-testo" />
        {/* Tano saluta in apertura della guida */}
        <Tano posa="saluta" priority className="h-44 w-auto lg:h-52" />
      </div>

      <section className="sezione">
        <div className="sezione-head"><h2>Cosa trovi</h2></div>
        <div className="lista">
          {COSA_TROVI.map((v) => (
            <Link key={v.href} href={v.href} prefetch={v.href.startsWith("/mappa") ? false : undefined} className="spiega premibile">
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
      <p className="flex justify-center gap-4 text-xs lg:hidden">
        <Link href="/privacy" className="py-2 text-testo-2 underline underline-offset-2">Privacy</Link>
        <Link href="/termini" className="py-2 text-testo-2 underline underline-offset-2">Termini d&apos;uso</Link>
      </p>
    </>
  );
}
