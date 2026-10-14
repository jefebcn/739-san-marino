import Link from "next/link";
import type { ReactNode } from "react";
import { Icona, type NomeIcona } from "./Icona";
import StatoApertura from "./StatoApertura";
import MappaPunto from "./MappaPunto";
import { CATEGORIE, linkIndicazioni, type Castello, type Luogo } from "@/lib/data";
import Condividi from "./Condividi";

const giornoLungo = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/San_Marino" });

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
export default function Scheda({ l, castello, azioni }: { l: Luogo; castello: Castello | null; azioni?: ReactNode }) {
  const categoria = CATEGORIE[l.categoria] ?? l.categoria;
  const fonteNome = l.fonte_nome ?? (l.fonte === "osm" ? "OpenStreetMap" : null);
  const fonteLink = l.fonte_link ?? (l.fonte === "osm" ? "https://www.openstreetmap.org/copyright" : null);
  const pratiche = Array.isArray(l.cosa_fare) ? l.cosa_fare.filter((p) => p?.titolo) : [];
  const haDati = l.indirizzo || l.orari || l.telefono || l.email || l.sito || l.tariffa || l.posti;

  return (
    // Telefono: una colonna con la foto in cima. Computer: i dati a sinistra, foto e mappa ferme a destra
    <article className="larga flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-10">
      <div className="contents lg:flex lg:flex-col lg:gap-5">
        <header className="flex flex-col gap-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">{l.nome}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-testo-2">
            <span>{l.sottocategoria ? `${categoria}, ${l.sottocategoria}` : categoria}</span>
            {castello ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: castello.colore }} />
                {castello.nome}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {l.da_verificare ? <span className="verifica">Da verificare</span> : null}
            <StatoApertura orari={l.orari_settimana} />
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <a href={linkIndicazioni(l.lat, l.lng)} target="_blank" rel="noopener" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-metallo text-[15px] font-semibold text-su-accento active:scale-[0.98]">
            <Icona nome="indicazioni" size={20} /> Indicazioni
          </a>
          <Link href={`/mappa?luogo=${l.id}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-superficie text-[15px] font-semibold hover:bg-superficie-2 active:scale-[0.98]">
            <Icona nome="mappa" size={20} /> Sulla mappa
          </Link>
          <Condividi titolo={l.nome} testo={`${l.nome} su 739`} percorso={`/luoghi/${l.id}`} className="col-span-2 min-h-12 text-[15px]" />
        </div>

        {l.descrizione ? <p className="max-w-[65ch] text-[15px] leading-relaxed text-testo-2">{l.descrizione}</p> : null}

        {haDati ? (
          <section className="divide-y divide-linea rounded-2xl bg-superficie" aria-label="Informazioni">
            {l.indirizzo ? <Dato icona="pin" titolo="Indirizzo">{l.indirizzo}</Dato> : null}
            {l.orari ? <Dato icona="orologio" titolo="Orari">{l.orari}</Dato> : null}
            {l.telefono ? (
              <Dato icona="telefono" titolo="Telefono">
                <a href={`tel:${l.telefono.replace(/\s/g, "")}`} className="font-mono font-medium text-accento">{l.telefono}</a>
              </Dato>
            ) : null}
            {l.email ? (
              <Dato icona="email" titolo="Email">
                <a href={`mailto:${l.email}`} className="text-accento">{l.email}</a>
              </Dato>
            ) : null}
            {l.sito ? (
              <Dato icona="sito" titolo="Sito">
                <a href={l.sito} target="_blank" rel="noopener" className="text-accento">{dominio(l.sito)}</a>
              </Dato>
            ) : null}
            {l.tariffa || l.posti ? (
              <Dato icona="parcheggio" titolo={l.posti ? `Tariffe, ${l.posti} posti` : "Tariffe"}>{l.tariffa ?? "Non indicate"}</Dato>
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
              <>Fonte: {fonteLink ? <a href={fonteLink} target="_blank" rel="noopener" className="underline">{fonteNome}</a> : fonteNome}{l.fonte === "osm" ? " contributors" : ""}. </>
            ) : null}
            {l.verificato_il ? <>Controllato il {giornoLungo.format(new Date(`${l.verificato_il}T12:00:00Z`))}.</> : <>Non ancora controllato dalla redazione.</>}
          </p>
          {azioni}
        </footer>
      </div>
      <div className="contents lg:sticky lg:top-0 lg:flex lg:flex-col lg:gap-4">
        {l.foto_url ? (
          <figure className="order-first flex flex-col gap-1.5 lg:order-none">
            {/* Foto da fonti esterne con credito: niente ottimizzazione di Next, che chiede di elencare i domini */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.foto_url} alt={l.nome} loading="lazy" className="aspect-[16/10] w-full rounded-2xl bg-superficie object-cover" />
            {l.foto_credito ? <figcaption className="text-xs text-testo-2">Foto: {l.foto_credito}</figcaption> : null}
          </figure>
        ) : null}
        <MappaPunto lat={l.lat} lng={l.lng} nome={l.nome} categoria={l.categoria} />
      </div>
    </article>
  );
}
