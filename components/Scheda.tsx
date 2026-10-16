import Link from "next/link";
import type { ReactNode } from "react";
import { Icona, type NomeIcona } from "./Icona";
import StatoApertura from "./StatoApertura";
import MappaPunto from "./MappaPunto";
import { CATEGORIA_SINGOLA, CATEGORIE, TIPI_LEGGIBILI, linkIndicazioni, type Castello, type DatiPro, type Luogo } from "@/lib/data";
import Condividi from "./Condividi";
import { CATEGORIA_SINGOLA_EN, TIPI_EN, type Lingua } from "@/lib/lingua";
import { traduci } from "@/lib/traduci";

// Le attività private, come CATEGORIE_ATTIVITA in modules/attivita/api.ts
const ATTIVITA = new Set(["locale", "negozio", "carburante", "azienda", "professionista", "artigiano", "animali", "associazione", "dormire"]);
const SOLO_TIPO = new Set(["locale", "scuola", "chiesa", "banca", "negozio", "azienda", "professionista", "artigiano", "animali", "associazione", "dormire"]);

const giornoBreve = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
const giornoLungo = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/San_Marino" });
const giornoBreveEn = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
const giornoLungoEn = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/San_Marino" });

const T = {
  it: {
    indicazioni: "Indicazioni", mappa: "Sulla mappa", menu: "Menu", prenota: "Prenota", offerte: "Offerte", fino: "Fino al", info: "Informazioni",
    indirizzo: "Indirizzo", orari: "Orari", telefono: "Telefono", email: "Email", sito: "Sito", tariffe: "Tariffe", posti: "posti", nonIndicate: "Non indicate",
    verificare: "Da verificare", fonte: "Fonte", titolare: "Aggiornata dal titolare il", controllato: "Controllato il", maiControllato: "Non ancora controllato dalla redazione.", foto: "Foto",
  },
  en: {
    indicazioni: "Directions", mappa: "On the map", menu: "Menu", prenota: "Book", offerte: "Offers", fino: "Until", info: "Information",
    indirizzo: "Address", orari: "Opening hours", telefono: "Phone", email: "Email", sito: "Website", tariffe: "Fares", posti: "spaces", nonIndicate: "Not given",
    verificare: "To be checked", fonte: "Source", titolare: "Updated by the owner on", controllato: "Checked on", maiControllato: "Not yet checked by our editors.", foto: "Photo",
  },
};

/** Il tipo del luogo in inglese: il tipo se lo conosciamo, se no la categoria */
function tipoEn(l: Luogo) {
  return (l.sottocategoria && l.sottocategoria !== "altro" ? TIPI_EN[l.sottocategoria] : undefined) ?? CATEGORIA_SINGOLA_EN[l.categoria] ?? l.categoria;
}

/** «https://www.museidistato.sm/x» → «museidistato.sm» */
function dominio(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Dato({ icona, titolo, children }: { icona: NomeIcona; titolo: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome={icona} size={20} /></span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13px] text-testo-2">{titolo}</span>
        <span className="text-[15px] leading-snug break-words">{children}</span>
      </span>
    </div>
  );
}

/**
 * La scheda unica (docs/piano.md): la stessa ossatura per qualunque luogo.
 * Nome, castello, stato di apertura, indicazioni, contatti, foto con credito, «Cosa posso fare qui»,
 * «Da verificare», fonte e data dell'ultimo controllo. `azioni` è il posto di «Segnala un errore».
 */
