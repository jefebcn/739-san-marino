# NeonUp: analisi di Atlantis Evo

Analisi del 21/10/2026, chiesta da Alex: studiare https://www.atlantisevo.com per riprendere in 739 la stessa struttura per le aziende, con il nome **NeonUp**.

**Come è stata fatta.** Alex ha chiesto di usare la skill `rea` (copiata in `.claude/skills/rea`). REA è pensata soprattutto per programmi installati, app e binari; i suoi strumenti per i siti hanno bisogno del server MCP `rea-agents`, che qui non è registrato. Il sito è un WordPress pubblico, quindi ho letto le sue 46 pagine dalla mappa del sito. Il robots.txt vieta solo `/wp-admin/`. Non ho usato la demo, perché ha credenziali e una sessione di prova. Qui sotto c'è la struttura del prodotto, descritta con parole mie: niente testi, immagini o marchi copiati.

## Cos'è Atlantis Evo

- È un **gestionale (ERP) per piccole e medie imprese** di San Marino e dell'Italia. Lo fa **Evo Solution Srl**, che ha sede a San Marino ed esiste dal 2015; il prodotto è nato circa 20 anni fa.
- La tecnologia, secondo le FAQ: un programma desktop in Java (Windows, macOS, Linux) con un database PostgreSQL.
  - Il «cloud» è lo stesso programma ospitato da loro e usato dal browser.
  - L'app mobile è una pagina web installabile, senza store, che legge i dati dal gestionale tramite le sue Web API. Se il gestionale è installato in azienda, quel computer deve restare acceso.
  - Il collegamento con ChatGPT o Claude è un **server MCP in sola lettura** dentro il gestionale.
- Si paga con un **canone annuale per postazione**, più le ore di assistenza.

## La struttura: moduli e pacchetti

