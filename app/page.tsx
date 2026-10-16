import Link from "next/link";
import type { ReactNode } from "react";
import { chiaveGiorno, getClassifica, getDaScoprire, getEventi, oggiLungo, ora, saluto, giornoNumero, meseBreve } from "@/lib/data";
import { Icona, type NomeIcona } from "@/components/Icona";
import { AREE } from "@/lib/aree";
import Installa from "@/components/Installa";
import { EmblemaCastello } from "@/components/LogoCastello";
import { ProssimaPartenza } from "@/components/Partenze";
import { ConteggioAperte } from "@/components/Farmacie";
import { getFarmacie, getLinee, getParcheggi, getRaccolta } from "@/lib/servizi";
import { getPartiteAperte, getSport } from "@/modules/sport/dati";
import { cielo, getMeteo, gradi } from "@/lib/meteo";
import { getAvvisi, inCorso } from "@/lib/avvisi";
import Programma from "@/components/oggi/Programma";
import DaScoprire from "@/components/oggi/DaScoprire";
import IlTuoCastello from "@/components/oggi/IlTuoCastello";
import { fasciaDi, nelPeriodo } from "@/lib/oggi";
import { getUltimo } from "@/lib/contenuti";
import { getSpecialeInCorso } from "@/lib/speciali";
import SpecialeOggi from "@/components/oggi/SpecialeOggi";
import RubricheOggi from "@/components/oggi/RubricheOggi";
import { alternati } from "@/lib/lingua";

export const revalidate = 60;

// La stessa pagina per chi visita, in inglese
export const metadata = { alternates: alternati("/", "/en", "it") };

const fmt = new Intl.NumberFormat("it-IT");
const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Titolo({ children, href, link = "Tutti" }: { children: ReactNode; href?: string; link?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[19px] font-semibold tracking-tight">{children}</h2>
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-sm font-medium text-testo-2 hover:text-testo">
          {link} <Icona nome="avanti" size={14} />
        </Link>
      ) : null}
    </div>
  );
}

/** Una tessera di «Adesso»: etichetta in alto, il dato grande in basso, una riga di nota */
function Tessera({ href, icona, titolo, nota, children }: { href: string; icona: NomeIcona; titolo: string; nota?: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-[124px] flex-col rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
      <span className="flex items-center gap-2 text-sm font-medium text-testo-2"><Icona nome={icona} size={18} /> {titolo}</span>
      <span className="mt-auto pt-3 [&_.grande]:text-[30px]">{children}</span>
      {nota ? <span className="mt-0.5 truncate text-[13px] text-testo-2">{nota}</span> : null}
    </Link>
  );
}

/**
 * Oggi, la Home (docs/piano.md: «la porta»). Una struttura sola per tutti, sempre nello stesso ordine;
 * cambia il contenuto, non la forma, e nessuna fascia resta vuota:
 * 1. saluto, data e meteo (per chi arriva, una riga su cos'è 739);
 * 2. «Adesso»: farmacie aperte, funivia, parcheggi, avvisi;
 * 3. «Oggi sul Titano»: di mattina il Bollettino, poi il programma della fascia; se non c'è niente, tre posti da scoprire;
 * 4. il tuo castello (chi arriva lo sceglie: è l'unica cosa che 739 gli chiede);
 * 5. le cinque aree; 6. il 112.
 */