export default function Scheda({ l, castello, azioni, gestito = false, pro = null, lingua = "it" }: { l: Luogo; castello: Castello | null; azioni?: ReactNode; gestito?: boolean; pro?: DatiPro | null; lingua?: Lingua }) {
  // In inglese: etichette e dati dei servizi tradotti; descrizione, pratiche e testi dei titolari restano in italiano
  const t = T[lingua];
  const en = lingua === "en";
  const categoria = CATEGORIE[l.categoria] ?? l.categoria;
  const fonteNome = l.fonte_nome ?? (l.fonte === "osm" ? "OpenStreetMap" : null);
  const fonteLink = l.fonte_link ?? (l.fonte === "osm" ? "https://www.openstreetmap.org/copyright" : null);
  const pratiche = !en && Array.isArray(l.cosa_fare) ? l.cosa_fare.filter((p) => p?.titolo) : [];
  const haDati = l.indirizzo || l.orari || l.telefono || l.email || l.sito || l.tariffa || l.posti;

  return (
    // Telefono: una colonna con la foto in cima. Computer: i dati a sinistra, foto e mappa ferme a destra
    <article className="larga flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-10">
      <div className="contents lg:flex lg:flex-col lg:gap-5">
        <header className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">{l.nome}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-testo-2">
            {/* Locali, scuole, chiese e bancomat: basta il tipo («Pizzeria», «Elementare»); per gli altri luoghi categoria e tipo */}
            <span>{en ? tipoEn(l) : l.sottocategoria === "altro" && CATEGORIA_SINGOLA[l.categoria] ? CATEGORIA_SINGOLA[l.categoria] : l.sottocategoria ? (SOLO_TIPO.has(l.categoria) ? TIPI_LEGGIBILI[l.sottocategoria] ?? l.sottocategoria[0].toUpperCase() + l.sottocategoria.slice(1) : `${categoria}, ${l.sottocategoria}`) : categoria}</span>
            {castello ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: castello.colore }} />
                {castello.nome}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {l.da_verificare ? <span className="verifica">{t.verificare}</span> : null}
            <StatoApertura orari={l.orari_settimana} lingua={lingua} />
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <a href={linkIndicazioni(l.lat, l.lng)} target="_blank" rel="noopener" data-conta="indicazioni" className="taglio flex h-12 items-center justify-center gap-2 bg-metallo text-[15px] font-semibold text-su-accento active:scale-[0.98]">
            <Icona nome="indicazioni" size={20} /> {t.indicazioni}
          </a>
          <Link prefetch={false} href={`${en ? "/en/map" : "/mappa"}?luogo=${l.id}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-superficie text-[15px] font-semibold hover:bg-superficie-2 active:scale-[0.98]">
            <Icona nome="mappa" size={20} /> {t.mappa}
          </Link>
          {/* 739 Pro: menu e prenotazioni del titolare */}
          {pro?.menu_url ? (
            <a href={pro.menu_url} target="_blank" rel="noopener" data-conta="menu" className={`${pro.prenota_url ? "" : "col-span-2 "}flex h-12 items-center justify-center gap-2 rounded-xl bg-superficie text-[15px] font-semibold hover:bg-superficie-2 active:scale-[0.98]`}>
              <Icona nome="food" size={20} /> {t.menu}
            </a>
          ) : null}
          {pro?.prenota_url ? (
            <a href={pro.prenota_url} target="_blank" rel="noopener" data-conta="prenota" className={`${pro.menu_url ? "" : "col-span-2 "}flex h-12 items-center justify-center gap-2 rounded-xl bg-superficie text-[15px] font-semibold hover:bg-superficie-2 active:scale-[0.98]`}>
              <Icona nome="calendario" size={20} /> {t.prenota}
            </a>
          ) : null}
          <Condividi titolo={l.nome} testo={en ? `${l.nome} on 739` : `${l.nome} su 739`} percorso={en ? `/en/places/${l.id}` : `/luoghi/${l.id}`} lingua={lingua} className="col-span-2 min-h-12 text-[15px]" />
        </div>

        {pro?.offerte.length ? (
          <section className="flex flex-col gap-2" aria-label={t.offerte}>
            <h2 className="text-[19px] font-semibold tracking-tight">{t.offerte}</h2>
            {pro.offerte.map((o) => (
              <div key={o.titolo + o.al} className="flex flex-col gap-1 rounded-2xl bg-accento-tenue p-4">
                <span className="text-[15px] font-semibold">{o.titolo}</span>
                {o.testo ? <span className="text-sm leading-relaxed text-testo-2">{o.testo}</span> : null}
                <span className="text-[13px] text-accento">{t.fino} {(en ? giornoBreveEn : giornoBreve).format(new Date(`${o.al}T12:00:00Z`))}</span>
              </div>
            ))}
          </section>
        ) : null}

        {l.descrizione ? <p lang={en && traduci(l.descrizione) === l.descrizione ? "it" : undefined} className="max-w-[65ch] text-[15px] leading-relaxed text-testo-2">{en ? traduci(l.descrizione) : l.descrizione}</p> : null}

        {haDati ? (
          <section className="divide-y divide-linea rounded-2xl bg-superficie" aria-label={t.info}>
            {l.indirizzo ? <Dato icona="pin" titolo={t.indirizzo}>{l.indirizzo}</Dato> : null}
            {l.orari ? <Dato icona="orologio" titolo={t.orari}>{en ? traduci(l.orari) : l.orari}</Dato> : null}
            {l.telefono ? (
              <Dato icona="telefono" titolo={t.telefono}>
                <a href={`tel:${l.telefono.replace(/\s/g, "")}`} data-conta="telefono" className="font-mono font-medium text-accento">{l.telefono}</a>
              </Dato>
            ) : null}
            {l.email ? (
              <Dato icona="email" titolo={t.email}>
                <a href={`mailto:${l.email}`} data-conta="email" className="text-accento">{l.email}</a>
              </Dato>
            ) : null}
            {l.sito ? (
              <Dato icona="sito" titolo={t.sito}>
                <a href={l.sito} target="_blank" rel="noopener" data-conta="sito" className="text-accento">{dominio(l.sito)}</a>
              </Dato>
            ) : null}
            {l.tariffa || l.posti ? (
              <Dato icona="parcheggio" titolo={l.posti ? `${t.tariffe}, ${l.posti} ${t.posti}` : t.tariffe}>{l.tariffa ? (en ? traduci(l.tariffa) : l.tariffa) : t.nonIndicate}</Dato>
            ) : null}
          </section>
        ) : null}

        {pratiche.length ? (
          <section id="cosa-fare" className="flex scroll-mt-20 flex-col gap-3" aria-label="Cosa posso fare qui">
            <h2 className="text-[19px] font-semibold tracking-tight">Cosa posso fare qui</h2>
            {pratiche.map((p, i) => (
              <div key={p.titolo} id={`pratica-${i}`} className="flex scroll-mt-20 flex-col gap-2 rounded-2xl bg-superficie p-4 target:ring-2 target:ring-accento">
                <h3 className="text-[15px] font-semibold leading-snug">{p.titolo}</h3>
                {p.testo ? <p className="text-sm leading-relaxed text-testo-2">{p.testo}</p> : null}
                {p.documenti?.length ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium">Da portare</span>
                    <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-testo-2">
                      {p.documenti.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </div>
                ) : null}
                {p.link ? (
                  <a href={p.link} target="_blank" rel="noopener" className="flex w-fit items-center gap-1 text-sm font-medium text-accento">
                    Si può fare online <Icona nome="avanti" size={14} />
                  </a>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        <footer className="flex flex-col gap-3 border-t border-linea pt-4">
          <p className="text-[13px] leading-relaxed text-testo-2">
            {fonteNome ? (
              <>{t.fonte}: {fonteLink ? <a href={fonteLink} target="_blank" rel="noopener" className="underline">{fonteNome}</a> : fonteNome}{l.fonte === "osm" ? " contributors" : ""}. </>
            ) : null}
            {l.verificato_il ? <>{gestito ? t.titolare : t.controllato} {(en ? giornoLungoEn : giornoLungo).format(new Date(`${l.verificato_il}T12:00:00Z`))}.</> : <>{t.maiControllato}</>}
          </p>
          {/* Profilo base delle attività (Fase 2): il titolare chiede la scheda */}
          {!en && !gestito && ATTIVITA.has(l.categoria) ? (
            <Link href={`/attivita/chiedi?luogo=${l.id}`} className="flex w-fit items-center gap-1 py-1 text-sm font-medium text-accento">
              {l.categoria === "associazione" ? "È la tua associazione?" : "È la tua attività?"} Gestisci la scheda <Icona nome="avanti" size={14} />
            </Link>
          ) : null}
          {azioni}
        </footer>
      </div>
      <div className="contents lg:sticky lg:top-0 lg:flex lg:flex-col lg:gap-4">
        {l.foto_url ? (
          <figure className="order-first flex flex-col gap-1.5 lg:order-none">
            {/* Foto da fonti esterne con credito: niente ottimizzazione di Next, che chiede di elencare i domini */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.foto_url} alt={l.nome} loading="lazy" className="aspect-[16/10] w-full rounded-2xl bg-superficie object-cover" />
            {l.foto_credito ? <figcaption className="text-xs text-testo-2">{t.foto}: {l.foto_credito}</figcaption> : null}
          </figure>
        ) : null}
        <MappaPunto lat={l.lat} lng={l.lng} nome={l.nome} categoria={l.categoria} sottocategoria={l.sottocategoria} />
      </div>
    </article>
  );
}
