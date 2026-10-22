import Link from "next/link";
import { MarchioNeonUp, TesseraNeonUp } from "@/components/MarchioNeonUp";
import { Icona } from "@/components/Icona";
import { metadatiCondivisione } from "@/lib/condivisione";
import Ingresso from "@/modules/neonup/components/Ingresso";

export const metadata = metadatiCondivisione({
  titolo: "NeonUp, il gestionale per le aziende di San Marino",
  descrizione: "Clienti, articoli, magazzino, conti, preventivi, ordini, DDT, fatture e note di credito, con la fattura elettronica interna di San Marino (FE-RSM) mandata all'HUB-SM e le fatture dei fornitori ricevute. Dentro 739, con l'SMR ID.",
  percorso: "/neonup",
});

const OGGI = [
  { titolo: "Documenti di vendita", testo: "Preventivi, ordini, DDT, fatture, acconti, note di credito e di debito, numerati per anno. Un preventivo diventa ordine, DDT o fattura con un tocco." },
  { titolo: "Fattura elettronica interna", testo: "Il file XML secondo le regole dell'Ufficio Tributario: tipo merce su ogni riga, DDT, natura N4, nome del file giusto, un nome nuovo dopo uno scarto. Controllato sullo schema ufficiale." },
  { titolo: "Clienti, fornitori e articoli", testo: "Con il codice operatore economico, il pagamento di solito, il prezzo e il tipo merce: le righe si riempiono da sole." },
  { titolo: "Collegata all'HUB-SM", testo: "Con il TokenFE dell'azienda la fattura parte da NeonUp, l'esito e le ricevute arrivano da soli, e le fatture dei fornitori sammarinesi si scaricano ogni 3 ore. Si prova prima nell'ambiente di test." },
  { titolo: "Magazzino", testo: "Giacenze per deposito, varianti (taglie, colori) e lotti con la scadenza. DDT e fatture scaricano da soli, le note di credito ricaricano i resi; carichi anche dalle fatture dei fornitori, trasferimenti e inventario." },
  { titolo: "Conti e scadenze", testo: "Cassa e banca con il saldo, prima nota, fatture dei fornitori, scadenzario di incassi e pagamenti, estratto conto riconciliato e i file per il commercialista. Non sostituisce la contabilità obbligatoria." },
  { titolo: "Incassi e scadenze", testo: "Cosa è da incassare, cosa è scaduto, le fatture elettroniche ancora da inviare con il termine indicativo." },
  { titolo: "Chi ci lavora", testo: "Titolare, amministrazione, vendite, solo lettura: ognuno entra con il suo SMR ID." },
  { titolo: "Stampa e PDF", testo: "Ogni documento si stampa o si salva in PDF, anche le fatture su carta per chi non ha ancora la fattura elettronica." },
];

const DOPO = [
  "Vendita al banco dal tablet",
  "Statistiche del venduto",
  "Fatture verso l'Italia (interscambio)",
];

/** NeonUp: cos'è, cosa fa oggi, cosa arriva, e l'ingresso alle proprie aziende */
export default function PaginaNeonUp() {
  return (
    <>
      <section className="intro">
        <Link href="/lavorare" className="indietro scuro" style={{ marginBottom: 6 }}><Icona nome="freccia" size={18} /> Lavorare</Link>
        <div className="larga flex flex-col gap-5 rounded-2xl bg-[#09090B] p-6 text-white lg:flex-row lg:items-center lg:gap-10 lg:p-10">
          <TesseraNeonUp lato={96} className="hidden ring-1 ring-white/15 lg:inline-flex" />
          <div className="flex flex-col gap-3">
            <h1 className="!m-0"><MarchioNeonUp altezza={48} chiaro /></h1>
            <p className="max-w-[60ch] text-[16px] leading-relaxed text-zinc-300">Il gestionale di 739 per le aziende di San Marino: documenti, fattura elettronica all&apos;HUB-SM, magazzino, conti e scadenze in un posto solo, dal telefono o dal computer.</p>
            <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
              <a href="#inizia" className="taglio-piccolo inline-flex h-10 items-center bg-white px-4 font-semibold text-[#09090B]">Inizia</a>
              <Link href="/neonup/guida" className="font-semibold text-white underline underline-offset-4">Come funziona</Link>
              <span className="text-zinc-400">Per ora gratis, come prova</span>
            </p>
          </div>
        </div>
      </section>
      <div className="larga flex flex-col gap-10">
        <div id="inizia" className="scroll-mt-24"><Ingresso /></div>

        <section className="flex flex-col gap-4" aria-labelledby="t-oggi">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="t-oggi" className="text-[22px] font-semibold tracking-tight">Cosa fa oggi</h2>
            <Link href="/neonup/guida" className="text-[15px] font-semibold text-accento">Come funziona, sezione per sezione</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OGGI.map((x) => (
              <li key={x.titolo} className="flex flex-col gap-1.5 rounded-2xl bg-superficie p-5">
                <h3 className="text-[16px] font-semibold">{x.titolo}</h3>
                <p className="text-[14px] leading-relaxed text-testo-2">{x.testo}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl bg-[#09090B] p-6 text-white">
            <h2 className="text-[19px] font-semibold tracking-tight">Come si manda la fattura elettronica</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-relaxed text-zinc-300">
              <li>Nei dati dell&apos;azienda scrivi il codice operatore economico e la data di inizio fissata su TribWEB.</li>
              <li>Emetti la fattura a un cliente sammarinese con il suo codice operatore.</li>
              <li>Se l&apos;azienda è collegata all&apos;HUB-SM con il TokenFE, tocca «Manda all&apos;HUB-SM»: l&apos;esito e la ricevuta arrivano da soli.</li>
              <li>Se non è collegata, scarica il file XML, caricalo su TribWEB («Upload File FE-RSM») e segna l&apos;esito a mano. Dopo uno scarto NeonUp prepara un file con un nome nuovo.</li>
            </ol>
            <p className="text-[13px] leading-relaxed text-zinc-400">Regole prese dal Documento A e dal Documento B dell&apos;Ufficio Tributario (8 settembre 2026) e dal Decreto Delegato 133/2026. <Link href="/lavorare/fattura-elettronica" className="font-semibold text-white underline underline-offset-2">Chi è obbligato e da quando</Link>.</p>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-superficie p-6">
            <h2 className="text-[19px] font-semibold tracking-tight">In arrivo</h2>
            <ul className="flex flex-col gap-2">
              {DOPO.map((x) => <li key={x} className="flex gap-2 text-[15px]"><Icona nome="avanti" size={18} />{x}</li>)}
            </ul>
          </div>
        </section>

        <p className="text-[13px] leading-relaxed text-testo-2">
          NeonUp è uno strumento: i dati delle fatture e la loro correttezza fiscale restano dell&apos;azienda che le emette. Il file XML vale come fattura solo dopo la consegna da parte dell&apos;HUB-SM; per i dubbi senti il tuo commercialista o l&apos;Ufficio Tributario. Per ora è gratis, come prova. Condizioni in <Link href="/termini" className="font-semibold text-accento">Termini</Link> e <Link href="/privacy" className="font-semibold text-accento">Privacy</Link>.
        </p>
      </div>
    </>
  );
}
