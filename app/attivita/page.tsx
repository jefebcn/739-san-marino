import Link from "next/link";
import type { ReactNode } from "react";
import { Icona, type NomeIcona } from "@/components/Icona";
import { supabase } from "@/lib/supabase";
import { contaLuoghi } from "@/lib/data";
import { TITOLARE } from "@/lib/legale";
import { metadatiCondivisione } from "@/lib/condivisione";
import { CATEGORIE_ATTIVITA, PREZZO_PRO } from "@/modules/attivita/api";

export const revalidate = 3600;

export const metadata = metadatiCondivisione({
  titolo: "739 per le attività",
  descrizione: "Locali, negozi, aziende, studi e strutture di San Marino: la scheda in 739 è gratis, la aggiorni tu. Con 739 Pro menu, prenotazioni, offerte e i numeri della scheda.",
  percorso: "/attivita",
});

const fmt = new Intl.NumberFormat("it-IT");

async function contaAttivita() {
  const db = supabase();
  if (!db) return 0;
  const { count } = await db.from("luoghi").select("id", { count: "exact", head: true }).in("categoria", [...CATEGORIE_ATTIVITA]);
  return count ?? 0;
}

const PASSI: { titolo: string; testo: string }[] = [
  { titolo: "Trova la tua scheda", testo: "Molte attività sono già in 739. Cercala e in fondo tocca «È la tua attività?». Se non c'è, aggiungila tu." },
  { titolo: "Ti chiamiamo noi", testo: "La redazione verifica con una telefonata al numero dell'attività. Così nessuno può prendersi la scheda di un altro." },
  { titolo: "La aggiorni tu", testo: "Orari, foto, contatti e descrizione, quando vuoi. Le modifiche vanno online subito con «Aggiornata dal titolare»." },
];

const BASE = [
  "La scheda con indirizzo, telefono, email e sito",
  "Gli orari della settimana: la scheda dice da sola se adesso sei aperto",
  "Foto e descrizione scritte da te",
  "Sulla mappa, nella ricerca e nella sezione giusta di 739",
  "Offerte di lavoro, fino a 5 aperte alla volta",
  "Eventi nel calendario, dopo il controllo della redazione",
];

const PRO = [
  "Il pulsante «Menu» con il tuo menu",
  "Il pulsante «Prenota» con il tuo sistema di prenotazione",
  "Fino a 3 offerte con la scadenza, nella scheda e nelle liste",
  "I numeri della scheda: aperture e tocchi su Chiama, Indicazioni, sito",
];

const ANCHE: { icona: NomeIcona; titolo: string; testo: ReactNode; href: string; link: string }[] = [
  { icona: "lavoro", titolo: "Offerte di lavoro", testo: "Cerchi personale? L'offerta va online subito in Lavorare, nella tua scheda e su Google. Le candidature arrivano a te.", href: "/lavorare/lavoro", link: "Le offerte aperte" },
  { icona: "eventi", titolo: "Eventi e serate", testo: "Proponi i tuoi eventi: finiscono nel calendario e nel Bollettino delle 7:39. Chi viene può fare il check-in e guadagnare metri.", href: "/eventi/proponi", link: "Proponi un evento" },
  { icona: "collegamento", titolo: "Fornitori e preventivi", testo: "Trova aziende, artigiani e studi del territorio per tipo e chiedi un preventivo: la richiesta parte da te e va a loro.", href: "/lavorare/fornitori", link: "Trova un fornitore" },
  { icona: "calendario", titolo: "Scadenze e novità", testo: "Cosa scade e cosa cambia per le attività, ognuna con la fonte ufficiale, più i servizi online dello Stato in un posto solo.", href: "/lavorare/scadenze", link: "Le scadenze" },
  { icona: "bandi", titolo: "Bandi", testo: "Contributi e bandi pubblici aperti, in ordine di chiusura.", href: "/lavorare/bandi", link: "I bandi aperti" },
  { icona: "fiere", titolo: "Fiere e convegni", testo: "Gli incontri per professionisti e aziende hanno una sezione tutta loro in Lavorare.", href: "/lavorare/fiere", link: "Fiere e convegni" },
];

const DOMANDE: { d: string; r: string }[] = [
  { d: "Il Pro mi mette davanti agli altri?", r: "No. Le liste e la ricerca sono uguali per tutti: chi cerca una pizzeria vede le pizzerie, non chi paga. Il Pro aggiunge strumenti alla tua scheda." },
  { d: "Come si paga il Pro?", r: `Con un accordo scritto con ${TITOLARE.nome}, che fa la fattura. Nell'app non si paga niente e non chiediamo carte.` },
  { d: "E se smetto?", r: "Alla scadenza la scheda torna al profilo base: restano descrizione, contatti, orari e foto. Il profilo base è gratis." },
  { d: "Chi vede i miei dati per la verifica?", r: "Solo la redazione di 739. Il telefono che ci dai per la verifica non compare nella scheda." },
];

