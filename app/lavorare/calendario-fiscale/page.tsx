import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import CalendarioFiscale from "@/modules/lavorare/components/CalendarioFiscale";
import { oggiSM, prossimeScadenze, vociSenzaData } from "@/modules/lavorare/calendario-fiscale";
import { AGGIORNATO_IL, CONTATTI } from "@/modules/lavorare/dati/calendario-fiscale";
import { metadatiCondivisione } from "@/lib/condivisione";

// Le date si calcolano dal file dei dati: la pagina si rifà ogni ora, così «le prossime» seguono il giorno
export const revalidate = 3600;

export const metadata = metadatiCondivisione({
  titolo: "Calendario fiscale di San Marino",
  descrizione: "Le scadenze fiscali e contributive sammarinesi dei prossimi 12 mesi: IGR, ritenute, contributi ISS, dichiarazioni, monofase. Con la fonte per ogni data. Informativo, non ufficiale.",
  percorso: "/lavorare/calendario-fiscale",
});

const aggiornato = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${AGGIORNATO_IL}T12:00:00Z`));
const tel = (t: string) => `tel:+378${t.replace(/\D/g, "")}`;

/** Calendario fiscale (Lavorare): le scadenze del file modules/lavorare/dati/calendario-fiscale.ts, con le fonti e i filtri */
export default function PaginaCalendarioFiscale() {
  const { tributario, iss } = CONTATTI;
  return (
    <>
      <TestaPagina href="/lavorare" verso="Lavorare" titolo="Calendario fiscale">
        <p className="sottotitolo">Le scadenze fiscali e contributive di San Marino dei prossimi 12 mesi, con la fonte per ogni data.</p>
      </TestaPagina>

      <aside role="note" className="larga flex gap-3 rounded-2xl border border-linea p-4 text-sm leading-relaxed">
        <span className="mt-0.5 shrink-0 text-testo-2"><Icona nome="info" size={20} /></span>
        <span className="flex flex-col gap-1">
          <span>
            <b className="font-semibold">Calendario informativo di 739, non ufficiale.</b> Le date possono cambiare per proroghe o decreti. Verifica sempre con
            l&apos;{tributario.nome} (<a href={`mailto:${tributario.email}`} className="underline underline-offset-2">{tributario.email}</a>, tel. <a href={tel(tributario.telefono)} className="whitespace-nowrap font-mono underline underline-offset-2">{tributario.telefono}</a>), con
            l&apos;{iss.nome} (<a href={`mailto:${iss.email}`} className="underline underline-offset-2">{iss.email}</a>, tel. <a href={tel(iss.telefono)} className="whitespace-nowrap font-mono underline underline-offset-2">{iss.telefono}</a>) o con il tuo commercialista.
          </span>
          <span className="text-[13px] text-testo-2">Ultimo aggiornamento dei dati: {aggiornato}.</span>
        </span>
      </aside>

      <section className="larga">
        <CalendarioFiscale scadenze={prossimeScadenze(12)} senzaData={vociSenzaData()} oggi={oggiSM()} />
      </section>

      <p className="text-[13px] leading-relaxed text-testo-2">
        Un calendario fiscale ufficiale non esiste: le date fisse vengono dalle leggi pubblicate dal Consiglio Grande e Generale, le altre dagli scadenziari di studi e associazioni di categoria. Ogni voce ha la sua fonte; «Da verificare» vuol dire che manca ancora una conferma ufficiale.
      </p>
      <Link href="/lavorare/scadenze" className="flex w-fit items-center gap-1 text-sm font-semibold text-accento">Novità, bandi e servizi online dello Stato <Icona nome="avanti" size={14} /></Link>
    </>
  );
}
