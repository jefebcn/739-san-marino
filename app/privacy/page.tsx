import PaginaLegale from "@/components/PaginaLegale";
import { emailContatto, titolare } from "@/lib/legale";

export const metadata = { title: "Privacy · 739 San Marino", description: "Quali dati usa 739 San Marino, perché e per quanto tempo." };

// Passo 1.8, approvata da Alex il 14/10/2026. Titolare ed email in lib/legale.ts.
const TESTO = `
## In breve

- Puoi usare quasi tutta 739 senza account e senza dirci chi sei.
- Se crei un SMR ID salviamo nome, email e castello, più quello che fai nell'app: check-in, partite, eventi proposti.
- Niente pubblicità, niente profilazione, niente dati venduti o ceduti a nessuno.
- Usiamo solo i cookie tecnici che servono a tenerti dentro il tuo account.
- Puoi chiedere in ogni momento di vedere, correggere o cancellare i tuoi dati.

## Chi tratta i dati

Il titolare del trattamento è ${titolare()}. Per qualsiasi domanda sui tuoi dati scrivi a ${emailContatto()}.

Il titolare ha sede a Malta, nell'Unione europea: la regola di riferimento è il Regolamento (UE) 2016/679 (GDPR). Per chi usa 739 da San Marino vale anche la Legge della Repubblica di San Marino n. 171 del 21 dicembre 2018 sulla protezione dei dati personali.

## Quali dati e perché

**Senza account.** Il castello che scegli, l'ultimo giorno in cui hai aperto 739 e poche altre preferenze restano solo sul tuo telefono (memoria del browser) e non arrivano a noi. Le visite alle pagine le contiamo con Vercel Web Analytics, che non usa cookie e non ci dice chi sei: vediamo solo totali.

**Con l'SMR ID.** Email e password (la password è salvata cifrata, nemmeno noi la vediamo), nome, castello, lingua e il numero di tessera. Ci servono per farti accedere, mostrarti la Card e assegnare i metri a te e al tuo castello. Per sapere quante persone tornano a usare 739 salviamo un giorno per persona in cui l'app è stata aperta: niente orari, niente pagine visitate.

**Check-in e metri.** Quando fai un check-in salviamo evento, data e metri guadagnati. La classifica dei castelli mostra solo i totali, mai i nomi.

**Partite e tornei.** Le partite che organizzi o a cui ti iscrivi, i risultati e il tuo rating per ogni sport. Il tuo nome lo vedono solo gli altri utenti con l'SMR ID, nelle partite e nelle classifiche dei giocatori.

**Eventi proposti e segnalazioni.** Il testo, la foto e il contatto pubblico che scegli di indicare. Per evitare abusi, insieme a proposte e segnalazioni salviamo un'impronta cifrata ricavata dal tuo indirizzo IP e dal giorno, che serve solo a contare quante ne arrivano dalla stessa rete: l'IP in chiaro non lo salviamo mai.

**Notifiche.** Se le accendi salviamo l'indirizzo tecnico che il tuo telefono ci dà per riceverle, le notifiche scelte (Bollettino, Weekend) e il giorno dell'ultimo invio. Se sei entrato con l'SMR ID colleghiamo l'iscrizione al tuo account. Spegnendo entrambi gli interruttori l'iscrizione viene cancellata.

**Posizione.** «Vicino a me» usa la posizione del telefono solo dentro il browser, per ordinare le partite: non la salviamo. Se organizzi una partita e scegli di usare la posizione, salviamo il punto del campo, non il tuo.

## Dove stanno i dati

- **Supabase** (database e account): server a Francoforte, nell'Unione europea.
- **Vercel** (il sito e le statistiche anonime delle visite): rete di server internazionale.
- **OpenFreeMap** (le mappe): il tuo browser scarica da loro le immagini della mappa, quindi vedono il tuo indirizzo IP come per qualunque sito.

Meteo (Open-Meteo), articoli di Libertas e luoghi di OpenStreetMap li legge il nostro server: a loro non arriva nessun tuo dato.

## Per quanto tempo

- Account, check-in, partite e metri: finché tieni l'SMR ID. Se ci chiedi di cancellarlo, cancelliamo anche i dati collegati, tranne i totali anonimi dei castelli.
- Iscrizioni alle notifiche: finché non le spegni o il telefono smette di accettarle.
- Impronte anti abuso: restano con la proposta o la segnalazione e contano solo nel giorno in cui sono create.

## Cookie

739 usa solo cookie tecnici: quelli che tengono aperta la sessione dell'SMR ID. Nessun cookie di profilazione o pubblicità, nessun cookie di terze parti. Per questo non ti chiediamo il consenso con un banner.

## I tuoi diritti

Puoi chiedere di vedere i tuoi dati, correggerli, cancellarli, limitarne l'uso, riceverne una copia o opporti al trattamento. Nome e castello li cambi da solo nella pagina SMR ID; per tutto il resto scrivi a ${emailContatto()}. Rispondiamo entro 30 giorni.

Se pensi che i tuoi dati non siano trattati bene puoi rivolgerti all'Information and Data Protection Commissioner di Malta, all'autorità per la protezione dei dati del paese in cui vivi o, da San Marino, all'Autorità Garante per la protezione dei dati personali della Repubblica di San Marino.

## Minori

Per creare un SMR ID devi avere almeno 16 anni.

## Modifiche

Se cambiamo questa pagina lo scriviamo qui in cima con la data. Per i cambiamenti importanti ti avvisiamo nell'app.
`;

export default function Privacy() {
  return <PaginaLegale titolo="Privacy" aggiornata="14 ottobre 2026" testo={TESTO} />;
}
