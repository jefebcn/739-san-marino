import Link from "next/link";
import type { ReactNode } from "react";
import { Icona, type NomeIcona } from "@/components/Icona";
import { ConteggioAperte } from "@/components/Farmacie";
import { TestoProssima } from "@/components/Partenze";
import { RaccoltaBreve } from "@/components/Raccolta";
import { ora, type Castello, type Evento, type Luogo } from "@/lib/data";
import type { Contenuto } from "@/lib/contenuti";
import { cielo, gradi, type Meteo } from "@/lib/meteo";
import type { Partenza } from "@/lib/orario";
import type { Raccolta } from "@/lib/servizi";
import type { Partita } from "@/modules/sport/tipi";

function Riga({ href, icona, titolo, children }: { href: string; icona: NomeIcona; titolo: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-start gap-3.5 px-4 py-3.5 transition-colors hover:bg-superficie-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fondo text-testo"><Icona nome={icona} size={20} /></span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] text-testo-2">{titolo}</span>
          <span className="text-[15px] leading-snug">{children}</span>
        </span>
      </Link>
    </li>
  );
}

export type DatiBollettino = {
  meteo: Meteo | null;
  eventi: Evento[];
  farmacie: Luogo[];
  funivia: Partenza[];
  raccolta: Raccolta[];
  castelli: Castello[];
  partite: Partita[];
  /** Il Bollettino scritto dalla redazione, se è uscito oggi */
  scritto: Contenuto | null;
};

/**
 * Il Bollettino delle 7:39: si compone da solo con i dati di adesso (meteo, avvisi, eventi di oggi,
 * farmacie aperte, prossima funivia, raccolta, partite di oggi). Se la redazione ha scritto il suo, compare in cima.
 */
export default function Bollettino({ dati, avvisi, compatto = false }: { dati: DatiBollettino; avvisi?: ReactNode; compatto?: boolean }) {
  const { meteo, eventi, farmacie, funivia, raccolta, castelli, partite, scritto } = dati;
  const tempo = meteo ? cielo(meteo.codice, meteo.giorno) : null;
  const oggi = meteo?.giorni[0];
  const mostrati = compatto ? eventi.slice(0, 3) : eventi;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="titolo-bollettino">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titolo-bollettino" className="text-[19px] font-semibold tracking-tight">
          {compatto ? "Il Bollettino delle 7:39" : "Da sapere oggi"}
        </h2>
        {compatto ? (
          <Link href="/bollettino" className="flex items-center gap-0.5 text-sm font-medium text-testo-2 hover:text-testo">
            Apri <Icona nome="avanti" size={14} />
          </Link>
        ) : null}
      </div>

      {scritto ? (
        <Link href={`/storie/${scritto.slug}`} className="flex flex-col gap-1 rounded-2xl bg-accento-tenue p-4 transition-transform active:scale-[0.99]">
          <span className="text-[15px] font-semibold text-accento">{scritto.titolo}</span>
          {scritto.sommario ? <span className="text-sm leading-relaxed text-testo">{scritto.sommario}</span> : null}
          <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accento">Leggi <Icona nome="vai" size={14} /></span>
        </Link>
      ) : null}

      {avvisi}

      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {meteo && tempo ? (
          <Riga href="/utili/meteo" icona={tempo.icona} titolo="Meteo">
            {tempo.testo}, <b className="font-mono font-medium">{gradi(meteo.temperatura)}</b> adesso
            {oggi ? (
              <>
                ; massima <b className="font-mono font-medium">{gradi(oggi.max)}</b>, minima <b className="font-mono font-medium">{gradi(oggi.min)}</b>
                {oggi.pioggia >= 30 ? <>, pioggia al <b className="font-mono font-medium">{oggi.pioggia}%</b></> : null}
              </>
            ) : null}
          </Riga>
        ) : null}
        <Riga href="/eventi" icona="eventi" titolo={eventi.length === 1 ? "1 evento oggi" : eventi.length ? `${eventi.length} eventi oggi` : "Eventi"}>
          {mostrati.length ? (
            <span className="flex flex-col gap-1">
              {mostrati.map((e) => (
                <span key={e.id} className="flex gap-2">
                  <span className="w-11 shrink-0 font-mono text-[14px] font-medium text-testo-2">{ora(e.inizio)}</span>
                  <span className="min-w-0">{e.titolo}</span>
                </span>
              ))}
              {eventi.length > mostrati.length ? <span className="text-sm text-testo-2">e altri {eventi.length - mostrati.length}</span> : null}
            </span>
          ) : (
            "Niente in calendario oggi"
          )}
        </Riga>
        <Riga href="/utili/farmacie" icona="farmacia" titolo="Farmacie">
          <ConteggioAperte farmacie={farmacie} breve />, Cailungo 24 ore su 24
        </Riga>
        {funivia.length ? (
          <Riga href="/utili/trasporti" icona="funivia" titolo="Funivia per Città">
            Prossima corsa <TestoProssima partenze={funivia} />
          </Riga>
        ) : null}
        <Riga href="/utili/rifiuti" icona="rifiuti" titolo="Raccolta di oggi">
          <RaccoltaBreve raccolta={raccolta} castelli={castelli} compatto oggi />
        </Riga>
        {partite.length ? (
          <Riga href="/sport" icona="sport" titolo="Sport">
            {partite.length === 1 ? "1 partita aperta oggi" : `${partite.length} partite aperte oggi`}, {partite.reduce((n, p) => n + Math.max(0, p.posti - p.iscritti), 0)} posti liberi
          </Riga>
        ) : null}
      </ul>
    </section>
  );
}
