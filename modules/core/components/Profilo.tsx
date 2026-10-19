"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Icona, type NomeIcona } from "@/components/Icona";
import { EmblemaCastello } from "@/components/LogoCastello";
import { impostaCastello } from "@/components/Castello";
import type { Castello } from "@/lib/data";
import { esci, salvaProfilo } from "../auth";
import { useSessione } from "../store";
import Accesso, { Campo, NuovaPassword } from "./Accesso";
import SmrCard from "./SmrCard";
import { mioRating } from "@/modules/sport/api";
import { EtichetteScala, Scala } from "@/components/Quota";
import { livello } from "@/lib/quota";
import Tano, { POSA_DI_LIVELLO } from "@/components/Tano";
import Notifiche from "@/components/Notifiche";
import AvvisiPersonali from "@/components/AvvisiPersonali";
import { conteggioBozze } from "@/modules/coda/api";
import { conteggioRichieste, mieAttivita } from "@/modules/attivita/api";
import { miePrenotazioni } from "@/modules/prenotazioni/api";
import { conteggioBacheca, mieiAnnunci } from "@/modules/bacheca/api";
import { mieiRuoli, NESSUN_RUOLO, type Ruoli } from "../ruoli";
import { mieiMetri, type Movimento } from "@/modules/eventi/api";

const giornoBreve = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "Europe/San_Marino" });

/**
 * La quota in metri come un cruscotto nello stile del logo: il numero grande, Tano con la posa del livello,
 * l'altimetro da 0 a 739 m e sotto tre numeri (prossimo livello, rating, il tuo castello in classifica).
 */
function QuotaHud({ metri, rating, castello, posizione }: { metri: number | null; rating: number | null; castello: Castello | null; posizione: number | null }) {
  const m = metri ?? 0;
  const { attuale, prossimo, mancano } = livello(m);
  return (
    <section id="quota" className="flex scroll-mt-20 flex-col overflow-hidden rounded-2xl bg-[#09090B] text-zinc-50" aria-label="La tua quota" aria-busy={metri === null}>
      <div className="flex items-end justify-between gap-3 px-5 pt-5">
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-medium text-zinc-400">La tua quota</span>
          <span className="voce-logo text-[56px] text-ottone-300">
            {metri === null ? "–" : m}
            <small className="ml-1 text-[22px]">m</small>
          </span>
          <span className="taglio-piccolo w-fit bg-white py-0.5 text-[13px] font-semibold text-[#09090B]">{attuale.nome}</span>
        </div>
        {metri !== null ? <Tano posa={POSA_DI_LIVELLO[attuale.nome]} className="-mb-1 h-32 w-auto" /> : null}
      </div>
      <div className="px-5 pt-4 text-zinc-400">
        <Scala metri={m} grande />
        <EtichetteScala />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-px border-t border-white/10 bg-white/10">
        <Numero titolo={prossimo ? `A ${prossimo.nome}` : "Vetta"} valore={prossimo ? String(mancano) : "739"} unita="m" href="/eventi" nota={prossimo ? "Con i check-in" : "Sei in cima"} />
        <Numero titolo="Rating" valore={rating ? String(Math.round(rating)) : "–"} href="/sport" nota={rating ? "Nelle partite" : "Gioca una partita"} />
        <Numero titolo="Castello" valore={posizione ? `${posizione}°` : "–"} href={castello ? `/castelli/${castello.slug}` : "/castelli"} nota={castello?.nome ?? "Sceglilo qui"} />
      </div>
    </section>
  );
}

function Numero({ titolo, valore, unita, nota, href }: { titolo: string; valore: string; unita?: string; nota: string; href: string }) {
  return (
    <Link href={href} className="flex min-w-0 flex-col gap-1.5 bg-[#09090B] px-4 py-3.5 transition-colors hover:bg-zinc-900">
      <span className="truncate text-[12px] font-medium text-zinc-400">{titolo}</span>
      <span className="voce-logo text-[24px] text-zinc-50">
        {valore}
        {unita ? <small className="ml-0.5 text-[14px]">{unita}</small> : null}
      </span>
      <span className="truncate text-[12px] text-zinc-400">{nota}</span>
    </Link>
  );
}

