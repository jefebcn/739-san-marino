import Link from "next/link";
import { notFound } from "next/navigation";
import TestaPagina from "@/components/Indietro";
import Condividi from "@/components/Condividi";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import { PuntoCategoria } from "@/components/Segnaposto";
import { getClassifica, linkIndicazioni } from "@/lib/data";
import { metadatiCondivisione } from "@/lib/condivisione";
import MappaSentieri from "@/modules/itinerari/components/MappaSentieri";
import Profilo from "@/modules/itinerari/components/Profilo";
import { luoghiLungo } from "@/modules/itinerari/lungo";
import { AGGIORNATO_IL, DIFFICOLTA, SENTIERI, collegati, dislivello, durata, km, percorso, sentiero, tempo, titolo } from "@/modules/itinerari/sentieri";

// I luoghi lungo il percorso cambiano poco: la pagina si rifà una volta al giorno
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return SENTIERI.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const s = sentiero((await params).slug);
  if (!s) return {};
  const d = dislivello(s);
  return metadatiCondivisione({
    titolo: titolo(s),
    descrizione: [percorso(s), `${km(s.lunghezza_m)}${d !== null ? `, ${d} m di dislivello` : ""}, circa ${durata(tempo(s).minuti)}.`, "Mappa, profilo altimetrico e traccia GPX."].filter(Boolean).join(". "),
    percorso: `/uscire/itinerari/${s.slug}`,
  });
}

