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

Il titolare di un locale, di un negozio, di un distributore, di un'azienda, di uno studio professionale, di una bottega artigiana, di una struttura ricettiva o di un servizio per animali, e chi rappresenta un'associazione, può chiedere di gestire la sua scheda o, se non c'è, proporne una nuova. La redazione verifica prima di affidarla o di pubblicarla e può rifiutare le schede di attività che non esistono, non sono a San Marino o non sono di chi le propone. Chi la gestisce risponde di quello che scrive, deve tenerla aggiornata e non può usarla per pubblicità che non riguarda l'attività. La redazione può correggere la scheda o toglierne la gestione se queste regole non sono rispettate. Il profilo base è gratis.

**739 Pro.** Chi gestisce la scheda può chiedere il piano Pro, a pagamento (oggi 3,99 € al mese o 39 € all'anno): i pulsanti «Menu» e «Prenota» con i propri link, fino a tre offerte con la scadenza e i numeri della scheda (solo totali). Si attiva con un accordo scritto con ${titolare()}, che indica prezzo, durata e fattura; nell'app non si paga niente. Il Pro non cambia l'ordine delle liste né i risultati della ricerca: le offerte devono essere vere, valide nelle date indicate e riguardare l'attività. Alla scadenza la scheda torna al profilo base e restano descrizione, contatti, orari e foto.

**Offerte di lavoro.** Chi gestisce la scheda di un'attività può pubblicare offerte di lavoro per quell'attività, al massimo cinque aperte alla volta e ognuna per non più di 60 giorni. Devono essere posti veri, presso l'attività, con il tipo di contratto e l'orario giusti, nel rispetto delle leggi sul lavoro; non possono chiedere soldi a chi si candida né escludere qualcuno per età, sesso, origine, religione, disabilità, orientamento o stato civile. Le candidature vanno direttamente all'attività: 739 non le riceve e non partecipa alla selezione. La redazione può ritirare le offerte che non rispettano queste regole.

**Bacheca.** Chi ha l'SMR ID può scrivere annunci in bacheca: cerco, offro, regalo, perso, trovato, iniziative. Ogni annuncio lo legge la redazione prima che esca e resta online per il tempo scelto (al massimo 60 giorni); si può chiudere quando si vuole. Non sono ammessi: pubblicità o vendite di attività (per quelle c'è la scheda), offerte di lavoro (ci sono le Offerte di lavoro), propaganda politica, vendita di cose o animali che la legge non permette, nomi, foto o dati di altre persone, offese. Chi scrive risponde di quello che scrive; gli accordi tra chi si contatta dalla bacheca riguardano solo loro: 739 non è parte e non risponde di quello che succede dopo. La redazione può non pubblicare o ritirare un annuncio, scrivendo il perché.

**Premi dei metri.** Chi gestisce la scheda di un'attività può offrire premi a chi ha raggiunto un livello di metri (Valle, Mura, Torri, Vetta), con le sue regole: ogni quanto, quanti in tutto, fino a quando. Il premio lo offre e lo consegna l'attività, che ne risponde: 739 controlla solo i metri e quante volte è stato ritirato, e non risponde di premi esauriti, cambiati o non consegnati. I metri non si comprano, non si scambiano e non valgono denaro. Chi registra premi falsi o usa la tessera di un altro perde l'accesso a 739.

**Volontari.** Chi gestisce la scheda di un'associazione può chiedere volontari per un turno. Il turno lo organizza l'associazione, che ne risponde, anche per la sicurezza e le eventuali assicurazioni: 739 porta la chiamata e le iscrizioni. Dopo il turno l'associazione segna chi c'era e arrivano i metri (40 a turno, al massimo 120 al mese dal volontariato). Segnare presenze false fa perdere l'accesso a 739.

**NeonUp, il gestionale.** Un'azienda può usare NeonUp per tenere clienti, fornitori e articoli e per preparare preventivi, ordini, DDT, fatture e note di credito, compreso il file XML della fattura elettronica interna di San Marino. NeonUp è uno strumento: i dati inseriti, la numerazione, il contenuto fiscale dei documenti, l'invio all'HUB-SM nei termini e la loro conservazione restano dell'azienda e di chi la segue (commercialista), che ne rispondono. 739 prepara il file secondo le regole tecniche pubblicate dall'Ufficio Tributario e lo controlla sullo schema ufficiale, ma non garantisce che l'HUB-SM lo accetti e non risponde di scarti, ritardi o sanzioni. Se il titolare collega l'azienda all'HUB-SM con il TokenFE, NeonUp manda le fatture e scarica esiti, ricevute e fatture dei fornitori per conto dell'azienda: il titolare garantisce di poter usare quel token, lo tiene valido e lo toglie con «Scollega» quando non vuole più che NeonUp lo usi. Una fattura vale solo quando l'HUB-SM la consegna: l'azienda controlla l'esito, che NeonUp mostra come lo riceve. Una fattura emessa non si modifica né si cancella: si corregge con una nota di credito. Il titolare decide chi lavora nell'azienda e con quale ruolo. Per ora NeonUp è gratis, come prova: prima che diventi a pagamento lo scriveremo qui e nell'app, con il prezzo.

**Prenotazioni con 739.** Chi gestisce la scheda di un centro (un impianto sportivo, una sala, un servizio) può aprire le prenotazioni da 739: sceglie cosa si prenota, gli orari, se conferma lui o in automatico e fino a quando si può annullare. Il servizio è un accordo tra te e il centro: 739 porta la richiesta e mostra gli orari liberi, ma non è parte del contratto, non incassa niente (si paga sul posto) e non risponde di prezzi, qualità o annullamenti decisi dal centro. Per prenotare serve l'SMR ID. Se non puoi andare annulla da 739 nei tempi indicati, o chiama il centro: chi non si presenta a due prenotazioni confermate in 90 giorni non può prenotare da 739 per un mese. Il centro usa nome, email e telefono di chi prenota solo per quella prenotazione, non per pubblicità o altro.

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
  return <PaginaLegale titolo="Termini d'uso" aggiornata="21 ottobre 2026" testo={TESTO} />;
}