/** Una riga di un elenco raggruppato: icona, titolo, nota, un numero se serve */
function Riga({ href, icona, titolo, nota, numero }: { href: string; icona: NomeIcona; titolo: string; nota?: ReactNode; numero?: number | null }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-superficie-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fondo"><Icona nome={icona} size={24} /></span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-semibold">{titolo}</span>
          {nota ? <span className="truncate text-[13px] text-testo-2">{nota}</span> : null}
        </span>
        {numero ? <span className="taglio-piccolo bg-metallo py-0.5 font-mono text-[13px] font-medium text-su-accento">{numero}</span> : null}
        <span className="text-testo-2"><Icona nome="avanti" size={16} /></span>
      </Link>
    </li>
  );
}

function Titolo({ children, id }: { children: ReactNode; id: string }) {
  return <h2 id={id} className="text-[19px] font-semibold tracking-tight">{children}</h2>;
}

const VANTAGGI: { icona: NomeIcona; titolo: string; testo: string }[] = [
  { icona: "qr", titolo: "Un QR tuo", testo: "Fai check-in agli eventi e sali di quota: Valle, Mura, Torri, Vetta." },
  { icona: "castelli", titolo: "I metri al tuo castello", testo: "Ogni metro che guadagni porta su il castello che scegli." },
  { icona: "partite", titolo: "Partite e rating", testo: "Organizza o entra in una partita, con squadre bilanciate." },
  { icona: "calendario", titolo: "Prenotazioni", testo: "Campi e sale dei centri che prenotano con 739." },
];

