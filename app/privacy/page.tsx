import PaginaLegale from "@/components/PaginaLegale";
import { emailContatto, titolare } from "@/lib/legale";

export const metadata = { title: "Privacy · 739 San Marino", description: "Quali dati usa 739 San Marino, perché e per quanto tempo." };

// Passo 1.8, approvata da Alex il 14/10/2026; rivista e confermata da Claude su incarico di Alex il 15/10/2026
// (base giuridica, trasferimenti, cookie e memoria del telefono). Titolare ed email in lib/legale.ts.
const TESTO = `
## In breve

- Puoi usare quasi tutta 739 senza account e senza dirci chi sei.
- Se crei un SMR ID salviamo nome, email e castello, più quello che fai nell'app: check-in, partite, eventi proposti.
- Niente pubblicità, niente profilazione, niente dati venduti o ceduti a nessuno.
- Usiamo un solo cookie, tecnico, per tenerti dentro il tuo account. Niente banner perché non serve.
- Puoi chiedere in ogni momento di vedere, correggere o cancellare i tuoi dati.

## Chi tratta i dati

Il titolare del trattamento è ${titolare()}. Per qualsiasi domanda sui tuoi dati scrivi a ${emailContatto()}.

Il titolare ha sede a Malta, nell'Unione europea: la regola di riferimento è il Regolamento (UE) 2016/679 (GDPR). Per chi usa 739 da San Marino vale anche la Legge della Repubblica di San Marino n. 171 del 21 dicembre 2018 sulla protezione dei dati personali.

## Quali dati e perché

**Senza account.** Il castello che scegli e poche altre preferenze restano solo sul tuo telefono (vedi «Cookie e memoria del telefono») e non arrivano a noi. Le visite alle pagine le contiamo con Vercel Web Analytics, che non usa cookie e non ci dice chi sei: vediamo solo totali.

**Con l'SMR ID.** Email e password (la password è salvata cifrata, nemmeno noi la vediamo), nome, castello, lingua e il numero di tessera. Ci servono per farti accedere, mostrarti la Card e assegnare i metri a te e al tuo castello. Per sapere quante persone tornano a usare 739 salviamo un giorno per persona in cui l'app è stata aperta: niente orari, niente pagine visitate.

**Check-in e metri.** Quando fai un check-in salviamo evento, data e metri guadagnati. La classifica dei castelli mostra solo i totali, mai i nomi.

**Partite e tornei.** Le partite che organizzi o a cui ti iscrivi, i risultati e il tuo rating per ogni sport. Il tuo nome lo vedono solo gli altri utenti con l'SMR ID, nelle partite e nelle classifiche dei giocatori.

**Eventi proposti e segnalazioni.** Il testo, la foto e il contatto pubblico che scegli di indicare. Per evitare abusi, insieme a proposte e segnalazioni salviamo un'impronta cifrata ricavata dal tuo indirizzo IP e dal giorno, che serve solo a contare quante ne arrivano dalla stessa rete: l'IP in chiaro non lo salviamo mai.

**Notifiche.** Se le accendi salviamo l'indirizzo tecnico che il tuo telefono ci dà per riceverle, le notifiche scelte (Bollettino, Weekend) e il giorno dell'ultimo invio. Se sei entrato con l'SMR ID colleghiamo l'iscrizione al tuo account. Spegnendo entrambi gli interruttori l'iscrizione viene cancellata.

**Titolari di attività.** Se chiedi di gestire la scheda della tua attività, o ne proponi una nuova, salviamo chi sei e che ruolo hai, un telefono per la verifica e la nota che scrivi: li vede solo la redazione di 739 e il telefono non compare nella scheda. Quello che scrivi nella scheda (descrizione, contatti, orari, foto) invece è pubblico.

**Schede da fonti aperte.** Molte schede di negozi, locali, aziende e studi arrivano da OpenStreetMap e da Overture Maps: sono dati pubblici delle attività (nome, indirizzo, telefono e sito dell'attività), con la fonte scritta nella scheda. Se una scheda riguarda te o la tua attività e vuoi correggerla o toglierla, usa «Segnala un errore» o scrivici: lo facciamo.

**Numeri delle schede delle attività.** Quando apri la scheda di un locale, un negozio o un distributore, o tocchi Chiama, Indicazioni, sito, email, Menu o Prenota, aggiungiamo uno al totale di quel giorno per quella scheda. Non salviamo chi sei, né il tuo indirizzo IP, né l'ora: il titolare con il piano Pro vede solo i totali.

**Posizione.** «Vicino a me» usa la posizione del telefono solo dentro il browser, per ordinare le partite e i luoghi della mappa: non la salviamo e non ce la manda nessuno. Se organizzi una partita e scegli di usare la posizione, salviamo il punto del campo, non il tuo.

## Su quale base

- **Per darti il servizio che chiedi** (GDPR art. 6.1.b): account SMR ID, check-in e metri, partite e tornei, eventi proposti, schede delle attività.
- **Con il tuo consenso** (art. 6.1.a), che puoi togliere quando vuoi: notifiche e posizione del telefono.
- **Per un nostro interesse legittimo** (art. 6.1.f), con il minimo dei dati: limiti anti abuso con l'impronta cifrata, conteggi anonimi delle visite e delle schede delle attività, sicurezza del servizio.

Nessuna decisione che ti riguarda viene presa in automatico da un programma.

## Dove stanno i dati

- **Supabase** (database e account): server a Francoforte, nell'Unione europea.
- **Vercel** (il sito e le statistiche anonime delle visite): società con sede negli Stati Uniti e rete di server internazionale. Il trasferimento fuori dall'Unione europea avviene con le garanzie previste dal GDPR (Data Privacy Framework UE-USA o clausole contrattuali standard).
- **OpenFreeMap** (le mappe): il tuo browser scarica da loro le immagini della mappa, quindi vedono il tuo indirizzo IP come per qualunque sito.

Meteo (Open-Meteo), articoli di Libertas e luoghi di OpenStreetMap li legge il nostro server: a loro non arriva nessun tuo dato. Lo stesso per la ricerca di vie e indirizzi sulla mappa: il testo che scrivi lo passa il nostro server a Photon (komoot, Germania), senza il tuo indirizzo IP né altro su di te.

## Per quanto tempo

- Account, check-in, partite, metri e richieste delle attività: finché tieni l'SMR ID. Se ci chiedi di cancellarlo, cancelliamo anche i dati collegati, tranne i totali anonimi dei castelli.
- Iscrizioni alle notifiche: finché non le spegni o il telefono smette di accettarle.
- Impronte anti abuso: restano con la proposta o la segnalazione e contano solo nel giorno in cui sono create.

## Cookie e memoria del telefono

**Un solo cookie, tecnico.** Se entri con l'SMR ID il browser salva il cookie della sessione (si chiama \`sb-…-auth-token\`): ti tiene dentro il tuo account e sparisce quando esci. Senza account non c'è nessun cookie.

**Preferenze nella memoria del browser.** Restano sul tuo telefono, non le leggiamo da lontano e non servono a profilarti:

- il castello che hai scelto e la zona della raccolta rifiuti;
- se hai già chiuso l'invito a installare 739 e se ti abbiamo già chiesto delle notifiche;
- l'ultimo giorno in cui hai aperto 739 con l'SMR ID, per segnare l'accesso una volta sola al giorno;
- la pagina a cui tornare dopo l'accesso e le schede delle attività già contate, per contarle una volta sola (solo finché la scheda del browser resta aperta).

**Copia per quando sei senza rete.** Il telefono tiene una copia di Oggi, della pagina con i numeri di emergenza e delle icone di 739, così si aprono anche senza connessione.

Niente cookie di profilazione o di pubblicità, niente cookie di terze parti: le statistiche delle visite (Vercel Web Analytics) e le mappe (OpenFreeMap) non ne usano. Per questo la legge non chiede un banner per il consenso. Puoi cancellare tutto quando vuoi dalle impostazioni del browser: perdi solo le preferenze e l'accesso.

## I tuoi diritti

Puoi chiedere di vedere i tuoi dati, correggerli, cancellarli, limitarne l'uso, riceverne una copia o opporti al trattamento. Nome e castello li cambi da solo nella pagina SMR ID; per tutto il resto scrivi a ${emailContatto()}. Rispondiamo entro 30 giorni.

Se pensi che i tuoi dati non siano trattati bene puoi rivolgerti all'Information and Data Protection Commissioner di Malta, all'autorità per la protezione dei dati del paese in cui vivi o, da San Marino, all'Autorità Garante per la protezione dei dati personali della Repubblica di San Marino.

## Minori

Per creare un SMR ID devi avere almeno 16 anni.

## Modifiche

Se cambiamo questa pagina lo scriviamo qui in cima con la data. Per i cambiamenti importanti ti avvisiamo nell'app.
`;

export default function Privacy() {
  return <PaginaLegale titolo="Privacy" aggiornata="15 ottobre 2026" testo={TESTO} />;
}
