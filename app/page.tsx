import Link from "next/link";
import { getClassifica, getEventi, oggiLungo, ora, etichettaGiorno, saluto, testoSu, giornoNumero, meseBreve } from "@/lib/data";
import { Cime } from "@/components/Logo";
import { Icona, type NomeIcona } from "@/components/Icona";
import Installa from "@/components/Installa";
import { ScegliCastello } from "@/components/Castello";
import { ProssimaPartenza } from "@/components/Partenze";
import { ConteggioAperte } from "@/components/Farmacie";
import { RaccoltaBreve } from "@/components/Raccolta";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { getFarmacie, getLinee, getParcheggi, getRaccolta } from "@/lib/servizi";
import { getPartiteAperte, getSport } from "@/modules/sport/dati";

export const revalidate = 60;

const fmt = new Intl.NumberFormat("it-IT");

/** Le scorciatoie della Home: ogni sezione ha un suo colore, usato solo qui e tenue. */
const CATEGORIE: { href: string; nome: string; icona: NomeIcona; colore: string }[] = [
  { href: "/sport", nome: "Sport", icona: "sport", colore: "#C9A45C" },
  { href: "/eventi", nome: "Eventi", icona: "eventi", colore: "#5EB6E4" },
  { href: "/mappa", nome: "Mappa", icona: "mappa", colore: "#4CC38A" },
  { href: "/utili", nome: "Utili", icona: "scudo", colore: "#E8573A" },
  { href: "/castelli", nome: "Castelli", icona: "castelli", colore: "#A78BFA" },
  { href: "/utili/trasporti", nome: "Funivia e bus", icona: "funivia", colore: "#60A5FA" },
  { href: "/food", nome: "Food", icona: "food", colore: "#FB923C" },
  { href: "/business", nome: "Business", icona: "business", colore: "#94A3B8" },
];

function Sezione({ titolo, href, link = "Vedi tutto", children }: { titolo: string; href?: string; link?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{titolo}</h2>
        {href ? <Link href={href} className="font-mono text-xs font-semibold uppercase tracking-wider text-accento">{link}</Link> : null}
      </div>
      {children}
    </section>
  );
}

function Tessera({ href, icona, colore, etichetta, children }: { href: string; icona: NomeIcona; colore: string; etichetta: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-[124px] flex-col gap-2 rounded-2xl border border-linea bg-superficie p-3.5 transition-transform active:scale-[0.97]">
      <span className="grid size-9 place-items-center rounded-xl [&_svg]:size-5" style={{ background: `${colore}24`, color: colore }}><Icona nome={icona} /></span>
      <span className="text-[13px] font-medium text-testo-2">{etichetta}</span>
      <span className="mt-auto text-[15px] font-semibold leading-snug">{children}</span>
    </Link>
  );
}

