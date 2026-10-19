import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import Condividi from "@/components/Condividi";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import { PuntoCategoria } from "@/components/Segnaposto";
import { getClassifica, linkIndicazioni } from "@/lib/data";
import type { Lingua } from "@/lib/lingua";
import MappaSentieri from "./MappaSentieri";
import Profilo from "./Profilo";
import { luoghiLungo } from "../lungo";
import { AGGIORNATO_IL, BASE, DIFFICOLTA, collegati, dislivello, durata, km, percorso, tempo, titolo, type Sentiero } from "../sentieri";

const T = {
  it: {
    torna: "Itinerari", sentiero: "Sentiero", inNumeri: "in numeri",
    lunghezza: "Lunghezza", anello: "Ad anello", andata: "Solo andata",
    dislivello: "Dislivello", tuttoIlGiro: "In salita, in tutto il giro", versoSalita: "Nel verso in salita", traBassoAlto: "Tra il punto più basso e il più alto",
    quotaMax: "Quota massima", piuBassa: (q: number) => `La più bassa ${q} m`,
    tempo: "Tempo", stima: "Stima a passo tranquillo, senza soste", daOsm: "Indicato su OpenStreetMap",
    nonSegnalato: "Sentiero non segnalato.", nonSegnalatoTesto: "Sul posto il percorso non ha i segni del sentiero: tieni la mappa o la traccia GPX a portata di mano.",
    mancanti: "Su OpenStreetMap il tracciato di questo sentiero ha dei tratti mancanti: la linea sulla mappa ha dei salti e la lunghezza può essere più corta di quella vera.",
    mappa: "Mappa del sentiero", partenza: "Alla partenza", gpx: "Traccia GPX", profilo: "Profilo", ilSentiero: "Il sentiero",
    da: "Partenza", a: "Arrivo", via: "Passa da", castello: "Castello", castelli: "Castelli", quota: "Quota", quotaDa: (a: number, b: number) => `da ${a} a ${b} m`,
    difficolta: "Difficoltà", segnato: "Segnato da",
    lungo: "Lungo il percorso", allaPartenza: "Alla partenza", dopo: (d: string) => `Dopo ${d}`, dalSentiero: (m: number) => `, a ${m} m dal sentiero`,
    stessoNumero: "Con lo stesso numero", saperne: "Per saperne di più", pdf: "La mappa dei sentieri di San Marino (PDF)",
    fonte: "Tracciato da", licenza: "(© i suoi contributori, ODbL), tramite Waymarked Trails.",
    calcoli: "Lunghezza, dislivello e tempo li calcola 739 (quote dal modello EU-DEM di Copernicus): sono indicativi.",
    letti: "Dati letti il", correggi: "Qualcosa non torna? Si corregge su", prossima: ", e alla prossima lettura dei dati arriva anche qui.",
  },
  en: {
    torna: "Walking trails", sentiero: "Trail", inNumeri: "in numbers",
    lunghezza: "Length", anello: "Loop", andata: "One way",
    dislivello: "Climb", tuttoIlGiro: "Uphill, over the whole loop", versoSalita: "Walking the uphill way", traBassoAlto: "Between the lowest and highest point",
    quotaMax: "Highest point", piuBassa: (q: number) => `Lowest ${q} m`,
    tempo: "Time", stima: "Our estimate at an easy pace, no stops", daOsm: "As given on OpenStreetMap",
    nonSegnalato: "Not waymarked.", nonSegnalatoTesto: "There are no trail markings on the ground: keep the map or the GPX track at hand.",
    mancanti: "On OpenStreetMap this trail has missing sections: the line on the map has gaps and the real length may be longer.",
    mappa: "Map of the trail", partenza: "To the start", gpx: "GPX track", profilo: "Elevation", ilSentiero: "The trail",
    da: "Start", a: "End", via: "Passes", castello: "Castle", castelli: "Castles", quota: "Altitude", quotaDa: (a: number, b: number) => `${a} to ${b} m`,
    difficolta: "Difficulty", segnato: "Waymarked by",
    lungo: "Along the way", allaPartenza: "At the start", dopo: (d: string) => `After ${d}`, dalSentiero: (m: number) => `, ${m} m off the trail`,
    stessoNumero: "Same number", saperne: "Find out more", pdf: "Map of the San Marino trails (PDF, in Italian)",
    fonte: "Route from", licenza: "(© its contributors, ODbL), via Waymarked Trails.",
    calcoli: "Length, climb and time are worked out by 739 (altitudes from the Copernicus EU-DEM model): treat them as a guide.",
    letti: "Data read on", correggi: "Something wrong? It can be fixed on", prossima: ", and it shows up here the next time we read the data.",
  },
};

