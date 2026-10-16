import Link from "next/link";
import type { ReactNode } from "react";
import { Icona, type NomeIcona } from "@/components/Icona";
import { Completo } from "@/components/Logo";
import { ConteggioAperte } from "@/components/Farmacie";
import type { Luogo } from "@/lib/data";

const fmt = new Intl.NumberFormat("it-IT");

type Funzione = { href: string; icona: NomeIcona; titolo: string; riga: ReactNode; senzaPrefetch?: boolean };

/**
 * Il benvenuto di Oggi per chi arriva la prima volta (richiesta di Alex, 16/10/2026): sotto il saluto, in poche righe,
 * a cosa serve 739 e cosa sa fare, con i dati veri di adesso. Ogni funzione porta alla sua pagina.
 * Telefono: il messaggio e le funzioni in tessere piccole (solo il titolo); computer: il messaggio a sinistra, le funzioni con i dati in griglia a destra.
 */
export default function Benvenuto({ farmacie, luoghi, eventi }: { farmacie: Luogo[]; luoghi: number; eventi: number }) {
  const funzioni: Funzione[] = [
    { href: "/vivere", icona: "farmacia", titolo: "Cosa è aperto adesso", riga: <><ConteggioAperte farmacie={farmacie} breve />, la funivia, i parcheggi</> },
    { href: "/bollettino", icona: "storie", titolo: "Il Bollettino delle 7:39", riga: "Ogni mattina meteo, avvisi e cosa succede" },
    { href: "/mappa", icona: "mappa", titolo: "La mappa del Titano", riga: luoghi ? <><b className="font-mono font-medium text-white">{fmt.format(luoghi)}</b> luoghi, dai parcheggi ai ristoranti</> : "Parcheggi, musei, ristoranti", senzaPrefetch: true },
    { href: "/eventi", icona: "eventi", titolo: "Eventi e partite", riga: eventi ? <><b className="font-mono font-medium text-white">{eventi}</b> {eventi === 1 ? "evento" : "eventi"} questa settimana, partite a squadre pari</> : "Il calendario e le partite a squadre pari" },
    { href: "/castelli", icona: "castelli", titolo: "I nove castelli", riga: "Il tuo castello: rifiuti, avvisi e classifica" },
    { href: "/vivere/avvisi", icona: "avvisi", titolo: "Avvisi e chiusure", riga: "Strade chiuse e servizi sospesi, appena succede" },
  ];

  return (
    <section aria-labelledby="benvenuto" className="per-nuovi pannello topo !gap-6 !p-5 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:!gap-12 lg:!p-10">
      <div className="relative z-[1] flex flex-col gap-4">
        <Completo etichetta="739 San Marino" className="hidden h-16 w-auto self-start text-white lg:block" />
        <h2 id="benvenuto" className="text-[28px] font-semibold leading-[1.08] tracking-tight text-white [text-wrap:balance] lg:text-[42px]">
          San Marino, tutta in un&apos;app
        </h2>
        <p className="max-w-[44ch] text-[15px] leading-relaxed text-[var(--pannello-testo)] lg:text-[17px]">
          Per chi ci vive, gratis: i servizi aperti adesso, cosa succede oggi, dove andare e il tuo castello. Si apre al mattino e si sa già tutto.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
          <a href="#castello" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-metallo px-5 text-[15px] font-semibold text-su-accento transition-transform active:scale-[0.98]">
            Scegli il tuo castello <Icona nome="vai" size={18} />
          </a>
          <Link href="/guida" className="text-sm font-medium text-[var(--pannello-testo)] hover:text-white">Come funziona</Link>
        </div>
      </div>

      <ul className="relative z-[1] grid grid-cols-2 gap-2 lg:gap-3">
        {funzioni.map((f) => (
          <li key={f.href}>
            <Link
              href={f.href}
              prefetch={f.senzaPrefetch ? false : undefined}
              className="flex h-full items-center gap-2.5 rounded-xl bg-white/[0.06] p-2.5 transition-colors hover:bg-white/[0.11] lg:flex-col lg:items-start lg:gap-2 lg:p-4"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-white lg:size-10"><Icona nome={f.icona} size={22} /></span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[13px] font-semibold leading-tight text-white lg:text-[15px] lg:leading-snug">{f.titolo}</span>
                {/* Sul telefono basta il titolo: i dati di adesso sono subito sotto, in «Adesso» */}
                <span className="hidden text-[13px] leading-snug text-[var(--pannello-testo)] lg:block [&_b]:text-white">{f.riga}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