const lungo = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Un sentiero: numeri, mappa, profilo, cosa si incontra, varianti, fonti */
export default async function PaginaSentiero({ params }: Props) {
  const s = sentiero((await params).slug);
  if (!s) notFound();
  const [castelli, lungoIlPercorso] = await Promise.all([getClassifica(), luoghiLungo(s)]);
  const d = dislivello(s);
  const t = tempo(s);
  const altri = collegati(s);
  const [lng, lat] = s.inizio;
  const riga = percorso(s);

  const dati: { nome: string; valore: React.ReactNode }[] = [
    ...(s.da ? [{ nome: "Partenza", valore: s.da }] : []),
    ...(s.a && !s.anello ? [{ nome: "Arrivo", valore: s.a }] : []),
    ...(s.via && !s.anello ? [{ nome: "Passa da", valore: s.via.replace(/\s+-\s+/g, ", ") }] : []),
    ...(s.castelli.length
      ? [{
          nome: s.castelli.length === 1 ? "Castello" : "Castelli",
          valore: (
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {s.castelli.map((id) => {
                const c = castelli.find((x) => x.id === id);
                return c ? <Link key={id} href={`/castelli/${c.slug}`} className="flex items-center gap-1.5 underline-offset-2 hover:underline"><span className="size-2.5 rounded-full" style={{ background: c.colore }} />{c.nome}</Link> : null;
              })}
            </span>
          ),
        }]
      : []),
    ...(s.quota_min !== null && s.quota_max !== null ? [{ nome: "Quota", valore: <span className="font-mono">da {s.quota_min} a {s.quota_max} m</span> }] : []),
    ...(s.difficolta ? [{ nome: "Difficoltà", valore: DIFFICOLTA[s.difficolta] }] : []),
    ...(s.gestore ? [{ nome: "Segnato da", valore: s.gestore }] : []),
  ];

  return (
    <>
      <TestaPagina href="/uscire/itinerari" verso="Itinerari" titolo={s.nome}>
        <p className="sottotitolo flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {s.numero ? <span className="taglio-piccolo voce-logo bg-metallo py-0.5 text-[15px] text-su-accento">Sentiero {s.numero}</span> : null}
          {riga ? <span>{riga}</span> : null}
        </p>
      </TestaPagina>

      <section className="larga flex flex-col gap-6">
        <Cruscotto etichetta={`${s.nome} in numeri`}>
          <Cella titolo="Lunghezza" valore={s.lunghezza_m < 1000 ? Math.round(s.lunghezza_m / 10) * 10 : (s.lunghezza_m / 1000).toFixed(1).replace(".", ",")} unita={s.lunghezza_m < 1000 ? "m" : "km"} nota={s.anello ? "Ad anello" : "Solo andata"} />
          <Cella titolo="Dislivello" valore={d ?? "-"} unita={d !== null ? "m" : undefined} nota={s.continuo ? (s.anello ? "In salita, in tutto il giro" : "Nel verso in salita") : "Tra il punto più basso e il più alto"} />
          <Cella titolo="Quota massima" valore={s.quota_max ?? "-"} unita={s.quota_max !== null ? "m" : undefined} nota={s.quota_min !== null ? `La più bassa ${s.quota_min} m` : undefined} />
          <Cella titolo="Tempo" valore={durata(t.minuti)} nota={t.stima ? "Stima a passo tranquillo, senza soste" : "Indicato su OpenStreetMap"} />
        </Cruscotto>

        {s.segnalato === false || s.tratti_mancanti ? (
          <div className="flex flex-col gap-2">
            {s.segnalato === false ? (
              <p role="note" className="flex gap-3 rounded-2xl bg-superficie p-4 text-[14px] leading-relaxed">
                <span className="mt-0.5 shrink-0"><Icona nome="allerta" size={18} /></span>
                <span><b className="font-semibold">Sentiero non segnalato.</b> Sul posto il percorso non ha i segni del sentiero: tieni la mappa o la traccia GPX a portata di mano.</span>
              </p>
            ) : null}
            {s.tratti_mancanti ? (
              <p role="note" className="flex gap-3 rounded-2xl bg-superficie p-4 text-[14px] leading-relaxed">
                <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome="info" size={18} /></span>
                <span>Su OpenStreetMap il tracciato di questo sentiero ha dei tratti mancanti: la linea sulla mappa ha dei salti e la lunghezza può essere più corta di quella vera.</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="flex flex-col gap-4">
            <MappaSentieri sentiero={{ slug: s.slug, numero: s.numero, nome: s.nome, linee: s.linee, anello: s.anello }} etichetta={`Mappa del sentiero ${s.nome}`} />
            <div className="grid grid-cols-2 gap-2">
              <a href={linkIndicazioni(lat, lng)} target="_blank" rel="noopener" className="taglio flex h-12 items-center justify-center gap-2 bg-metallo text-[15px] font-semibold text-su-accento active:scale-[0.98]">
                <Icona nome="indicazioni" size={20} /> Alla partenza
              </a>
              <a href={`/uscire/itinerari/${s.slug}/gpx`} download className="flex h-12 items-center justify-center gap-2 rounded-xl bg-superficie text-[15px] font-semibold hover:bg-superficie-2 active:scale-[0.98]">
                <Icona nome="scarica" size={20} /> Traccia GPX
              </a>
            </div>
            <Condividi titolo={titolo(s)} testo={riga ?? undefined} percorso={`/uscire/itinerari/${s.slug}`} />
            {s.profilo ? (
              <section className="flex flex-col gap-3" aria-labelledby="t-profilo">
                <h2 id="t-profilo" className="text-[19px] font-semibold tracking-tight">Profilo</h2>
                <Profilo profilo={s.profilo} da={s.anello ? null : s.da} a={s.anello ? null : s.a} />
              </section>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3" aria-labelledby="t-dati">
              <h2 id="t-dati" className="text-[19px] font-semibold tracking-tight">Il sentiero</h2>
              {s.descrizione ? <p className="text-[15px] leading-relaxed">{s.descrizione}</p> : null}
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
                <h2 id="t-lungo" className="text-[19px] font-semibold tracking-tight">Lungo il percorso</h2>
                <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                  {lungoIlPercorso.map((l) => (
                    <li key={l.id}>
                      <Link prefetch={false} href={`/luoghi/${l.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2">
                        <PuntoCategoria categoria={l.categoria} sottocategoria={l.sottocategoria} grande />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[15px] font-medium">{l.nome}</span>
                          <span className="text-[12px] text-testo-2">{l.a_m < 50 ? "Alla partenza" : `Dopo ${km(l.a_m)}`}{l.distanza_m > 30 ? `, a ${Math.round(l.distanza_m / 10) * 10} m dal sentiero` : ""}</span>
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
                <h2 id="t-altri" className="text-[19px] font-semibold tracking-tight">Con lo stesso numero</h2>
                <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                  {altri.map((a) => (
                    <li key={a.slug}>
                      <Link prefetch={false} href={`/uscire/itinerari/${a.slug}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2">
                        <span className="taglio-piccolo voce-logo flex h-7 min-w-10 items-center justify-center bg-metallo text-[13px] text-su-accento">{a.numero}</span>
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{a.nome}</span>
                        <span className="shrink-0 font-mono text-[13px] text-testo-2">{km(a.lunghezza_m)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {s.sito || s.mappa_pdf ? (
              <section className="flex flex-col gap-2" aria-labelledby="t-altro">
                <h2 id="t-altro" className="text-[19px] font-semibold tracking-tight">Per saperne di più</h2>
                {s.sito ? <a href={s.sito} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-[15px] font-medium text-accento underline-offset-2 hover:underline"><Icona nome="sito" size={16} /> {new URL(s.sito).hostname.replace(/^www\./, "")}</a> : null}
                {s.mappa_pdf ? <a href={s.mappa_pdf} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-[15px] font-medium text-accento underline-offset-2 hover:underline"><Icona nome="mappa" size={16} piatta /> La mappa dei sentieri di San Marino (PDF)</a> : null}
              </section>
            ) : null}
          </div>
        </div>

        <aside role="note" className="flex gap-3 rounded-2xl border border-linea p-4 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome="info" size={20} /></span>
          <span className="flex flex-col gap-1.5">
            <span>
              Tracciato da <a href={`https://www.openstreetmap.org/relation/${s.id}`} target="_blank" rel="noopener" className="underline underline-offset-2">OpenStreetMap</a> (© i suoi contributori, ODbL), tramite Waymarked Trails.
              Lunghezza, dislivello e tempo li calcola 739 (quote dal modello EU-DEM di Copernicus): sono indicativi.
            </span>
            <span className="text-[13px] text-testo-2">
              Dati letti il {lungo.format(new Date(`${AGGIORNATO_IL}T12:00:00Z`))}. Qualcosa non torna? Si corregge su <a href={`https://www.openstreetmap.org/relation/${s.id}`} target="_blank" rel="noopener" className="underline underline-offset-2">OpenStreetMap</a>, e alla prossima lettura dei dati arriva anche qui.
            </span>
          </span>
        </aside>
      </section>
    </>
  );
}