/** Un sentiero, in italiano o in inglese: numeri, mappa, profilo, cosa si incontra, varianti, fonti. Nomi e descrizioni restano come su OSM */
export default async function SchedaSentiero({ s, lingua = "it" }: { s: Sentiero; lingua?: Lingua }) {
  const t = T[lingua];
  const en = lingua === "en";
  const it = en ? "it" : undefined;
  const base = BASE[lingua];
  const [castelli, lungoIlPercorso] = await Promise.all([getClassifica(), luoghiLungo(s)]);
  const d = dislivello(s);
  const tm = tempo(s);
  const altri = collegati(s);
  const [lng, lat] = s.inizio;
  const riga = percorso(s, lingua);
  const giorno = new Intl.DateTimeFormat(en ? "en-GB" : "it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const osm = `https://www.openstreetmap.org/relation/${s.id}`;

  const dati: { nome: string; valore: React.ReactNode }[] = [
    ...(s.da ? [{ nome: t.da, valore: <span lang={it}>{s.da}</span> }] : []),
    ...(s.a && !s.anello ? [{ nome: t.a, valore: <span lang={it}>{s.a}</span> }] : []),
    ...(s.via && !s.anello ? [{ nome: t.via, valore: <span lang={it}>{s.via.replace(/\s+-\s+/g, ", ")}</span> }] : []),
    ...(s.castelli.length
      ? [{
          nome: s.castelli.length === 1 ? t.castello : t.castelli,
          valore: (
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {s.castelli.map((id) => {
                const c = castelli.find((x) => x.id === id);
                if (!c) return null;
                const punto = <><span className="size-2.5 rounded-full" style={{ background: c.colore }} />{c.nome}</>;
                // Le pagine dei castelli ci sono solo in italiano
                return en ? <span key={id} className="flex items-center gap-1.5">{punto}</span> : <Link key={id} href={`/castelli/${c.slug}`} className="flex items-center gap-1.5 underline-offset-2 hover:underline">{punto}</Link>;
              })}
            </span>
          ),
        }]
      : []),
    ...(s.quota_min !== null && s.quota_max !== null ? [{ nome: t.quota, valore: <span className="font-mono">{t.quotaDa(s.quota_min, s.quota_max)}</span> }] : []),
    ...(s.difficolta ? [{ nome: t.difficolta, valore: DIFFICOLTA[lingua][s.difficolta] }] : []),
    ...(s.gestore ? [{ nome: t.segnato, valore: <span lang={it}>{s.gestore}</span> }] : []),
  ];

  return (
    <>
      <TestaPagina href={base} verso={t.torna} titolo={s.nome}>
        <p className="sottotitolo flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {s.numero ? <span className="taglio-piccolo voce-logo bg-metallo py-0.5 text-[15px] text-su-accento">{t.sentiero} {s.numero}</span> : null}
          {riga ? <span>{riga}</span> : null}
        </p>
      </TestaPagina>

      <section className="larga flex flex-col gap-6">
        <Cruscotto etichetta={`${s.nome} ${t.inNumeri}`}>
          <Cella titolo={t.lunghezza} valore={s.lunghezza_m < 1000 ? Math.round(s.lunghezza_m / 10) * 10 : km(s.lunghezza_m, lingua).replace(" km", "")} unita={s.lunghezza_m < 1000 ? "m" : "km"} nota={s.anello ? t.anello : t.andata} />
          <Cella titolo={t.dislivello} valore={d ?? "-"} unita={d !== null ? "m" : undefined} nota={s.continuo ? (s.anello ? t.tuttoIlGiro : t.versoSalita) : t.traBassoAlto} />
          <Cella titolo={t.quotaMax} valore={s.quota_max ?? "-"} unita={s.quota_max !== null ? "m" : undefined} nota={s.quota_min !== null ? t.piuBassa(s.quota_min) : undefined} />
          <Cella titolo={t.tempo} valore={durata(tm.minuti)} nota={tm.stima ? t.stima : t.daOsm} />
        </Cruscotto>

        {s.segnalato === false || s.tratti_mancanti ? (
          <div className="flex flex-col gap-2">
            {s.segnalato === false ? (
              <p role="note" className="flex gap-3 rounded-2xl bg-superficie p-4 text-[14px] leading-relaxed">
                <span className="mt-0.5 shrink-0"><Icona nome="allerta" size={18} /></span>
                <span><b className="font-semibold">{t.nonSegnalato}</b> {t.nonSegnalatoTesto}</span>
              </p>
            ) : null}
            {s.tratti_mancanti ? (
              <p role="note" className="flex gap-3 rounded-2xl bg-superficie p-4 text-[14px] leading-relaxed">
                <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome="info" size={18} /></span>
                <span>{t.mancanti}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="flex flex-col gap-4">
            <MappaSentieri sentiero={{ slug: s.slug, numero: s.numero, nome: s.nome, linee: s.linee, anello: s.anello }} etichetta={`${t.mappa} ${s.nome}`} base={base} />
            <div className="grid grid-cols-2 gap-2">
              <a href={linkIndicazioni(lat, lng)} target="_blank" rel="noopener" className="taglio flex h-12 items-center justify-center gap-2 bg-metallo text-[15px] font-semibold text-su-accento active:scale-[0.98]">
                <Icona nome="indicazioni" size={20} /> {t.partenza}
              </a>
              <a href={`/uscire/itinerari/${s.slug}/gpx`} download className="flex h-12 items-center justify-center gap-2 rounded-xl bg-superficie text-[15px] font-semibold hover:bg-superficie-2 active:scale-[0.98]">
                <Icona nome="scarica" size={20} /> {t.gpx}
              </a>
            </div>
            <Condividi titolo={titolo(s, lingua)} testo={riga ?? undefined} percorso={`${base}/${s.slug}`} lingua={lingua} />
            {s.profilo ? (
              <section className="flex flex-col gap-3" aria-labelledby="t-profilo">
                <h2 id="t-profilo" className="text-[19px] font-semibold tracking-tight">{t.profilo}</h2>
                <Profilo profilo={s.profilo} da={s.anello ? null : s.da} a={s.anello ? null : s.a} lingua={lingua} />
              </section>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3" aria-labelledby="t-dati">
              <h2 id="t-dati" className="text-[19px] font-semibold tracking-tight">{t.ilSentiero}</h2>
              {s.descrizione ? <p lang={it} className="text-[15px] leading-relaxed">{s.descrizione}</p> : null}
              {dati.length ? (
                <dl className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                  {dati.map((r) => (
                    <div key={r.nome} className="flex gap-4 px-4 py-3 text-[15px]">
                      <dt className="w-28 shrink-0 text-testo-2">{r.nome}</dt>
                      <dd className="min-w-0">{r.valore}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>

            {lungoIlPercorso.length ? (
              <section className="flex flex-col gap-3" aria-labelledby="t-lungo">
                <h2 id="t-lungo" className="text-[19px] font-semibold tracking-tight">{t.lungo}</h2>
                <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                  {lungoIlPercorso.map((l) => (
                    <li key={l.id}>
                      <Link prefetch={false} href={`${en ? "/en/places" : "/luoghi"}/${l.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2">
                        <PuntoCategoria categoria={l.categoria} sottocategoria={l.sottocategoria} grande />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span lang={it} className="truncate text-[15px] font-medium">{l.nome}</span>
                          <span className="text-[12px] text-testo-2">{l.a_m < 50 ? t.allaPartenza : t.dopo(km(l.a_m, lingua))}{l.distanza_m > 30 ? t.dalSentiero(Math.round(l.distanza_m / 10) * 10) : ""}</span>
                        </span>
                        <Icona nome="avanti" size={16} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {altri.length ? (
              <section className="flex flex-col gap-3" aria-labelledby="t-altri">
                <h2 id="t-altri" className="text-[19px] font-semibold tracking-tight">{t.stessoNumero}</h2>
                <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                  {altri.map((a) => (
                    <li key={a.slug}>
                      <Link prefetch={false} href={`${base}/${a.slug}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2">
                        <span className="taglio-piccolo voce-logo flex h-7 min-w-10 items-center justify-center bg-metallo text-[13px] text-su-accento">{a.numero}</span>
                        <span lang={it} className="min-w-0 flex-1 truncate text-[15px] font-medium">{a.nome}</span>
                        <span className="shrink-0 font-mono text-[13px] text-testo-2">{km(a.lunghezza_m, lingua)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {s.sito || s.mappa_pdf ? (
              <section className="flex flex-col gap-2" aria-labelledby="t-altro">
                <h2 id="t-altro" className="text-[19px] font-semibold tracking-tight">{t.saperne}</h2>
                {s.sito ? <a href={s.sito} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-[15px] font-medium text-accento underline-offset-2 hover:underline"><Icona nome="sito" size={16} /> {new URL(s.sito).hostname.replace(/^www\./, "")}</a> : null}
                {s.mappa_pdf ? <a href={s.mappa_pdf} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-[15px] font-medium text-accento underline-offset-2 hover:underline"><Icona nome="mappa" size={16} piatta /> {t.pdf}</a> : null}
              </section>
            ) : null}
          </div>
        </div>

        <aside role="note" className="flex gap-3 rounded-2xl border border-linea p-4 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome="info" size={20} /></span>
          <span className="flex flex-col gap-1.5">
            <span>
              {t.fonte} <a href={osm} target="_blank" rel="noopener" className="underline underline-offset-2">OpenStreetMap</a> {t.licenza} {t.calcoli}
            </span>
            <span className="text-[13px] text-testo-2">
              {t.letti} {giorno.format(new Date(`${AGGIORNATO_IL}T12:00:00Z`))}. {t.correggi} <a href={osm} target="_blank" rel="noopener" className="underline underline-offset-2">OpenStreetMap</a>{t.prossima}
            </span>
          </span>
        </aside>
      </section>
    </>
  );
}