| Modulo | Cosa fa | Prezzo pubblico (all'anno) |
|---|---|---|
| Contabilità | partita doppia, prima nota, IVA e monofase, scadenzario, solleciti, RiBa e bonifici, bilancio; a parte cespiti, riconciliazione bancaria, bilancio XBRL sammarinese | 130 € da solo |
| Magazzino e vendite | listini e sconti composti, DDT, fatture immediate, differite e proforma, multi magazzino, varianti (taglie e colori), kit, codici a barre, statistiche | 130 € da solo |
| Ordini e preventivi | ordini dei clienti e ai fornitori, consegne parziali, ordini ricorrenti | nei pacchetti |
| Document management | archivio di documenti e immagini per ogni scheda | nei pacchetti |
| Fattura elettronica SM | interna tra aziende sammarinesi e verso l'Italia, tramite l'HUB-SM dell'Ufficio Tributario: invio, esiti, scarti, ricezione, rimborsi monofase | 40 € |
| Fatture SM | versione ridotta per micro imprese e professionisti, fattura elettronica compresa | 120 € |
| Vendita al banco (POS) | cassa, anche su tablet, con registratore e lettore di codici | modulo aggiuntivo |
| Agenti e provvigioni, distinta base, lotti, statistiche pivot | moduli verticali | da 25 a 170 € |
| E-commerce | sincronizza WooCommerce, Shopify e PrestaShop: ordini, clienti, giacenze | pacchetto da 350 € |
| App mobile | consulta clienti, documenti, listini e giacenze; condivide via WhatsApp e QR. La versione Pro raccoglie ordini, anche dagli agenti | 50 € base, 100 € Pro (5 utenti) |
| Cloud | il gestionale dal browser | da 150 € |
| Assistente AI | domande in italiano sui dati, solo lettura, tramite MCP | nella app base |

I pacchetti sono:

- **Base**, 210 €: contabilità, magazzino e vendite.
- **Professionale**, 320 €: in più ordini e documenti.
- **E-commerce**, 350 €.

Ogni postazione in più costa da 25 a 45 €. L'assistenza costa 60 € l'ora, e scende a 42 € comprando un pacchetto di ore. Secondo il loro sito, un cliente nuovo spende di solito tra 350 e 620 € all'anno.

**Come vendono.** Una demo in cloud di 2 ore senza registrazione, una demo guidata di 40 minuti, preventivi su misura, recensioni Trustpilot (4,7), video tutorial, un manuale online e la teleassistenza.

## Cosa ha già 739 per le attività

| Atlantis Evo | 739 oggi |
|---|---|
| Vetrina dell'azienda | scheda unica, profilo base gratis, 739 Pro (menu, offerte, numeri della scheda) |
| Ordini e preventivi | «Preventivo» tra i fornitori (solo `mailto`, niente salvato) |
| Prenotazioni e agenda | Prenotazioni con 739 (agenda, conferme, avvisi personali) |
| Fidelizzazione | Premi dei metri (lettura del QR dell'SMR ID) |
| Personale | Offerte di lavoro |
| Scadenze e fisco | calendario fiscale, scadenze e bandi, pagina della fattura elettronica (con `GESTIONALI` ancora vuoto) |
| Statistiche | i numeri della scheda (visite e tocchi) |
| Contabilità, magazzino, DDT, fattura elettronica, POS, e-commerce | **niente**: per scelta di Alex del 18/10/2026, la fattura elettronica passa da un accordo con un gestionale e non da un software fatto da 739 |

## Tre strade per NeonUp

**A. NeonUp come vetrina dei software per le aziende** (piccola, va bene col piano)
- È una sezione di Lavorare con:
  - i gestionali e i servizi digitali per chi lavora a San Marino;
  - un confronto per bisogno (contabilità, fattura elettronica SM, magazzino, cassa, e-commerce);
  - «Ti riguarda?»;
  - la richiesta di una demo al fornitore;
  - il badge «Convenzionato con 739» quando c'è un accordo.
- Riempie `GESTIONALI`. Atlantis Evo, essendo sammarinese e pronto per la fattura elettronica interna, è il primo candidato da contattare.
- 739 guadagna dalle convenzioni.
- Rischio legale: nessuno.

**B. NeonUp come strumenti leggeri per la piccola attività dentro 739** (media, da decidere)
- Cosa contiene:
  - rubrica dei clienti;
  - catalogo e listino;
  - preventivi e ordini numerati in PDF, da mandare via WhatsApp o email;
  - un magazzino semplice;
  - cruscotto e statistiche;
  - la cassa senza registratore;
  - «Chiedi ai tuoi dati» in sola lettura.
- Tutto parte dalla scheda che il titolare ha già.
- Niente contabilità né fatture fiscali: per quelle si collega il gestionale convenzionato della strada A.
- Servono diverse migrazioni nuove, una parte nel Pro e un aggiornamento di Termini e Privacy (sono dati commerciali di terzi).

**C. NeonUp come gestionale completo, come Atlantis Evo** (sconsigliata)
- Richiede:
  - contabilità in partita doppia;
  - fattura elettronica collegata all'HUB-SM, con token TribWEB per ogni azienda;
  - regole tecniche FE-RSM, conservazione a norma, monofase, bilancio XBRL.
- Sono mesi di lavoro, con una responsabilità fiscale verso i clienti e un'assistenza continua.
- Andrebbe contro la scelta del 18/10/2026 e fuori da `docs/piano.md`.
- Farebbe concorrenza a un'azienda sammarinese che potrebbe invece essere partner.

**Consiglio:** partire con la **A**, con Atlantis Evo come primo gestionale da contattare, e poi aggiungere della **B** solo quello che serve davvero alle attività già su 739. I primi candidati sono preventivi e ordini dalla scheda, e il catalogo con i prezzi.

## Fonti

Pagine pubbliche di atlantisevo.com lette il 21/10/2026:

- home, prezzi, prodotti e i singoli moduli;
- software-gestionale-san-marino, fattura-elettronica-san-marino, prodotti/fatture-sm;
- funzionalità avanzate (app mobile, assistente AI);
- demo, acquistare, assistenza, chi siamo.
