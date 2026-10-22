import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import { metadatiCondivisione } from "@/lib/condivisione";

export const metadata = metadatiCondivisione({
  titolo: "Come funziona NeonUp",
  descrizione: "La guida di NeonUp, il gestionale di 739: da dove partire, cosa c'è in ogni sezione (documenti, fatture ricevute, magazzino, contabilità), il giro di una vendita e di un acquisto, chi può fare cosa.",
  percorso: "/neonup/guida",
});

const PASSI = [
  { titolo: "Crea l'azienda", testo: "Con il tuo SMR ID, da NeonUp: chi la crea ne è il titolare. Scrivi i dati come vanno in fattura: ragione sociale, indirizzo, CAP, comune, IBAN." },
  { titolo: "Prepara la fattura elettronica", testo: "In «Azienda» scrivi il codice operatore economico e la data di inizio fissata su TribWEB. Poi, se vuoi mandare le fatture da NeonUp, collega l'HUB-SM con il TokenFE (prima in test)." },
  { titolo: "Aggiungi clienti e articoli", testo: "Clienti e fornitori con il codice operatore e il pagamento di solito; articoli con prezzo e tipo merce. Non sono obbligatori, ma riempiono le righe da sole." },
  { titolo: "Fai il primo documento", testo: "In «Documenti», «Nuovo documento»: preventivo, ordine, DDT o fattura. Lo salvi come bozza finché vuoi, poi lo emetti e prende il numero." },
  { titolo: "Apri il magazzino, se vendi merce", testo: "Negli Articoli segna «Gestito a magazzino» e fai il primo carico: da lì DDT e fatture scaricano da soli." },
  { titolo: "Aggiungi i conti", testo: "In «Contabilità» crea la cassa e il conto in banca con il saldo di partenza: incassi, pagamenti e scadenze si tengono lì." },
  { titolo: "Chiama chi lavora con te", testo: "In «Azienda», «Persone», aggiungi i collaboratori e il commercialista con la tessera del loro SMR ID e il ruolo giusto." },
];

const SEZIONI: { nome: string; icona: Parameters<typeof Icona>[0]["nome"]; cosa: string; dettagli: string[] }[] = [
  { nome: "Cruscotto", icona: "home", cosa: "La situazione in un colpo d'occhio.", dettagli: ["Fatturato dell'anno, da incassare, fatture elettroniche da inviare, bozze", "Cosa c'è da fare e gli ultimi documenti", "I primi passi finché l'azienda non è pronta"] },
  { nome: "Documenti", icona: "storie", cosa: "Tutto quello che emetti ai clienti.", dettagli: ["Preventivi, ordini, DDT, fatture, acconti, note di credito e di debito", "Un preventivo diventa ordine, DDT o fattura con un tocco", "Stampa o PDF; la fattura elettronica parte all'HUB-SM o si scarica il file XML", "Esito della fattura elettronica e incasso"] },
  { nome: "Fatture ricevute", icona: "coda", cosa: "Le fatture dei fornitori sammarinesi, dall'HUB-SM.", dettagli: ["Arrivano da sole ogni 3 ore, se l'azienda è collegata", "«Registra tra gli acquisti» e «Carica in magazzino»", "Richiesta di rettifica al fornitore"] },
  { nome: "Magazzino", icona: "servizi", cosa: "Cosa c'è, dove e quanto vale.", dettagli: ["Giacenze per deposito, varianti (taglie, colori) e lotti con la scadenza", "Carico, scarico, rettifica, trasferimento, inventario", "Avvisi per la scorta minima e i lotti in scadenza"] },
  { nome: "Contabilità", icona: "numeri", cosa: "I conti di tutti i giorni.", dettagli: ["Cassa e banca con il saldo, prima nota di entrate e uscite", "Acquisti e scadenzario di incassi e pagamenti", "Estratto conto riconciliato e i file per il commercialista"] },
  { nome: "Clienti e fornitori", icona: "persona", cosa: "L'anagrafica.", dettagli: ["Codice operatore, partita IVA, indirizzo, contatti", "Pagamento di solito e giorni, che vanno da soli nella fattura"] },
  { nome: "Articoli", icona: "calendario", cosa: "Il catalogo di prodotti e servizi.", dettagli: ["Codice, prezzo, unità di misura, tipo merce", "Gestione a magazzino, scorta minima, varianti, lotti"] },
  { nome: "Azienda", icona: "uffici", cosa: "I dati e le persone.", dettagli: ["Dati in fattura, codice operatore, data di inizio della fattura elettronica", "Collegamento con l'HUB-SM", "Persone che lavorano nell'azienda e il loro ruolo"] },
];