/** Chi non è entrato: com'è la carta, cosa dà, e il modulo per entrare o crearla */
function Ospite({ castelli }: { castelli: Castello[] }) {
  return (
    <div className="larga flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-14">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] lg:text-[40px]">Il tuo SMR ID</h1>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-testo-2 lg:text-[17px]">La tessera digitale di 739, gratis: un QR tuo, il tuo castello, i metri e le partite in un posto solo.</p>
        </header>
        <div className="w-full max-w-[400px]">
          <SmrCard esempio nome="Il tuo nome" tessera="739-0000-00" castello={null} rating={null} metri={0} />
        </div>
        <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {VANTAGGI.map((v) => (
            <li key={v.titolo} className="flex gap-3">
              <span className="mt-0.5 shrink-0"><Icona nome={v.icona} size={28} /></span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{v.titolo}</span>
                <span className="text-[13px] leading-snug text-testo-2">{v.testo}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <section className="flex flex-col gap-4 lg:rounded-2xl lg:border lg:border-linea lg:p-8" aria-label="Entra o crea il tuo SMR ID">
        <Accesso castelli={castelli} />
        <p className="text-[12px] text-testo-2">
          SMR ID non è un documento d&apos;identità. <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>, <Link href="/termini" className="underline underline-offset-2">Termini d&apos;uso</Link>
        </p>
      </section>
    </div>
  );
}

/** La pagina SMR ID: per gli ospiti la carta di esempio e l'accesso; per chi è entrato carta, quota, le sue cose e le impostazioni. */
export default function Profilo({ castelli }: { castelli: Castello[] }) {
  const { stato, utente, profilo, recupero, impostaRecupero, aggiornaProfilo } = useSessione();
  const [nome, setNome] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState<"fermo" | "in-corso" | "fatto" | "errore">("fermo");
  const [rating, setRating] = useState<number | null>(null);
  // Dalle azioni rapide: /profile?qr=1 apre subito il QR
  const [apriQr, setApriQr] = useState(false);
  useEffect(() => setApriQr(new URLSearchParams(window.location.search).get("qr") === "1"), []);
  // Dal QR di un evento: /profile?torna=/eventi/<id>/checkin?c=… riporta lì appena l'accesso è fatto
  // (ricordato anche nella scheda del browser, per chi conferma la registrazione dal link nell'email)
  useEffect(() => {
    const valido = (t: string | null) => (t && t.startsWith("/") && !t.startsWith("//") ? t : null);
    let torna = valido(new URLSearchParams(window.location.search).get("torna"));
    try {
      if (torna) sessionStorage.setItem("739-torna", torna);
      else torna = valido(sessionStorage.getItem("739-torna"));
    } catch {}
    if (stato !== "connesso" || !torna) return;
    try {
      sessionStorage.removeItem("739-torna");
    } catch {}
    window.location.replace(torna);
  }, [stato]);
  const idUtente = utente?.id;
  useEffect(() => {
    if (idUtente) mioRating(idUtente).then(setRating);
  }, [idUtente]);
  // I metri della quota (miei_metri, migrazione 0023): sulla carta e nel cruscotto
  const [metri, setMetri] = useState<{ totale: number; movimenti: Movimento[] } | null>(null);
  useEffect(() => {
    if (idUtente) mieiMetri().then((r) => setMetri({ totale: r.totale, movimenti: r.movimenti }));
  }, [idUtente]);
  // Redazione e amministratori vedono i loro pannelli; la coda dice quante bozze aspettano
  const [ruoli, setRuoli] = useState<Ruoli>(NESSUN_RUOLO);
  const [daVedere, setDaVedere] = useState<number | null>(null);
  const [richieste, setRichieste] = useState<number | null>(null);
  useEffect(() => {
    if (!idUtente) return;
    mieiRuoli().then(async (r) => {
      setRuoli(r);
      if (!r.redattore) return;
      const { conteggio } = await conteggioBozze();
      if (conteggio) setDaVedere((conteggio?.nuovo ?? 0) + (conteggio?.segnalazioni ?? 0));
      setRichieste(await conteggioRichieste());
    });
  }, [idUtente]);
  // Titolari di attività (Fase 2): il link compare solo a chi ha chiesto o gestisce una scheda
  const [attivita, setAttivita] = useState<{ gestite: number; totale: number } | null>(null);
  useEffect(() => {
    if (!idUtente) return;
    mieAttivita().then((r) => {
      if (r.attivita.length) setAttivita({ gestite: r.attivita.filter((a) => a.stato === "approvata").length, totale: r.attivita.length });
    });
  }, [idUtente]);
  // Bacheca (0048): il link compare a chi ha scritto annunci; alla redazione il numero da vedere
  const [annunci, setAnnunci] = useState<number | null>(null);
  const [bachecaDaVedere, setBachecaDaVedere] = useState<number | null>(null);
  useEffect(() => {
    if (!idUtente) return;
    mieiAnnunci().then((r) => {
      if (r.annunci.length) setAnnunci(r.annunci.filter((a) => a.stato === "pubblicato" || a.stato === "in_attesa").length);
    });
    conteggioBacheca().then(setBachecaDaVedere);
  }, [idUtente]);
  // Prenotazioni con 739 (0046): il link compare a chi ne ha, con quante sono in arrivo
  const [prenotazioni, setPrenotazioni] = useState<number | null>(null);
  useEffect(() => {
    if (!idUtente) return;
    miePrenotazioni().then((r) => {
      if (r.prenotazioni.length) setPrenotazioni(r.prenotazioni.filter((p) => (p.stato === "richiesta" || p.stato === "confermata") && Date.parse(p.fine) > Date.now()).length);
    });
  }, [idUtente]);

  if (stato === "caricamento") {
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-label="Caricamento">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-superficie" />
        <div className="aspect-[1.586] w-full animate-pulse rounded-2xl bg-superficie" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-superficie" />
      </div>
    );
  }

  if (stato === "ospite" || !utente) return <Ospite castelli={castelli} />;

  if (!profilo) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Quasi pronto</h1>
        <p className="text-[15px] text-testo-2">Il tuo profilo non è ancora disponibile. Riprova tra qualche secondo.</p>
        <PrimaryButton variante="secondario" onClick={() => esci()}>Esci</PrimaryButton>
      </div>
    );
  }

  const castello = castelli.find((c) => c.id === profilo.castello_id) ?? null;
  const ordinati = [...castelli].sort((a, b) => a.id - b.id);
  const classifica = castelli.filter((c) => (c.metri ?? 0) > 0).sort((a, b) => (b.metri ?? 0) - (a.metri ?? 0));
  const posizione = castello ? classifica.findIndex((c) => c.id === castello.id) + 1 || null : null;
  const nomeCorrente = nome ?? profilo.nome ?? "";
  const primoNome = profilo.nome?.trim().split(/\s+/)[0];
  const tueCose = prenotazioni !== null || annunci !== null || !!attivita || ruoli.organizzatore || ruoli.redattore;

  const salvaNome = async () => {
    const pulito = nomeCorrente.trim().slice(0, 60) || null;
    setSalvataggio("in-corso");
    const r = await salvaProfilo(profilo.id, { nome: pulito });
    if (r.errore) return setSalvataggio("errore");
    aggiornaProfilo({ nome: pulito });
    setNome(null);
    setSalvataggio("fatto");
  };

  return (
    <div className="larga flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-x-14">
      {/* La carta e la quota: su computer a sinistra */}
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{primoNome ? `Ciao, ${primoNome}` : "Il tuo SMR ID"}</h1>
          <p className="text-[15px] text-testo-2">Mostra il QR agli eventi e nei luoghi 739: tocca il codice per ingrandirlo.</p>
        </header>

        {recupero ? <NuovaPassword fatto={() => impostaRecupero(false)} /> : null}

        <SmrCard nome={profilo.nome} tessera={profilo.tessera} castello={castello} rating={rating} metri={metri?.totale ?? null} apriQr={apriQr} key={apriQr ? "qr" : "card"} />

        <QuotaHud metri={metri?.totale ?? null} rating={rating} castello={castello} posizione={posizione} />
      </div>

      <div className="flex flex-col gap-8">
        {metri?.movimenti.length ? (
          <section className="flex flex-col gap-3" aria-labelledby="titolo-movimenti">
            <Titolo id="titolo-movimenti">Ultimi metri</Titolo>
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              {metri.movimenti.slice(0, 5).map((m, i) => (
                <li key={`${m.creato_il}-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">{m.titolo ?? (m.motivo === "checkin" ? "Check-in" : m.motivo === "torneo" ? "Torneo vinto" : m.motivo)}</span>
                    <span className="text-[13px] text-testo-2">{giornoBreve.format(new Date(m.creato_il))}</span>
                  </span>
                  <span className="metri font-mono text-[14px] font-medium">{m.metri > 0 ? "+" : ""}{m.metri} m</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {tueCose ? (
          <section className="flex flex-col gap-3" aria-labelledby="titolo-cose">
            <Titolo id="titolo-cose">Le tue cose</Titolo>
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              {prenotazioni !== null ? <Riga href="/profile/prenotazioni" icona="calendario" titolo="Le mie prenotazioni" nota={prenotazioni ? (prenotazioni === 1 ? "1 in arrivo" : `${prenotazioni} in arrivo`) : "Niente in arrivo"} /> : null}
              {annunci !== null ? <Riga href="/profile/bacheca" icona="bacheca" titolo="I miei annunci" nota={annunci ? (annunci === 1 ? "1 attivo in bacheca" : `${annunci} attivi in bacheca`) : "Nessuno attivo"} /> : null}
              {attivita ? <Riga href="/profile/attivita" icona="negozi" titolo="Le mie attività" nota={attivita.gestite ? (attivita.gestite === 1 ? "1 scheda che gestisci" : `${attivita.gestite} schede che gestisci`) : "Richiesta in verifica"} /> : null}
              {ruoli.organizzatore || ruoli.redattore ? <Riga href="/profile/eventi" icona="eventi" titolo="I miei eventi" nota="Pubblica e modifica i tuoi eventi" /> : null}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-4" aria-labelledby="titolo-carta">
          <Titolo id="titolo-carta">La tua carta</Titolo>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Campo etichetta="Nome sulla carta" maxLength={60} value={nomeCorrente} onChange={(e) => { setNome(e.target.value); setSalvataggio("fermo"); }} />
            </div>
            <PrimaryButton variante="secondario" disabled={nome === null || salvataggio === "in-corso"} onClick={salvaNome}>
              {salvataggio === "in-corso" ? "…" : "Salva"}
            </PrimaryButton>
          </div>
          {salvataggio === "fatto" ? <p role="status" className="-mt-2 text-sm text-testo-2">Nome aggiornato.</p> : null}
          {salvataggio === "errore" ? <p role="alert" className="-mt-2 text-sm text-segnale">Non sono riuscito a salvare. Riprova.</p> : null}

          <fieldset className="flex flex-col">
            <legend className="mb-2 text-[13px] font-medium text-testo-2">Il tuo castello: i metri che guadagni vanno a lui</legend>
            <div className="grid grid-cols-3 gap-2">
              {ordinati.map((c) => {
                const scelto = profilo.castello_id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={scelto}
                    onClick={() => impostaCastello(c.slug)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center text-[12px] font-medium leading-tight transition-colors active:scale-[0.98] ${scelto ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}
                  >
                    <EmblemaCastello c={c} className="size-10" />
                    <span>{c.nome}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </section>

        <Notifiche />
        <AvvisiPersonali testo="Avvisi solo per te, per esempio quando un centro risponde a una tua prenotazione. Non sono il Bollettino." />

        {ruoli.redattore ? (
          <section className="flex flex-col gap-3" aria-labelledby="titolo-redazione">
            <Titolo id="titolo-redazione">{ruoli.amministratore ? "Amministrazione" : "Redazione"}</Titolo>
            <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
              <Riga href="/admin/coda" icona="coda" titolo="Coda delle bozze" nota="Bozze e segnalazioni" numero={daVedere} />
              <Riga href="/admin/attivita" icona="negozi" titolo="Attività" nota="Titolari, schede nuove, offerte di lavoro" numero={richieste} />
              <Riga href="/admin/bacheca" icona="bacheca" titolo="Bacheca" nota="Annunci da leggere prima che escano" numero={bachecaDaVedere} />
              <Riga href="/admin/contenuti" icona="storie" titolo="Contenuti" nota="Bollettino, rubriche e storie" />
              <Riga href="/admin/scadenze" icona="calendario" titolo="Scadenze e bandi" nota="Sempre con la fonte ufficiale" />
              <Riga href="/admin/servizi" icona="trasporti" titolo="Orari e raccolta" nota="Corse di funivia e bus, raccolta dei rifiuti" />
              <Riga href="/admin/importa" icona="importa" titolo="Importa" nota="Luoghi, eventi, avvisi e contenuti da JSON" />
              {ruoli.amministratore ? <Riga href="/admin/fonti" icona="mappa" titolo="Fonti dei luoghi" nota="Overture Maps da controllare e pubblicare" /> : null}
              {ruoli.amministratore ? <Riga href="/admin/numeri" icona="numeri" titolo="Numeri" nota="SMR ID, chi torna, eventi, schede" /> : null}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-3" aria-labelledby="titolo-account">
          <Titolo id="titolo-account">Account</Titolo>
          <div className="flex items-center gap-3 rounded-2xl bg-superficie p-4">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium">{utente.email ?? "Email"}</span>
              <span className="text-[13px] text-testo-2">Email di accesso</span>
            </span>
            <PrimaryButton variante="interno" dimensione="sm" onClick={() => esci()}>Esci</PrimaryButton>
          </div>
          <p className="text-[12px] text-testo-2">
            SMR ID è la tessera digitale di 739: non è un documento d&apos;identità. <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>, <Link href="/termini" className="underline underline-offset-2">Termini d&apos;uso</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
