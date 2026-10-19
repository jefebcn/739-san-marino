import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import { getClassifica } from "@/lib/data";
import { metadatiCondivisione } from "@/lib/condivisione";
import ElencoSentieri, { type RigaSentiero } from "@/modules/itinerari/components/ElencoSentieri";
import MappaSentieri from "@/modules/itinerari/components/MappaSentieri";
import { AGGIORNATO_IL, SENTIERI, dislivello, durata, fascia, km, percorso, tempo } from "@/modules/itinerari/sentieri";

// I sentieri sono nel file dei dati; dal database solo i nomi e i colori dei castelli
export const revalidate = 86400;

export const metadata = metadatiCondivisione({
  titolo: "Itinerari: i sentieri di San Marino",
  descrizione: `I ${SENTIERI.length} sentieri segnati del territorio, dalla Rupe del Monte Titano al Parco di Monte Cerreto: lunghezza, dislivello, profilo, mappa e traccia GPX. Dati di OpenStreetMap.`,
  percorso: "/uscire/itinerari",
});

const lungo = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Itinerari: i sentieri di San Marino da OpenStreetMap, sulla mappa e in elenco con i filtri */
export default async function PaginaItinerari() {
  const castelli = (await getClassifica()).sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, nome: c.nome, colore: c.colore }));
  const righe: RigaSentiero[] = SENTIERI.map((s) => ({
    slug: s.slug, numero: s.numero, nome: s.nome, percorso: percorso(s), km: km(s.lunghezza_m), dislivello: dislivello(s),
    tempo: durata(tempo(s).minuti), fascia: fascia(s), anello: s.anello, segnalato: s.segnalato, castelli: s.castelli,
  }));
  const totale = SENTIERI.reduce((t, s) => t + s.lunghezza_m, 0);
  const alto = SENTIERI.reduce((m, s) => ((s.quota_max ?? 0) > (m.quota_max ?? 0) ? s : m));
  const anelli = SENTIERI.filter((s) => s.anello).length;
  const principali = new Set(SENTIERI.map((s) => s.numero?.match(/^\d+/)?.[0]).filter(Boolean)).size;

  return (
    <>
      <TestaPagina href="/uscire" verso="Uscire" titolo="Itinerari">
        <p className="sottotitolo">I sentieri segnati del territorio: dove partono, quanto sono lunghi, quanto salgono. Tocca una linea sulla mappa o scegli dall&apos;elenco.</p>
      </TestaPagina>

      <section className="larga flex flex-col gap-6">
        <Cruscotto etichetta="I sentieri di San Marino in numeri">
          <Cella titolo="Sentieri" valore={SENTIERI.length} nota={`${principali} percorsi numerati con le loro varianti`} />
          <Cella titolo="In tutto" valore={Math.round(totale / 1000)} unita="km" nota="Sommando tutti i sentieri" />
          <Cella titolo="Ad anello" valore={anelli} nota="Si torna dove si è partiti" />
          <Cella href={`/uscire/itinerari/${alto.slug}`} titolo="Il più alto" valore={alto.quota_max ?? "-"} unita="m" nota={alto.nome} />
        </Cruscotto>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
          <div className="flex flex-col gap-3 lg:sticky lg:top-24">
            <MappaSentieri etichetta={`Mappa dei ${SENTIERI.length} sentieri di San Marino`} />
            <p className="text-[13px] text-testo-2">Il numero sulla linea è quello dei cartelli. Prima di partire guarda il <Link href="/utili/meteo" className="underline underline-offset-2">meteo</Link>, e porta scarpe adatte e acqua.</p>
          </div>
          <ElencoSentieri sentieri={righe} castelli={castelli} />
        </div>

        <aside role="note" className="flex gap-3 rounded-2xl border border-linea p-4 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome="info" size={20} /></span>
          <span className="flex flex-col gap-1.5">
            <span>
              I tracciati vengono da <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" className="underline underline-offset-2">OpenStreetMap</a> (© i suoi contributori, licenza ODbL),
              tramite <a href="https://hiking.waymarkedtrails.org" target="_blank" rel="noopener" className="underline underline-offset-2">Waymarked Trails</a>. Chi segna e cura ogni sentiero, quando OpenStreetMap lo dice, è scritto nella sua pagina.
              Lunghezze e quote sono calcolate da 739 (quote dal modello EU-DEM di Copernicus): sono indicative, e alcuni tracciati su OpenStreetMap sono incompleti.
            </span>
            <span className="text-[13px] text-testo-2">Dati letti il {lungo.format(new Date(`${AGGIORNATO_IL}T12:00:00Z`))}. Un errore su un sentiero si corregge su OpenStreetMap: il link è nella pagina di ogni sentiero.</span>
          </span>
        </aside>
      </section>
    </>
  );
}
