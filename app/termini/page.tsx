import PaginaLegale from "@/components/PaginaLegale";
import { emailContatto, titolare } from "@/lib/legale";

export const metadata = { title: "Termini d'uso · 739 San Marino", description: "Le regole per usare 739 San Marino." };

// Passo 1.8, approvati da Alex il 14/10/2026; rivisti e confermati da Claude su incarico di Alex il 15/10/2026.
const TESTO = `
## Cos'è 739

739 San Marino è un'app gratuita per chi la usa, con eventi, servizi, luoghi, sport e la sfida tra i nove castelli. Non è un servizio della Repubblica di San Marino né di un ente pubblico: è gestita da ${titolare()}. Usandola accetti queste regole.

## Le informazioni

Raccogliamo i dati da fonti ufficiali, OpenStreetMap, Open-Meteo, Libertas, dalla redazione e dagli utenti, e indichiamo sempre la fonte. Facciamo il possibile perché siano giusti, ma orari, chiusure e programmi possono cambiare: per le cose importanti controlla alla fonte. Le schede con «Da verificare» non sono ancora state controllate. Se trovi un errore, segnalalo dalla scheda.

**In caso di emergenza chiama sempre il 112.** 739 non sostituisce i servizi di emergenza né le comunicazioni ufficiali degli enti.

## SMR ID e metri

- L'SMR ID è la tessera digitale di 739: **non è un documento d'identità** e non ha valore fuori dall'app.
- Un account per persona, con dati veri. Tieni riservata la password: quello che succede dal tuo account è sotto la tua responsabilità.
- I metri non sono denaro, non si comprano, non si vendono e non si convertono in premi, salvo iniziative che annunceremo con le loro regole. Non hanno niente a che fare con la SMaC.
- Possiamo togliere metri o sospendere un account se vengono raccolti in modo scorretto, per esempio check-in fatti senza essere all'evento.

## Partite e tornei

Partite e tornei li organizzano gli utenti: 739 aiuta a trovarsi e a tenere i risultati, ma non organizza le partite e non risponde di quello che succede in campo. Gioca nel rispetto degli altri e registra risultati veri. Ai tornei di castello partecipa solo chi ha scelto quel castello nel profilo.

## Quello che pubblichi

Quando proponi un evento, carichi una foto o mandi una segnalazione:

- dichiari di averne il diritto, per le foto anche di indicare il credito giusto;
- ci permetti di pubblicarlo gratis su 739 e di modificarlo o accorciarlo per adattarlo all'app;
- non deve contenere niente di illegale, offensivo, ingannevole o pubblicità che non c'entra.

La redazione può non pubblicare, modificare o togliere quello che non rispetta queste regole. Gli organizzatori che pubblicano direttamente rispondono dei propri eventi.

## Schede delle attività

Il titolare di un locale, di un negozio o di un distributore può chiedere di gestire la sua scheda. La redazione verifica prima di affidarla. Chi la gestisce risponde di quello che scrive, deve tenerla aggiornata e non può usarla per pubblicità che non riguarda l'attività. La redazione può correggere la scheda o toglierne la gestione se queste regole non sono rispettate. Il profilo base è gratis.

## Le cose da non fare

Usare 739 per spam, raccogliere dati di altri utenti, aggirare i limiti, leggere l'app in automatico in modo massiccio o provare a entrare dove non si ha accesso.

## Marchi e contenuti

Logo, nome 739, Tano e testi della redazione sono di 739 San Marino. I loghi dei castelli usati nell'app non sono gli stemmi ufficiali. I dati di OpenStreetMap sono © dei suoi contributori, con licenza ODbL.

## Responsabilità

739 è offerta così com'è. Nei limiti della legge non rispondiamo di danni dovuti a informazioni non aggiornate, a interruzioni del servizio o a quello che pubblicano gli utenti.

## Modifiche e legge

Possiamo cambiare queste regole: la data in cima dice quando. Per i cambiamenti importanti ti avvisiamo nell'app. Vale la legge della Repubblica di San Marino e per le controversie è competente il foro di San Marino.

## Contatti

Per domande scrivi a ${emailContatto()}. Per i tuoi dati personali leggi la [Privacy](/privacy).
`;

export default function Termini() {
  return <PaginaLegale titolo="Termini d'uso" aggiornata="15 ottobre 2026" testo={TESTO} />;
}
