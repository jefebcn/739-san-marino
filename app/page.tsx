import Link from "next/link";
import { chiaveGiorno, getClassifica, getEventi, oggiLungo, ora, etichettaGiorno, saluto, giornoNumero, meseBreve } from "@/lib/data";
import { Icona, type NomeIcona } from "@/components/Icona";
import { AREE } from "@/lib/aree";
import Installa from "@/components/Installa";
import { ScegliCastello } from "@/components/Castello";
import { ProssimaPartenza } from "@/components/Partenze";
import { ConteggioAperte } from "@/components/Farmacie";
import { RaccoltaBreve } from "@/components/Raccolta";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { getFarmacie, getLinee, getParcheggi, getRaccolta } from "@/lib/servizi";
import { getPartiteAperte, getSport } from "@/modules/sport/dati";
import { cielo, getMeteo, gradi } from "@/lib/meteo";
import { getAvvisi } from "@/lib/avvisi";
import AvvisiOggi from "@/components/AvvisiOggi";
import Bollettino from "@/components/oggi/Bollettino";
import Programma from "@/components/oggi/Programma";
import { fasciaDi, nelPeriodo } from "@/lib/oggi";
import { getUltimo } from "@/lib/contenuti";

export const revalidate = 60;

const fmt = new Intl.NumberFormat("it-IT");

// La fila in alto porta alle cinque aree (lib/aree.ts)
const CATEGORIE: { href: string; nome: string; icona: NomeIcona }[] = AREE.map((a) => ({ href: a.href, nome: a.nome, icona: a.icona }));

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Titolo({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[19px] font-semibold tracking-tight">{children}</h2>
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-sm font-medium text-testo-2 hover:text-testo">
          Tutti <Icona nome="avanti" size={14} />
        </Link>
      ) : null}
    </div>
  );
}