/** «739 per le attività»: cosa ottiene un'attività, come si entra, i piani e cosa c'è in più. Niente pagamenti nell'app. */
export default async function PerLeAttivita() {
  const [luoghi, attivita] = await Promise.all([contaLuoghi(), contaAttivita()]);
  const oggetto = encodeURIComponent("739 Pro per la mia attività");
  const scrivi = `mailto:${TITOLARE.email}?subject=${oggetto}`;

  return (
    <>
      <section className="larga flex flex-col gap-6 overflow-hidden rounded-2xl bg-[#09090B] px-5 py-8 text-white lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-12 lg:py-14">
        <div className="flex flex-col gap-4">
          <Link href="/lavorare" className="flex w-fit items-center gap-1 text-sm font-medium text-zinc-400 hover:text-white"><Icona nome="freccia" size={16} /> Lavorare</Link>
          <h1 className="voce-logo text-[34px] leading-[1.05] text-white [text-wrap:balance] lg:text-[56px]">La tua attività su 739</h1>
          <p className="max-w-[52ch] text-[15px] leading-relaxed text-zinc-400 [text-wrap:pretty] lg:text-[18px]">
            Chi vive a San Marino apre 739 per sapere cosa è aperto, dove andare e cosa succede. Fai trovare la tua attività con i dati giusti, aggiornati da te. La scheda è gratis.
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/attivita/aggiungi" className="taglio inline-flex h-12 items-center justify-center gap-2 bg-white text-[15px] font-semibold text-[#09090B] transition-transform active:scale-[0.98]">
              Aggiungi la tua attività <Icona nome="vai" size={18} />
            </Link>
            <Link href="/cerca" className="text-sm font-medium text-zinc-400 underline-offset-4 hover:text-white hover:underline">È già in 739? Cercala</Link>
          </div>
        </div>
        {luoghi ? (
          <dl className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 lg:w-[340px]">
            <div className="flex flex-col bg-[#09090B] p-4">
              <dt className="order-2 text-[13px] text-zinc-400">luoghi sulla mappa</dt>
              <dd className="voce-logo text-[30px] text-white">{fmt.format(luoghi)}</dd>
            </div>
            <div className="flex flex-col bg-[#09090B] p-4">
              <dt className="order-2 text-[13px] text-zinc-400">attività già dentro</dt>
              <dd className="voce-logo text-[30px] text-white">{fmt.format(attivita)}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="larga flex flex-col gap-4" aria-labelledby="come">
        <h2 id="come" className="text-[21px] font-semibold tracking-tight">Come funziona</h2>
        <ol className="grid gap-2.5 lg:grid-cols-3">
          {PASSI.map((p, i) => (
            <li key={p.titolo} className="flex gap-4 rounded-2xl bg-superficie p-5 lg:flex-col lg:gap-3">
              <span className="voce-logo w-8 shrink-0 text-[30px] leading-none">{i + 1}</span>
              <span className="flex flex-col gap-1">
                <span className="text-[16px] font-semibold">{p.titolo}</span>
                <span className="text-sm leading-relaxed text-testo-2">{p.testo}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="larga flex flex-col gap-4" aria-labelledby="piani">
        <h2 id="piani" className="text-[21px] font-semibold tracking-tight">I piani</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <article className="flex flex-col gap-4 rounded-2xl bg-superficie p-5 lg:p-7">
            <div className="flex flex-col gap-1">
              <h3 className="text-[19px] font-semibold">Profilo base</h3>
              <p className="voce-logo text-[34px] leading-tight">Gratis</p>
              <p className="text-sm text-testo-2">Per tutte le attività di San Marino, senza scadenza.</p>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5">
              {BASE.map((v) => (
                <li key={v} className="flex gap-2.5 text-[15px] leading-snug"><span className="mt-[8px] size-1.5 shrink-0 rounded-full bg-testo" />{v}</li>
              ))}
            </ul>
            <Link href="/attivita/aggiungi" className="taglio inline-flex h-12 w-fit items-center justify-center gap-2 bg-metallo text-[15px] font-semibold text-su-accento transition-transform hover:bg-zinc-800 active:scale-[0.98]">
              Inizia gratis <Icona nome="vai" size={18} />
            </Link>
          </article>

          <article className="flex flex-col gap-4 rounded-2xl bg-[#09090B] p-5 text-white lg:p-7">
            <div className="flex flex-col gap-1">
              <h3 className="text-[19px] font-semibold text-white">739 Pro</h3>
              <p className="flex items-baseline gap-2"><span className="voce-logo text-[34px] leading-tight text-white">3,99 €</span><span className="text-sm text-zinc-400">al mese</span></p>
              <p className="text-sm text-zinc-400">{PREZZO_PRO.replace(/^3,99 € al mese, oppure /, "Oppure ")}. Tutto il profilo base, più:</p>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5">
              {PRO.map((v) => (
                <li key={v} className="flex gap-2.5 text-[15px] leading-snug"><span className="mt-[8px] size-1.5 shrink-0 rounded-full bg-white" />{v}</li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <a href={scrivi} className="taglio inline-flex h-12 w-fit items-center justify-center gap-2 bg-white text-[15px] font-semibold text-[#09090B] transition-transform active:scale-[0.98]">
                Richiedi il Pro <Icona nome="email" size={18} />
              </a>
              <p className="text-[13px] text-zinc-400">Prima serve la scheda verificata. Scrivi a <span className="font-mono">{TITOLARE.email}</span>: ti rispondiamo con l&apos;accordo.</p>
            </div>
          </article>
        </div>
        <p className="text-[13px] text-testo-2">Il Pro non cambia l&apos;ordine delle liste né i risultati della ricerca. Le offerte devono essere vere e riguardare l&apos;attività.</p>
      </section>

      <section className="larga flex flex-col gap-4" aria-labelledby="esempio">
        <div className="flex flex-col gap-1">
          <h2 id="esempio" className="text-[21px] font-semibold tracking-tight">Come la vede chi la apre</h2>
          <p className="text-sm text-testo-2">Un esempio di scheda con 739 Pro. I dati sono finti.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div aria-hidden="true" className="flex select-none flex-col gap-4 rounded-2xl border border-linea bg-fondo p-5">
            <div className="flex flex-col gap-1">
              <span className="text-[22px] font-semibold tracking-tight">Il tuo locale</span>
              <span className="text-[13px] text-testo-2">Pizzeria, Borgo Maggiore</span>
              <span className="text-[14px] font-semibold text-ok">Aperto adesso, fino alle 23:00</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="taglio inline-flex h-11 items-center gap-2 bg-metallo text-sm font-semibold text-su-accento"><Icona nome="indicazioni" size={18} /> Indicazioni</span>
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-superficie px-4 text-sm font-semibold"><Icona nome="telefono" size={18} /> Chiama</span>
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-superficie px-4 text-sm font-semibold"><Icona nome="storie" size={18} /> Menu</span>
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-superficie px-4 text-sm font-semibold"><Icona nome="calendario" size={18} /> Prenota</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl bg-superficie p-4">
              <span className="text-[13px] text-testo-2">Offerta fino al 30 novembre</span>
              <span className="text-[15px] font-semibold">Pizza e bibita a 10 € il martedì</span>
            </div>
            <span className="text-[13px] text-testo-2">Aggiornata dal titolare il 16 ottobre</span>
          </div>
          <div aria-hidden="true" className="flex select-none flex-col gap-3 rounded-2xl bg-superficie p-5">
            <span className="text-[16px] font-semibold">I numeri della scheda</span>
            <span className="text-[13px] text-testo-2">Ultimi 30 giorni, solo totali</span>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-linea">
              {[["Aperture", "412"], ["Chiama", "37"], ["Indicazioni", "58"], ["Menu", "91"]].map(([n, v]) => (
                <div key={n} className="flex flex-col bg-fondo p-3.5">
                  <dt className="order-2 text-[13px] text-testo-2">{n}</dt>
                  <dd className="font-mono text-[24px] font-medium tracking-[-0.03em]">{v}</dd>
                </div>
              ))}
            </dl>
            <span className="text-[13px] text-testo-2">Non sappiamo chi apre la scheda: contiamo solo quante volte.</span>
          </div>
        </div>
      </section>

      <section className="larga flex flex-col gap-4" aria-labelledby="anche">
        <h2 id="anche" className="text-[21px] font-semibold tracking-tight">Anche per le attività</h2>
        <div className="grid gap-2.5 lg:grid-cols-3">
          {ANCHE.map((a) => (
            <Link key={a.href} href={a.href} className="flex flex-col gap-2 rounded-2xl bg-superficie p-5 transition-colors hover:bg-superficie-2">
              <span className="text-testo"><Icona nome={a.icona} size={30} /></span>
              <span className="text-[16px] font-semibold">{a.titolo}</span>
              <span className="flex-1 text-sm leading-relaxed text-testo-2">{a.testo}</span>
              <span className="flex items-center gap-1 pt-1 text-sm font-semibold text-accento">{a.link} <Icona nome="avanti" size={14} /></span>
            </Link>
          ))}
        </div>
        <p className="rounded-2xl bg-superficie p-5 text-[15px] leading-relaxed">
          <b className="font-semibold">Manifestazioni e sponsorizzazioni.</b> <span className="text-testo-2">Per far conoscere una manifestazione o un evento importante, con le scritte sempre chiare quando è sponsorizzato, </span>
          <a href={`mailto:${TITOLARE.email}?subject=${encodeURIComponent("739 per una manifestazione")}`} className="font-semibold text-accento underline-offset-2 hover:underline">scrivici</a>.
        </p>
      </section>

      <section className="larga flex flex-col gap-4" aria-labelledby="domande">
        <h2 id="domande" className="text-[21px] font-semibold tracking-tight">Domande</h2>
        <dl className="grid gap-x-10 gap-y-5 lg:grid-cols-2">
          {DOMANDE.map((q) => (
            <div key={q.d} className="flex flex-col gap-1">
              <dt className="text-[16px] font-semibold">{q.d}</dt>
              <dd className="text-[15px] leading-relaxed text-testo-2">{q.r}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[13px] text-testo-2">
          Le regole complete sono nei <Link href="/termini" className="underline underline-offset-2">Termini d&apos;uso</Link> e nella <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>.
        </p>
      </section>
    </>
  );
}
