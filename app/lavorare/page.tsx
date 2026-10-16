import Link from "next/link";
import PaginaArea from "@/components/aree/PaginaArea";
import { Icona } from "@/components/Icona";
import { getEventiPerChi, getLuoghi } from "@/lib/data";
import { PER_LAVORO } from "@/lib/eventi-lavoro";
import { getOfferteLavoro } from "@/lib/lavoro";
import { getScadenze, oggiSM } from "@/lib/scadenze";

export const revalidate = 300;

export const metadata = { title: "Lavorare · 739 San Marino" };

export default async function Lavorare() {
  const [luoghi, fiere, offerte, scadenze] = await Promise.all([getLuoghi(), getEventiPerChi(PER_LAVORO, 60), getOfferteLavoro(), getScadenze({ da: oggiSM() })]);
  const conta = (c: string) => luoghi.filter((l) => l.categoria === c).length;
  const bandi = scadenze.filter((s) => s.tipo === "bando").length;
  const fornitori = conta("azienda") + conta("artigiano") + conta("professionista");
  const prossima = scadenze.find((s) => s.tipo !== "bando");
  const riga = (n: number, uno: string, tanti: string) => (n ? <><b className="font-mono font-medium text-testo">{n}</b> {n === 1 ? uno : tanti}</> : "Aggiungi la tua, è gratis");
  return (
    <PaginaArea
      slug="lavorare"
      testa={
        <Link href="/attivita" className="larga flex items-center gap-4 rounded-2xl bg-[#09090B] p-4 text-white transition-colors hover:bg-zinc-900 lg:p-5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-semibold text-white">Hai un&apos;attività? 739 per le attività</span>
            <span className="text-[13px] text-zinc-400">La scheda gratis, aggiornata da te. Con il Pro menu, prenotazioni, offerte e i numeri.</span>
          </span>
          <Icona nome="avanti" size={18} />
        </Link>
      }
      stato={{
        aziende: riga(conta("azienda"), "azienda", "aziende"),
        professionisti: riga(conta("professionista"), "studio", "studi"),
        artigiani: riga(conta("artigiano"), "artigiano", "artigiani"),
        lavoro: offerte.length ? <><b className="font-mono font-medium text-testo">{offerte.length}</b> {offerte.length === 1 ? "offerta aperta" : "offerte aperte"}</> : "Pubblica la tua, se hai un'attività",
        fornitori: fornitori ? <><b className="font-mono font-medium text-testo">{fornitori}</b> tra aziende, artigiani e studi</> : undefined,
        scadenze: prossima ? <>Prossima: {prossima.titolo}</> : undefined,
        bandi: bandi ? <><b className="font-mono font-medium text-testo">{bandi}</b> {bandi === 1 ? "aperto" : "aperti"}</> : undefined,
        fiere: fiere.length ? <><b className="font-mono font-medium text-testo">{fiere.length}</b> in calendario</> : "Proponi la tua",
      }}
    />
  );
}