const RUOLI: { ruolo: string; puo: string }[] = [
  { ruolo: "Titolare", puo: "Tutto: anche collegare l'HUB-SM e decidere chi entra nell'azienda." },
  { ruolo: "Amministrazione", puo: "Tutto il lavoro: documenti, magazzino con l'inventario, contabilità, dati dell'azienda. Non aggiunge persone e non collega l'HUB-SM." },
  { ruolo: "Vendite", puo: "Documenti, clienti, articoli, carichi e scarichi di magazzino, incassi segnati a mano. Non vede la contabilità." },
  { ruolo: "Solo lettura", puo: "Vede tutto, contabilità compresa, e non cambia niente: è il ruolo giusto per il commercialista." },
];

function Giro({ titolo, passi }: { titolo: string; passi: { nome: string; testo: string }[] }) {
  return (
    <section className="flex flex-col gap-4" aria-label={titolo}>
      <h2 className="text-[22px] font-semibold tracking-tight">{titolo}</h2>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {passi.map((p, i) => (
          <li key={p.nome} className="flex flex-col gap-1.5 rounded-2xl bg-superficie p-4">
            <span className="voce-logo text-[22px] leading-none">{i + 1}</span>
            <h3 className="text-[15px] font-semibold">{p.nome}</h3>
            <p className="text-[14px] leading-relaxed text-testo-2">{p.testo}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** /neonup/guida: tutto NeonUp spiegato a chi arriva, sezione per sezione */
export default function GuidaNeonUp() {
  return (
    <>
      <TestaPagina href="/neonup" verso="NeonUp" titolo="Come funziona NeonUp">
        <p className="sottotitolo">Il gestionale di 739 per le aziende di San Marino, spiegato sezione per sezione: da dove partire e cosa trovi dentro.</p>
      </TestaPagina>
      <div className="larga flex flex-col gap-10">
        <section className="flex flex-col gap-4 rounded-2xl bg-[#09090B] p-6 text-white lg:p-8" aria-labelledby="t-inizia">
          <h2 id="t-inizia" className="text-[22px] font-semibold tracking-tight">Da dove partire</h2>
          <ol className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
            {PASSI.map((p, i) => (
              <li key={p.titolo} className="flex gap-3">
                <span className="voce-logo w-7 shrink-0 text-[22px] leading-tight">{i + 1}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-[16px] font-semibold">{p.titolo}</span>
                  <span className="text-[14px] leading-relaxed text-zinc-300">{p.testo}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[13px] leading-relaxed text-zinc-400">Dentro l&apos;azienda, nel Cruscotto, la lista dei primi passi si spunta da sola man mano che li fai.</p>
          <Link href="/neonup" className="taglio-piccolo flex h-11 w-fit items-center bg-white px-5 text-[14px] font-semibold text-[#09090B]">Apri NeonUp</Link>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="t-sezioni">
          <h2 id="t-sezioni" className="text-[22px] font-semibold tracking-tight">Le sezioni</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEZIONI.map((s) => (
              <li key={s.nome} className="flex flex-col gap-2 rounded-2xl bg-superficie p-5">
                <span className="flex items-center gap-2"><Icona nome={s.icona} size={22} /><h3 className="text-[16px] font-semibold">{s.nome}</h3></span>
                <p className="text-[14px] font-medium">{s.cosa}</p>
                <ul className="flex list-disc flex-col gap-1 pl-4 text-[13px] leading-relaxed text-testo-2">
                  {s.dettagli.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <Giro titolo="Il giro di una vendita" passi={[
          { nome: "Preventivo", testo: "Lo prepari e lo mandi in PDF. Se il cliente accetta, «Fanne un ordine» o «Fanne una fattura»." },
          { nome: "Ordine", testo: "Fissa cosa consegnare. Da qui «Fanne un DDT»." },
          { nome: "DDT", testo: "Accompagna la merce e la scarica dal magazzino. «Fattura questo DDT» la porta in fattura senza riscaricarla." },
          { nome: "Fattura", testo: "Prende il numero all'emissione. Se è elettronica parte all'HUB-SM e l'esito arriva da solo." },
          { nome: "Incasso", testo: "Lo registri sul conto: la fattura risulta incassata e sparisce dallo scadenzario." },
        ]} />

        <Giro titolo="Il giro di un acquisto" passi={[
          { nome: "Arriva la fattura", testo: "Dal fornitore sammarinese all'HUB-SM, e da lì in «Fatture ricevute»; le altre le scrivi a mano." },
          { nome: "Registrala", testo: "«Registra tra gli acquisti»: fornitore, numero, totale e scadenza si compilano dal file." },
          { nome: "Carica la merce", testo: "«Carica in magazzino»: le righe si abbinano agli articoli per codice o descrizione." },
          { nome: "Pagala", testo: "Dallo scadenzario, «Registra il pagamento» sul conto giusto." },
          { nome: "Controlla la banca", testo: "Carica l'estratto conto: ogni riga si abbina al suo movimento." },
        ]} />

        <section className="flex flex-col gap-4" aria-labelledby="t-ruoli">
          <h2 id="t-ruoli" className="text-[22px] font-semibold tracking-tight">Chi può fare cosa</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {RUOLI.map((r) => (
              <li key={r.ruolo} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6">
                <span className="w-40 shrink-0 text-[15px] font-semibold">{r.ruolo}</span>
                <span className="text-[14px] leading-relaxed text-testo-2">{r.puo}</span>
              </li>
            ))}
          </ul>
          <p className="text-[14px] leading-relaxed text-testo-2">Ognuno entra con il suo SMR ID; il titolare lo aggiunge con la tessera, non con l&apos;email.</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" aria-label="Da sapere">
          <div className="flex flex-col gap-2 rounded-2xl bg-superficie p-5">
            <h2 className="text-[19px] font-semibold tracking-tight">Cosa NeonUp non fa (ancora)</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed">
              <li>La contabilità obbligatoria: partita doppia, registri, imposte e bilancio restano al commercialista, che riceve da NeonUp i file o entra in sola lettura.</li>
              <li>Le fatture elettroniche verso l&apos;Italia: per ora verso l&apos;estero la fattura è su carta.</li>
              <li>La vendita al banco dal tablet e la conservazione a norma dei file.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-superficie p-5">
            <h2 className="text-[19px] font-semibold tracking-tight">Da sapere</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed">
              <li>Niente si cancella: una fattura si corregge con una nota di credito, un movimento sbagliato si annulla o si storna e resta nello storico.</li>
              <li>Per ora NeonUp è gratis, come prova: prima che diventi a pagamento lo scriveremo qui e nell&apos;app.</li>
              <li>Chi è obbligato alla fattura elettronica e da quando: <Link href="/lavorare/fattura-elettronica" className="font-semibold text-accento">la pagina della fattura elettronica</Link>. Le condizioni sono nei <Link href="/termini" className="font-semibold text-accento">Termini</Link>.</li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
