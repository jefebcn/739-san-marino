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
 * Nello stile del logo: nero pieno, il marchio grande, il titolo largo e corsivo come il 739, il pulsante bianco col taglio obliquo;
 * sotto le sei funzioni in una griglia a filo (telefono 2 colonne col solo titolo, computer 3 colonne col dato di adesso).
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
    // Nero pieno come il logo sul fondo scuro: niente grigi, niente colore; il marchio grande a sinistra
    <section aria-labelledby="benvenuto" className="per-nuovi flex flex-col gap-5 overflow-hidden rounded-2xl bg-[#09090B] px-5 py-6 text-white lg:gap-10 lg:px-12 lg:py-12">
      <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:gap-14 lg:text-left">
        {/* Sul telefono il 739 è già nella testata: il marchio grande solo su computer */}
        <Completo etichetta="739 San Marino" className="hidden h-56 w-auto shrink-0 text-white lg:block" />
        <div className="flex flex-col items-center gap-4 lg:items-start">
          <h2 id="benvenuto" className="voce-logo text-[30px] text-white [text-wrap:balance] lg:text-[52px]">
            San Marino, tutta in un&apos;app
          </h2>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-zinc-400 [text-wrap:pretty] lg:text-[18px]">
            Per chi ci vive, gratis: i servizi aperti adesso, cosa succede oggi, dove andare e il tuo castello. Si apre al mattino e si sa già tutto.
          </p>
          <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:gap-6">
            <a href="#castello" className="taglio inline-flex h-12 items-center justify-center gap-2 bg-white text-[15px] font-semibold text-[#09090B] transition-transform active:scale-[0.98]">
              Scegli il tuo castello <Icona nome="vai" size={18} />
            </a>
            <Link href="/guida" className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-white hover:underline">Come funziona</Link>
          </div>
        </div>
      </div>

      {/* Le sei cose che fa 739: telefono 2 colonne col solo titolo, computer 3 colonne col dato di adesso */}
      <ul className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 lg:grid-cols-3">
        {funzioni.map((f) => (
          <li key={f.href} className="bg-[#09090B]">
            <Link
              href={f.href}
              prefetch={f.senzaPrefetch ? false : undefined}
              className="flex h-full items-center gap-2.5 p-3 transition-colors hover:bg-white/[0.06] lg:items-start lg:gap-3.5 lg:p-5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-white lg:size-11"><Icona nome={f.icona} size={22} /></span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[13px] font-semibold leading-tight text-white lg:text-[15px] lg:leading-snug">{f.titolo}</span>
                {/* Sul telefono basta il titolo: i dati di adesso sono subito sotto, in «Adesso» */}
                <span className="hidden text-[13px] leading-snug text-zinc-400 lg:block [&_b]:text-white">{f.riga}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
