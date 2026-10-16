import Link from "next/link";
import PaginaArea from "@/components/aree/PaginaArea";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import { getEventiPerChi, getLuoghi } from "@/lib/data";
import { PER_LAVORO } from "@/modules/lavorare/fiere";
import { getOfferteLavoro } from "@/modules/lavorare/offerte";
import { getScadenze, oggiSM } from "@/modules/lavorare/scadenze";
import { prossimeScadenze } from "@/modules/lavorare/calendario-fiscale";

export const revalidate = 300;

export const metadata = { title: "Lavorare · 739 San Marino" };

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
const d = (s: string) => new Date(`${s}T12:00:00Z`);
const fra = (data: string) => {
  const n = Math.round((d(data).getTime() - d(oggiSM()).getTime()) / 86_400_000);
  return n === 0 ? "oggi" : n === 1 ? "domani" : `tra ${n} giorni`;
};
const minuscola = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/**
 * Lavorare: in cima il cruscotto (prossima scadenza fiscale, offerte di lavoro, bandi, attività nel catalogo),
 * poi le sezioni in tre gruppi (lib/aree.ts: Trova chi ti serve, Opportunità, Fisco e Stato), in fondo l'invito alle attività.
 */
export default async function Lavorare() {
  const [luoghi, fiere, offerte, scadenze] = await Promise.all([getLuoghi(), getEventiPerChi(PER_LAVORO, 60), getOfferteLavoro(), getScadenze({ da: oggiSM() })]);
  const conta = (c: string) => luoghi.filter((l) => l.categoria === c).length;
  const bandi = scadenze.filter((s) => s.tipo === "bando").length;
  const fornitori = conta("azienda") + conta("artigiano") + conta("professionista");
  const regola = scadenze.find((s) => s.tipo !== "bando");
  const fisco = prossimeScadenze(2)[0];
  const riga = (n: number, uno: string, tanti: string) => (n ? <><b className="font-mono font-medium text-testo">{n}</b> {n === 1 ? uno : tanti}</> : "Aggiungi la tua, è gratis");

  return (
    <PaginaArea
      slug="lavorare"
      testa={
        <section className="larga flex flex-col gap-3" aria-label="Adesso in Lavorare">
          <Cruscotto etichetta="Adesso in Lavorare">
            <Cella href="/lavorare/calendario-fiscale" titolo="Prossima scadenza" valore={fisco ? giorno.format(d(fisco.data)).replace(".", "") : "Nessuna"} unita={fisco ? fra(fisco.data) : undefined} nota={fisco?.voce.titolo} />
            <Cella href="/lavorare/lavoro" titolo="Offerte di lavoro" valore={offerte.length} unita={offerte.length === 1 ? "aperta" : "aperte"} nota={offerte[0] ? `${offerte[0].titolo}, ${offerte[0].attivita}` : "Le pubblicano le attività"} />
            <Cella href="/lavorare/bandi" titolo="Bandi" valore={bandi} unita={bandi === 1 ? "aperto" : "aperti"} nota={bandi ? undefined : "Li aggiunge la redazione"} />
            <Cella href="/lavorare/fornitori" titolo="Fornitori" valore={fornitori} unita="nel catalogo" nota="Aziende, artigiani e studi" />
          </Cruscotto>
        </section>
      }
      stato={{
        aziende: riga(conta("azienda"), "azienda", "aziende"),
        professionisti: riga(conta("professionista"), "studio", "studi"),
        artigiani: riga(conta("artigiano"), "artigiano", "artigiani"),
        fornitori: "Cerca per tipo e chiedi un preventivo",
        lavoro: offerte.length ? <><b className="font-mono font-medium text-testo">{offerte.length}</b> {offerte.length === 1 ? "offerta aperta" : "offerte aperte"}</> : "Pubblica la tua, se hai un'attività",
        bandi: bandi ? <><b className="font-mono font-medium text-testo">{bandi}</b> {bandi === 1 ? "aperto" : "aperti"}</> : undefined,
        fiere: fiere.length ? <><b className="font-mono font-medium text-testo">{fiere.length}</b> in calendario</> : "Proponi la tua",
        "calendario-fiscale": fisco ? <>Il {giorno.format(d(fisco.data))}: {minuscola(fisco.voce.titolo)}</> : undefined,
        scadenze: regola ? <>{regola.titolo}</> : undefined,
      }}
      coda={
        <Link href="/attivita" className="larga flex items-center gap-4 rounded-2xl border border-linea p-4 transition-colors hover:bg-superficie lg:p-5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-semibold">Hai un&apos;attività?</span>
            <span className="text-[13px] text-testo-2">La scheda è gratis e la aggiorni tu. Con 739 Pro menu, prenotazioni, offerte e i numeri della scheda.</span>
          </span>
          <span className="taglio-piccolo hidden shrink-0 items-center gap-1.5 bg-metallo px-4 py-2 text-sm font-semibold text-su-accento sm:inline-flex">739 per le attività <Icona nome="vai" size={16} /></span>
          <span className="shrink-0 text-testo-2 sm:hidden"><Icona nome="avanti" size={18} /></span>
        </Link>
      }
    />
  );
}
