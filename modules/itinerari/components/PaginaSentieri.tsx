import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import { getClassifica } from "@/lib/data";
import type { Lingua } from "@/lib/lingua";
import ElencoSentieri, { type RigaSentiero } from "./ElencoSentieri";
import MappaSentieri from "./MappaSentieri";
import { AGGIORNATO_IL, BASE, SENTIERI, dislivello, durata, fascia, km, percorso, tempo } from "../sentieri";

const T = {
  it: {
    torna: { href: "/uscire", nome: "Uscire" }, titolo: "Itinerari",
    sotto: "I sentieri segnati del territorio: dove partono, quanto sono lunghi, quanto salgono. Tocca una linea sulla mappa o scegli dall'elenco.",
    numeri: "I sentieri di San Marino in numeri",
    sentieri: "Sentieri", principali: (n: number) => `${n} percorsi numerati con le loro varianti`,
    tutto: "In tutto", sommati: "Sommando tutti i sentieri", anelli: "Ad anello", anelliNota: "Si torna dove si è partiti", alto: "Il più alto",
    mappa: (n: number) => `Mappa dei ${n} sentieri di San Marino`,
    consiglio: <>Il numero sulla linea è quello dei cartelli. Prima di partire guarda il <Link href="/utili/meteo" className="underline underline-offset-2">meteo</Link>, e porta scarpe adatte e acqua.</>,
    fonti: (
      <>
        I tracciati vengono da <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" className="underline underline-offset-2">OpenStreetMap</a> (© i suoi contributori, licenza ODbL),
        tramite <a href="https://hiking.waymarkedtrails.org" target="_blank" rel="noopener" className="underline underline-offset-2">Waymarked Trails</a>. Chi segna e cura ogni sentiero, quando OpenStreetMap lo dice, è scritto nella sua pagina.
        Lunghezze e quote sono calcolate da 739 (quote dal modello EU-DEM di Copernicus): sono indicative, e alcuni tracciati su OpenStreetMap sono incompleti.
      </>
    ),
    letti: (d: string) => `Dati letti il ${d}. Un errore su un sentiero si corregge su OpenStreetMap: il link è nella pagina di ogni sentiero.`,
  },
  en: {
    torna: { href: "/en", nome: "Today" }, titolo: "Walking trails",
    sotto: "The waymarked trails of San Marino: where they start, how long they are, how much they climb. Tap a line on the map or pick one from the list. Trail names are in Italian, as on the signs.",
    numeri: "San Marino's trails in numbers",
    sentieri: "Trails", principali: (n: number) => `${n} numbered routes with their variants`,
    tutto: "In all", sommati: "Adding up every trail", anelli: "Loops", anelliNota: "You end where you started", alto: "Highest",
    mappa: (n: number) => `Map of the ${n} trails of San Marino`,
    consiglio: <>The number on the line is the one on the signposts. Check the weather before you set off, and bring proper shoes and water.</>,
    fonti: (
      <>
        Routes from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" className="underline underline-offset-2">OpenStreetMap</a> (© its contributors, ODbL licence),
        via <a href="https://hiking.waymarkedtrails.org" target="_blank" rel="noopener" className="underline underline-offset-2">Waymarked Trails</a>. Who waymarks and looks after each trail, when OpenStreetMap says so, is on its page.
        Lengths and altitudes are worked out by 739 (altitudes from the Copernicus EU-DEM model): treat them as a guide, and some routes on OpenStreetMap are incomplete.
      </>
    ),
    letti: (d: string) => `Data read on ${d}. Mistakes on a trail are fixed on OpenStreetMap: the link is on each trail's page.`,
  },
};

/** Itinerari, in italiano o in inglese: i sentieri di San Marino da OpenStreetMap, sulla mappa e in elenco con i filtri */
export default async function PaginaSentieri({ lingua = "it" }: { lingua?: Lingua }) {
  const t = T[lingua];
  const base = BASE[lingua];
  const castelli = (await getClassifica()).sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome, colore: c.colore }));
  const righe: RigaSentiero[] = SENTIERI.map((s) => ({
    slug: s.slug, numero: s.numero, nome: s.nome, percorso: percorso(s, lingua), km: km(s.lunghezza_m, lingua), dislivello: dislivello(s),
    tempo: durata(tempo(s).minuti), fascia: fascia(s), anello: s.anello, segnalato: s.segnalato, castelli: s.castelli,
  }));
  const totale = SENTIERI.reduce((n, s) => n + s.lunghezza_m, 0);
  const alto = SENTIERI.reduce((m, s) => ((s.quota_max ?? 0) > (m.quota_max ?? 0) ? s : m));
  const anelli = SENTIERI.filter((s) => s.anello).length;
  const principali = new Set(SENTIERI.map((s) => s.numero?.match(/^\d+/)?.[0]).filter(Boolean)).size;
  const giorno = new Intl.DateTimeFormat(lingua === "en" ? "en-GB" : "it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <TestaPagina href={t.torna.href} verso={t.torna.nome} titolo={t.titolo}>
        <p className="sottotitolo">{t.sotto}</p>
      </TestaPagina>

      <section className="larga flex flex-col gap-6">
        <Cruscotto etichetta={t.numeri}>
          <Cella titolo={t.sentieri} valore={SENTIERI.length} nota={t.principali(principali)} />
          <Cella titolo={t.tutto} valore={Math.round(totale / 1000)} unita="km" nota={t.sommati} />
          <Cella titolo={t.anelli} valore={anelli} nota={t.anelliNota} />
          <Cella href={`${base}/${alto.slug}`} titolo={t.alto} valore={alto.quota_max ?? "-"} unita="m" nota={alto.nome} />
        </Cruscotto>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
          <div className="flex flex-col gap-3 lg:sticky lg:top-24">
            <MappaSentieri etichetta={t.mappa(SENTIERI.length)} base={base} />
            <p className="text-[13px] text-testo-2">{t.consiglio}</p>
          </div>
          <ElencoSentieri sentieri={righe} castelli={castelli} lingua={lingua} base={base} />
        </div>

        <aside role="note" className="flex gap-3 rounded-2xl border border-linea p-4 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome="info" size={20} /></span>
          <span className="flex flex-col gap-1.5">
            <span>{t.fonti}</span>
            <span className="text-[13px] text-testo-2">{t.letti(giorno.format(new Date(`${AGGIORNATO_IL}T12:00:00Z`)))}</span>
          </span>
        </aside>
      </section>
    </>
  );
}