export default async function Home() {
  // La Home cambia con l'ora di San Marino (lib/oggi.ts): mattina il Bollettino, poi il programma della fascia
  const adesso = new Date();
  const fascia = fasciaDi(adesso);
  const mattina = fascia.tipo === "mattina";
  const [eventi, classifica, farmacie, linee, raccolta, parcheggi, partite, sport, meteo, avvisi, scritto] = await Promise.all([
    getEventi(40), getClassifica(), getFarmacie(), getLinee(), getRaccolta(), getParcheggi(), getPartiteAperte(), getSport(), getMeteo(), getAvvisi(),
    mattina ? getUltimo("bollettino", 1) : fascia.tipo === "weekend" ? getUltimo("weekend", 4) : Promise.resolve(null),
  ]);
  const tempo = meteo ? cielo(meteo.codice, meteo.giorno) : null;
  const podio = classifica.slice(0, 3);
  const funivia = linee.find((l) => l.tipo === "funivia");
  const nomeSport = (id: string) => sport.find((s) => s.id === id)?.nome ?? id;
  const nomiSport = Object.fromEntries(sport.map((s) => [s.id, s.nome]));
  const eventiFascia = eventi.filter((e) => nelPeriodo(e, fascia.al, adesso));
  const partiteFascia = partite.filter((p) => nelPeriodo(p, fascia.al, adesso));
  // Quello che è già nel Bollettino o nel programma non si ripete più in basso
  const giaVisti = new Set(eventiFascia.map((e) => e.id));
  const dopo = eventi.filter((e) => !giaVisti.has(e.id) && new Date(e.inizio) > adesso);
  const evidenza = !mattina && !eventiFascia.length && !partiteFascia.length ? dopo[0] : undefined;
  const altri = (evidenza ? dopo.slice(1) : dopo).slice(0, 8);
  const altrePartite = partite.filter((p) => !partiteFascia.includes(p));
  const bollettinoDiOggi = scritto && scritto.tipo === "bollettino" && scritto.pubblicato_il && chiaveGiorno(scritto.pubblicato_il) === chiaveGiorno(adesso.toISOString()) ? scritto : null;
  const multipiano = parcheggi.find((p) => p.nome.startsWith("P9"));

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{saluto()}</h1>
            <p className="text-[15px] text-testo-2">{maiuscola(oggiLungo())}</p>
          </div>
          {meteo && tempo ? (
            <Link href="/utili/meteo" aria-label={`Meteo: ${tempo.testo}, ${gradi(meteo.temperatura)}`} className="flex shrink-0 items-center gap-2 rounded-xl px-1 py-1 transition-colors hover:text-testo">
              <Icona nome={tempo.icona} size={30} />
              <span className="flex flex-col leading-tight">
                <span className="font-mono text-[22px] font-medium tracking-[-0.04em]">{gradi(meteo.temperatura)}</span>
                <span className="text-xs text-testo-2">{tempo.testo}</span>
              </span>
            </Link>
          ) : null}
        </div>
        <Link href="/cerca" className="flex h-12 items-center gap-3 rounded-xl bg-superficie px-4 text-[15px] text-testo-2 transition-colors hover:bg-superficie-2">
          <Icona nome="cerca" size={20} />
          Cerca eventi, luoghi e servizi
        </Link>
      </section>

      {/* Di mattina gli avvisi stanno dentro il Bollettino */}
      {mattina ? null : <AvvisiOggi avvisi={avvisi} castelli={classifica} />}

      {/* Chi arriva la prima volta: il marchio, una frase, un'azione */}
      <section className="per-nuovi relative isolate overflow-hidden rounded-2xl bg-pannello p-5 text-zinc-50">
        <span aria-hidden="true" className="pointer-events-none absolute -top-6 -right-4 -z-10 select-none text-[120px] font-semibold leading-none tracking-[-0.06em] text-white/[0.035]">739</span>
        <h2 className="max-w-[15ch] text-[26px] font-semibold leading-[1.1] tracking-tight">Tutto San Marino, in un&apos;app</h2>
        <p className="mt-2 max-w-[30ch] text-[15px] leading-relaxed text-zinc-400">Eventi, sport e servizi dei nove castelli, con la tua tessera digitale.</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <PrimaryButton href="/profile">Crea il tuo SMR ID</PrimaryButton>
          <Link href="/guida" className="text-sm font-medium text-zinc-300 hover:text-white">Come funziona</Link>
        </div>
      </section>

      {/* La fascia dell'ora: Bollettino, programma di oggi, di stasera o del weekend; se è vuoto, il prossimo evento */}
      {mattina ? (
        <Bollettino
          compatto
          avvisi={<AvvisiOggi avvisi={avvisi} castelli={classifica} />}
          dati={{
            meteo,
            eventi: eventiFascia,
            farmacie,
            funivia: funivia?.partenze.filter((p) => p.direzione === "Borgo Maggiore → Città") ?? [],
            raccolta,
            castelli: classifica,
            partite: partiteFascia,
            scritto: bollettinoDiOggi,
          }}
        />
      ) : eventiFascia.length || partiteFascia.length || (fascia.tipo === "weekend" && scritto) ? (
        <Programma titolo={fascia.titolo} eventi={eventiFascia} partite={partiteFascia} nomeSport={nomiSport} rubrica={fascia.tipo === "weekend" ? scritto : null} massimo={fascia.tipo === "weekend" ? 12 : 8} perGiorno={fascia.tipo === "weekend"} />
      ) : evidenza ? (
        <Link href={`/eventi/${evidenza.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-2xl bg-pannello p-5 text-zinc-50 transition-transform active:scale-[0.99]">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-ottone-300">{etichettaGiorno(evidenza.inizio)}, ore {ora(evidenza.inizio)}</span>
            <h2 className="mt-1.5 text-[24px] font-semibold leading-[1.12] tracking-tight">{evidenza.titolo}</h2>
            {evidenza.luogo ? <p className="mt-1 text-[15px] text-zinc-400">{evidenza.luogo.nome}</p> : null}
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ottone-300">Dettagli <Icona nome="vai" size={16} /></span>
          </div>
          <div className="flex flex-col items-center justify-start border-l border-white/10 pl-4 text-center">
            <span className="font-mono text-[44px] font-medium leading-none tracking-[-0.06em]">{giornoNumero(evidenza.inizio)}</span>
            <span className="mt-1 text-sm text-zinc-400">{meseBreve(evidenza.inizio)}</span>
          </div>
        </Link>
      ) : (
        <Link href="/sport" className="flex flex-col rounded-2xl bg-pannello p-5 text-zinc-50">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight">Gioca questa settimana</h2>
          <p className="mt-1 text-[15px] text-zinc-400">Calcetto, padel, tennis: squadre bilanciate dal tuo rating.</p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ottone-300">Trova una partita <Icona nome="vai" size={16} /></span>
        </Link>
      )}

      <nav aria-label="Aree" className="grid grid-cols-5 gap-x-1.5">
        {CATEGORIE.map((c) => (
          <Link key={c.href} href={c.href} className="group flex flex-col items-center gap-1.5 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-superficie text-testo transition-colors group-hover:bg-superficie-2 group-active:scale-95">
              <Icona nome={c.icona} size={26} />
            </span>
            <span className="text-xs font-medium text-testo-2">{c.nome}</span>
          </Link>
        ))}
      </nav>

      <section className="per-nuovi flex flex-col gap-3">
        <Titolo>Scegli il tuo castello</Titolo>
        <p className="-mt-1 text-sm text-testo-2">Dove vivi o quello che senti tuo. Lo cambi quando vuoi dal menu in alto.</p>
        <ScegliCastello castelli={classifica} />
      </section>

      {mattina ? null : (
        <section className="flex flex-col gap-3">
          <Titolo href="/vivere">Adesso</Titolo>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/utili/farmacie" className="row-span-2 flex flex-col rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
              <span className="flex items-center gap-2 text-sm font-medium text-testo-2"><Icona nome="farmacia" size={18} /> Farmacie</span>
              <span className="mt-auto pt-6 [&_.grande]:text-[44px] [&_.grande]:font-medium [&_.grande]:tracking-[-0.05em]"><ConteggioAperte farmacie={farmacie} /></span>
              <span className="mt-1 text-[13px] leading-snug text-testo-2">Cailungo è aperta 24 ore su 24</span>
            </Link>
            <Link href="/utili/trasporti" className="flex flex-col gap-3 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
              <span className="flex items-center gap-2 text-sm font-medium text-testo-2"><Icona nome="funivia" size={18} /> Funivia</span>
              {funivia ? <ProssimaPartenza partenze={funivia.partenze.filter((p) => p.direzione === "Borgo Maggiore → Città")} /> : <span className="text-sm">Orari in arrivo</span>}
            </Link>
            <Link href="/utili/rifiuti" className="flex flex-col gap-3 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
              <span className="flex items-center gap-2 text-sm font-medium text-testo-2"><Icona nome="rifiuti" size={18} /> Rifiuti domani</span>
              <span className="text-[15px] font-semibold leading-snug"><RaccoltaBreve raccolta={raccolta} castelli={classifica} compatto /></span>
            </Link>
            <Link href="/utili/parcheggi" className="col-span-2 flex items-center gap-4 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fondo text-testo"><Icona nome="parcheggio" size={24} /></span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-semibold">{parcheggi.length} parcheggi in città</span>
                <span className="truncate text-[13px] text-testo-2">{multipiano ? `Il più grande è il ${multipiano.nome.split(" ")[0]}, ${fmt.format(multipiano.posti ?? 0)} posti` : "Posti e tariffe"}</span>
              </span>
              <span className="ml-auto text-testo-2"><Icona nome="avanti" size={18} /></span>
            </Link>
          </div>
        </section>
      )}

      {altri.length ? (
        <section className="flex flex-col gap-3">
          <Titolo href="/eventi">Prossimi eventi</Titolo>
          <div className="-mx-[var(--lato)] flex snap-x scroll-px-[var(--lato)] gap-2.5 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none]">
            {altri.map((e) => (
              <Link key={e.id} href={`/eventi/${e.id}`} className="flex w-[264px] shrink-0 snap-start items-start gap-3.5 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
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

      {partite.length && !altrePartite.length ? null : (
        <section className="flex flex-col gap-3">
          <Titolo href="/sport">Partite</Titolo>
          {altrePartite.length === 0 ? (
            <Link href="/sport?nuova=1" className="flex items-center gap-4 rounded-2xl border border-dashed border-linea p-4 transition-colors hover:bg-superficie">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accento-tenue text-accento"><Icona nome="sport" size={24} /></span>
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">Nessuna partita in programma</span>
                <span className="text-[13px] text-testo-2">Organizzane una: ci pensa 739 a fare squadre pari.</span>
              </span>
            </Link>
          ) : (
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              {altrePartite.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <Link href={`/sport/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-superficie-2">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">{p.titolo}</span>
                      <span className="truncate text-[13px] text-testo-2">{nomeSport(p.sport_id)}, {etichettaGiorno(p.inizio).toLowerCase()} alle {ora(p.inizio)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[15px] font-medium">{p.posti - p.iscritti}</span>
                      <span className="block text-[11px] text-testo-2">posti</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {podio.length === 3 ? (
        <section className="flex flex-col gap-3">
          <Titolo href="/castelli">Castelli in vetta</Titolo>
          <div className="podio">
            {[podio[1], podio[0], podio[2]].map((c) => (
              <Link key={c.id} href={`/castelli/${c.slug}`} className="premibile">
                <i aria-hidden="true" style={{ background: c.colore }} />
                <em>{classifica.indexOf(c) + 1}</em>
                <b>{c.nome}</b>
                <span>{fmt.format(c.metri ?? 0)} m</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Installa />

      <a href="tel:112" className="flex items-center gap-4 rounded-2xl bg-segnale p-4 text-white transition-transform active:scale-[0.99]">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15"><Icona nome="telefono" size={22} /></span>
        <span className="flex flex-col">
          <span className="text-[15px] font-semibold">Emergenza</span>
          <span className="text-[13px] text-white/80">Tocca per chiamare</span>
        </span>
        <span className="ml-auto font-mono text-[28px] font-medium tracking-[-0.04em]">112</span>
      </a>
    </>
  );
}