export default async function Home() {
  const [eventi, classifica, farmacie, linee, raccolta, parcheggi, partite, sport] = await Promise.all([
    getEventi(8), getClassifica(), getFarmacie(), getLinee(), getRaccolta(), getParcheggi(), getPartiteAperte(), getSport(),
  ]);
  const podio = classifica.slice(0, 3);
  const funivia = linee.find((l) => l.tipo === "funivia");
  const evidenza = eventi[0];
  const nomeSport = (id: string) => sport.find((s) => s.id === id)?.nome ?? id;

  return (
    <>
      {/* Saluto e ricerca */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-testo-2">{oggiLungo()}</span>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">{saluto()}</h1>
        </div>
        <Link href="/cerca" className="flex h-12 items-center gap-3 rounded-2xl border border-linea bg-superficie px-4 text-[15px] text-testo-2 transition-colors hover:bg-superficie-2 [&_svg]:size-5">
          <Icona nome="cerca" />
          Cerca eventi, luoghi, servizi…
        </Link>
      </section>

      {/* Banner: benvenuto per chi arriva, in evidenza per chi torna */}
      <section className="per-nuovi relative isolate flex flex-col gap-3 overflow-hidden rounded-3xl border border-ottone-500/25 bg-pannello p-5 text-zinc-50">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_100%_0%,rgba(201,164,92,0.35),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(94,182,228,0.12),transparent_50%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-3 -z-10 opacity-25"><Cime width={220} /></span>
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ottone-300">Benvenuto su 739</span>
        <h2 className="max-w-[14ch] text-[30px] font-bold leading-[1.02] tracking-tight">Tutto San Marino in un&apos;app</h2>
        <p className="max-w-[32ch] text-[15px] text-zinc-300">Eventi, sport, servizi e la sfida tra i nove castelli. Con il tuo SMR ID personale.</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3">
          <PrimaryButton href="/profile">Crea il tuo SMR ID</PrimaryButton>
          <Link href="/guida" className="text-sm font-semibold text-zinc-200 underline decoration-ottone-500/60 underline-offset-4">Come funziona</Link>
        </div>
      </section>

      <section className="per-tornati relative isolate flex flex-col gap-3 overflow-hidden rounded-3xl border border-ottone-500/25 bg-pannello p-5 text-zinc-50">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_100%_0%,rgba(201,164,92,0.35),transparent_55%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-3 -z-10 opacity-25"><Cime width={220} /></span>
        {evidenza ? (
          <>
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ottone-300">In evidenza · {etichettaGiorno(evidenza.inizio)} {ora(evidenza.inizio)}</span>
            <h2 className="max-w-[16ch] text-[28px] font-bold leading-[1.05] tracking-tight">{evidenza.titolo}</h2>
            {evidenza.luogo ? <p className="text-[15px] text-zinc-300">{evidenza.luogo.nome}</p> : null}
            <div className="mt-1"><PrimaryButton href={`/eventi/${evidenza.id}`}>Scopri</PrimaryButton></div>
          </>
        ) : (
          <>
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ottone-300">Sport & Eventi</span>
            <h2 className="max-w-[14ch] text-[28px] font-bold leading-[1.05] tracking-tight">Gioca a San Marino</h2>
            <p className="text-[15px] text-zinc-300">Partite con squadre bilanciate dal tuo rating.</p>
            <div className="mt-1"><PrimaryButton href="/sport">Trova una partita</PrimaryButton></div>
          </>
        )}
      </section>

      {/* Categorie */}
      <nav aria-label="Categorie" className="-mx-[var(--lato)] flex gap-3 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none]">
        {CATEGORIE.map((c) => (
          <Link key={c.href} href={c.href} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center transition-transform active:scale-95">
            <span className="grid size-14 place-items-center rounded-2xl border border-linea [&_svg]:size-6" style={{ background: `${c.colore}1F`, color: c.colore }}>
              <Icona nome={c.icona} />
            </span>
            <span className="text-[11.5px] font-medium leading-tight text-testo">{c.nome}</span>
          </Link>
        ))}
      </nav>

      {/* Chi arriva la prima volta sceglie subito il castello */}
      <section className="per-nuovi flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Scegli il tuo castello</h2>
        <p className="text-sm text-testo-2">Dove vivi o quello che senti tuo. Puoi cambiarlo quando vuoi dal menu in alto.</p>
        <ScegliCastello castelli={classifica} />
      </section>

      {/* Adesso */}
      <Sezione titolo="Adesso a San Marino" href="/utili" link="Utili">
        <div className="grid grid-cols-2 gap-2.5">
          <Tessera href="/utili/farmacie" icona="farmacia" colore="#E8573A" etichetta="Farmacie">
            <ConteggioAperte farmacie={farmacie} />
          </Tessera>
          <Tessera href="/utili/trasporti" icona="funivia" colore="#60A5FA" etichetta="Prossima funivia">
            {funivia ? <ProssimaPartenza partenze={funivia.partenze.filter((p) => p.direzione === "Borgo Maggiore → Città")} /> : "Orari in arrivo"}
          </Tessera>
          <Tessera href="/utili/rifiuti" icona="rifiuti" colore="#4CC38A" etichetta="Raccolta rifiuti">
            <span className="text-[13px] font-medium"><RaccoltaBreve raccolta={raccolta} castelli={classifica} /></span>
          </Tessera>
          <Tessera href="/utili/parcheggi" icona="parcheggio" colore="#A78BFA" etichetta="Parcheggi">
            <span className="font-mono text-2xl font-bold">{parcheggi.length}</span> <span className="text-sm text-testo-2">con tariffe</span>
          </Tessera>
        </div>
      </Sezione>

      {/* Eventi */}
      <Sezione titolo="Prossimi eventi" href="/eventi">
        {eventi.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-linea p-5 text-sm text-testo-2">Nessun evento in calendario per ora.</p>
        ) : (
          <div className="-mx-[var(--lato)] flex snap-x scroll-px-[var(--lato)] gap-2.5 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none]">
            {eventi.map((e) => (
              <Link key={e.id} href={`/eventi/${e.id}`} className="flex w-[260px] shrink-0 snap-start items-center gap-3 rounded-2xl border border-linea bg-superficie p-3 transition-transform active:scale-[0.98]">
                <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-linea bg-fondo leading-none" style={{ boxShadow: `inset 0 -3px 0 ${e.castello?.colore ?? "#5EB6E4"}` }}>
                  <b className="font-mono text-xl font-bold tracking-tighter">{giornoNumero(e.inizio)}</b>
                  <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-testo-2">{meseBreve(e.inizio)}</span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{e.titolo}</span>
                  <span className="truncate font-mono text-xs text-testo-2">{ora(e.inizio)}{e.luogo ? ` · ${e.luogo.nome}` : ""}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Sezione>

      {/* Partite */}
      <Sezione titolo="Partite in programma" href="/sport">
        {partite.length === 0 ? (
          <Link href="/sport?nuova=1" className="flex items-center gap-3.5 rounded-2xl border border-dashed border-ottone-500/40 p-4 transition-transform active:scale-[0.98]">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accento-tenue text-accento [&_svg]:size-[22px]"><Icona nome="sport" /></span>
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">Organizza la prima partita</span>
              <span className="text-sm text-testo-2">Calcetto, padel, tennis, basket, pallavolo</span>
            </span>
          </Link>
        ) : (
          <div className="-mx-[var(--lato)] flex snap-x scroll-px-[var(--lato)] gap-2.5 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none]">
            {partite.map((p) => (
              <Link key={p.id} href={`/sport/${p.id}`} className="flex w-[240px] shrink-0 snap-start flex-col gap-1.5 rounded-2xl border border-linea bg-superficie p-3.5 transition-transform active:scale-[0.98]">
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-accento">{nomeSport(p.sport_id)}</span>
                <span className="truncate text-[15px] font-semibold">{p.titolo}</span>
                <span className="truncate font-mono text-xs text-testo-2">{etichettaGiorno(p.inizio)} · {ora(p.inizio)} · {p.luogo_nome}</span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-superficie-2"><span className="block h-full rounded-full bg-metallo" style={{ width: `${(p.iscritti / p.posti) * 100}%` }} /></span>
                  <span className="font-mono text-[11px] text-testo-2">{p.posti - p.iscritti} liberi</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Sezione>

      {/* Castelli */}
      {podio.length === 3 ? (
        <Sezione titolo="Castelli in vetta" href="/castelli" link="Classifica">
          <div className="podio">
            {[podio[1], podio[0], podio[2]].map((c) => (
              <Link key={c.id} href={`/castelli/${c.slug}`} className="premibile" style={{ background: c.colore, color: testoSu(c.colore) }}>
                <em>{classifica.indexOf(c) + 1}°</em>
                <b>{c.nome}</b>
                <span>{fmt.format(c.metri ?? 0)} m</span>
              </Link>
            ))}
          </div>
        </Sezione>
      ) : null}

      <Installa />

      <a href="tel:112" className="sos premibile">
        <span>Emergenza?<br /><span style={{ fontWeight: 400, fontSize: 14 }}>Chiama subito</span></span>
        <strong>112</strong>
      </a>
    </>
  );
}