export default async function Home() {
  // La fascia 3 cambia con l'ora di San Marino (lib/oggi.ts)
  const adesso = new Date();
  const fascia = fasciaDi(adesso);
  const mattina = fascia.tipo === "mattina";
  const [eventi, classifica, farmacie, linee, raccolta, parcheggi, partite, sport, meteo, avvisi, scritto, speciale, daScoprire] = await Promise.all([
    getEventi(40), getClassifica(), getFarmacie(), getLinee(), getRaccolta(), getParcheggi(), getPartiteAperte(), getSport(), getMeteo(), getAvvisi(),
    mattina ? getUltimo("bollettino", 1) : fascia.tipo === "weekend" ? getUltimo("weekend", 4) : Promise.resolve(null),
    getSpecialeInCorso(),
    getDaScoprire(adesso),
  ]);
  const tempo = meteo ? cielo(meteo.codice, meteo.giorno) : null;
  const funivia = linee.find((l) => l.tipo === "funivia");
  const funiviaSu = funivia?.partenze.filter((p) => p.direzione === "Borgo Maggiore → Città") ?? [];
  const nomiSport = Object.fromEntries(sport.map((s) => [s.id, s.nome]));
  const eventiFascia = eventi.filter((e) => nelPeriodo(e, fascia.al, adesso));
  const partiteFascia = partite.filter((p) => nelPeriodo(p, fascia.al, adesso));
  // Quello che è già nella fascia non si ripete più in basso
  const giaVisti = new Set(eventiFascia.map((e) => e.id));
  const dopo = eventi.filter((e) => !giaVisti.has(e.id) && new Date(e.inizio) > adesso).slice(0, 8);
  const altrePartite = partite.filter((p) => !partiteFascia.includes(p));
  const bollettinoDiOggi = scritto && scritto.tipo === "bollettino" && scritto.pubblicato_il && chiaveGiorno(scritto.pubblicato_il) === chiaveGiorno(adesso.toISOString()) ? scritto : null;
  const multipiano = parcheggi.find((p) => p.nome.startsWith("P9"));
  const avvisiOra = avvisi.filter((a) => inCorso(a));
  const attenzione = avvisiOra.find((a) => a.gravita === "attenzione");
  const podio = classifica.slice(0, 3);

  return (
    <>
      {/* 1. Dove sono */}
      <section className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] lg:text-[30px]">{saluto()}</h1>
            <p className="text-[15px] text-testo-2">{maiuscola(oggiLungo())}</p>
          </div>
          {meteo && tempo ? (
            <Link href="/utili/meteo" aria-label={`${gradi(meteo.temperatura)} ${tempo.testo}, apri il meteo`} className="flex shrink-0 items-center gap-2 rounded-xl px-1 py-1 transition-colors hover:text-testo">
              <Icona nome={tempo.icona} size={30} />
              <span className="flex flex-col leading-tight">
                <span className="font-mono text-[22px] font-medium tracking-[-0.04em]">{gradi(meteo.temperatura)}</span>
                <span className="text-xs text-testo-2">{tempo.testo}</span>
              </span>
            </Link>
          ) : null}
        </div>
        {/* Per chi arriva la prima volta, una riga sola: il resto della pagina fa vedere cosa fa 739 */}
        <p className="per-nuovi max-w-[46ch] text-[15px] leading-relaxed text-testo-2">
          <b className="font-semibold text-testo">739 è l&apos;app di San Marino.</b> Cosa è aperto adesso, cosa succede oggi e dove andare, nei nove castelli.
        </p>
      </section>

      <Link href="/cerca" className="-mt-2 flex h-12 items-center gap-3 rounded-xl bg-superficie px-4 text-[15px] text-testo-2 transition-colors hover:bg-superficie-2 lg:hidden">
        <Icona nome="cerca" size={20} />
        Cerca eventi, luoghi e servizi
      </Link>

      {/* Telefono: una colonna, nell'ordine dei numeri. Computer: Oggi sul Titano, castello e aree a sinistra; Adesso e 112 a destra */}
      <div className="larga flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="contents lg:flex lg:flex-col lg:gap-10">
          {/* 3. Oggi sul Titano */}
          <div className="order-3 flex flex-col gap-4">
            {/* Uno speciale in corso (Natale delle Meraviglie, Giornate Medievali…) e le rubriche del giorno stanno in testa */}
            {speciale ? <SpecialeOggi s={speciale} /> : null}
            <RubricheOggi castelli={classifica} adesso={adesso} />
            <Programma
              titolo={mattina ? "Il Bollettino delle 7:39" : fascia.titolo}
              link={mattina ? { href: "/bollettino", testo: "Apri" } : undefined}
              eventi={eventiFascia}
              partite={partiteFascia}
              nomeSport={nomiSport}
              rubrica={mattina ? bollettinoDiOggi : fascia.tipo === "weekend" ? scritto : null}
              massimo={fascia.tipo === "weekend" ? 12 : 8}
              perGiorno={fascia.tipo === "weekend"}
              vuoto={<DaScoprire luoghi={daScoprire} castelli={classifica} />}
            />
          </div>

          {dopo.length ? (
            <section className="order-4 flex flex-col gap-3">
              <Titolo href="/eventi">Prossimi eventi</Titolo>
              <div className="-mx-[var(--lato)] flex snap-x scroll-px-[var(--lato)] gap-2.5 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
                {dopo.map((e) => (
                  <Link key={e.id} href={`/eventi/${e.id}`} className="flex w-[264px] shrink-0 snap-start only:w-full only:shrink lg:only:col-span-2 items-start gap-3.5 rounded-2xl lg:w-auto bg-superficie p-4 transition-colors hover:bg-superficie-2">
                    <span className="flex w-10 shrink-0 flex-col items-center leading-none">
                      <b className="font-mono text-[22px] font-medium tracking-[-0.05em]">{giornoNumero(e.inizio)}</b>
                      <span className="mt-1 text-xs text-testo-2">{meseBreve(e.inizio)}</span>
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{e.titolo}</span>
                      <span className="truncate text-[13px] text-testo-2">ore {ora(e.inizio)}{e.luogo ? `, ${e.luogo.nome}` : ""}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* Le partite aperte più avanti: solo se ci sono */}
          {altrePartite.length ? (
            <section className="order-4 flex flex-col gap-3">
              <Titolo href="/sport">Partite aperte</Titolo>
              <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                {altrePartite.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <Link href={`/sport/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-semibold">{p.titolo}</span>
                        <span className="truncate text-[13px] text-testo-2">{nomiSport[p.sport_id] ?? p.sport_id}, {chiaveGiorno(p.inizio) === chiaveGiorno(adesso.toISOString()) ? "oggi" : giornoNumero(p.inizio) + " " + meseBreve(p.inizio)} alle {ora(p.inizio)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-[15px] font-medium">{Math.max(0, p.posti - p.iscritti)}</span>
                        <span className="block text-[11px] text-testo-2">posti</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* 4. Il tuo castello: chi arriva lo sceglie, chi torna vede la sua scheda */}
          <div className="order-5 flex flex-col gap-3">
            <IlTuoCastello castelli={classifica} raccolta={raccolta} avvisi={avvisi} />
          </div>

          {/* Senza metri la classifica è tutta a zero: non dice niente */}
          {podio.length === 3 && podio.some((c) => (c.metri ?? 0) > 0) ? (
            <section className="order-6 flex flex-col gap-3">
              <Titolo href="/castelli">Castelli in vetta</Titolo>
              <div className="podio">
                {[podio[1], podio[0], podio[2]].map((c) => (
                  <Link key={c.id} href={`/castelli/${c.slug}`} className="premibile">
                    <EmblemaCastello c={c} className="aspect-square w-full" />
                    <em>{classifica.indexOf(c) + 1}</em>
                    <b>{c.nome}</b>
                    <span>{fmt.format(c.metri ?? 0)} m</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* 5. Le cinque aree, con la riga che dice cosa contengono */}
          <section className="order-7 flex flex-col gap-3">
            <Titolo href="/esplora" link="Esplora">Tutto 739</Titolo>
            <nav aria-label="Le aree di 739" className="grid gap-2 lg:grid-cols-5">
              {AREE.map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-2xl bg-superficie px-3.5 py-3 transition-colors hover:bg-superficie-2 lg:flex-col lg:items-start lg:gap-2 lg:p-4">
                  <span className="shrink-0 text-testo"><Icona nome={a.icona} size={30} /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold">{a.nome}</span>
                    <span className="text-[13px] leading-snug text-testo-2">{a.breve}</span>
                  </span>
                  <span className="shrink-0 text-testo-2 lg:hidden"><Icona nome="avanti" size={18} /></span>
                </Link>
              ))}
            </nav>
          </section>

          <div className="order-9 empty:hidden">
            <Installa />
          </div>
        </div>

        <aside className="contents lg:sticky lg:top-0 lg:flex lg:flex-col lg:gap-8">
          {/* 2. Adesso: quattro tessere sempre piene, con i dati di questo minuto */}
          <section className="order-2 flex flex-col gap-3">
            <Titolo href="/vivere" link="Vivere">Adesso</Titolo>
            <div className="grid grid-cols-2 gap-2.5">
              <Tessera href="/utili/farmacie" icona="farmacia" titolo="Farmacie" nota="Cailungo sempre">
                <ConteggioAperte farmacie={farmacie} />
              </Tessera>
              <Tessera href="/utili/trasporti" icona="trasporti" titolo="Funivia" nota="Da Borgo a Città">
                {funiviaSu.length ? <ProssimaPartenza partenze={funiviaSu} /> : <span className="text-sm">Orari in arrivo</span>}
              </Tessera>
              <Tessera href="/utili/parcheggi" icona="parcheggio" titolo="Parcheggi" nota={multipiano?.posti ? `P9: ${fmt.format(multipiano.posti)} posti` : "Tariffe e posti"}>
                <span className="grande">{parcheggi.length}<small>in città</small></span>
              </Tessera>
              <Tessera href="/vivere/avvisi" icona="avvisi" titolo="Avvisi" nota={attenzione ? <span className="text-segnale">{attenzione.titolo}</span> : avvisiOra[0]?.titolo ?? "Strade e servizi regolari"}>
                <span className="grande">{avvisiOra.length}<small>in corso</small></span>
              </Tessera>
            </div>
          </section>

          {/* 6. Emergenza */}
          <div className="order-10">
            <a href="tel:112" className="flex items-center gap-4 rounded-2xl bg-segnale-pieno p-4 text-white transition-transform active:scale-[0.99]">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15"><Icona nome="telefono" size={22} /></span>
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">Emergenza</span>
                <span className="text-[13px] text-white">Tocca per chiamare</span>
              </span>
              <span className="ml-auto font-mono text-[28px] font-medium tracking-[-0.04em]">112</span>
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
