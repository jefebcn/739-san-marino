# NeonUp, il gestionale di 739 per le aziende

Il 21/10/2026 Alex ha scelto il **gestionale completo**, sul modello di Atlantis Evo: l'analisi è in `docs/neonup-analisi.md`. Questa scelta cambia quella del 18/10/2026, che prevedeva solo l'accordo con un gestionale esterno. La pagina della fattura elettronica resta aperta anche ai gestionali convenzionati: `GESTIONALI` continua a funzionare.

NeonUp vive dentro 739, in Lavorare (`/neonup`), e si usa con l'SMR ID. Ogni azienda vede solo i suoi dati, grazie alle regole RLS della migrazione 0052. Non ci sono pagamenti nell'app: **per ora è gratis, come prova**, e il prezzo lo decide Alex.

## Fonti delle regole fiscali (ufficiali, finanze.sm)

Sono tutte sulla pagina «Fatturazione elettronica interna» di finanze.sm:

- **Documento A**: specifiche tecniche della fattura, versione 1.0 dell'8/9/2026. Formato FPR12, campi, controlli.
- **Documento B**: modalità di trasmissione e regole sammarinesi, versione 1.0 dell'8/9/2026. Definisce:
  - Tipo Merce (1, 2, 3, 4, 7) nelle righe con `AltriDatiGestionali` «TM»;
  - Tipo Merce nel riepilogo con «TM:n»;
  - Tipo Cessione «TC:nn» in Causale;
  - DDT obbligatorio con i tipi 1, 2, 4 e 7;
  - natura N4, CodiceDestinatario 0000000, RF01;
  - TipoDocumento solo TD01, TD02, TD04, TD05 e TD29;
  - termini di trasmissione;
  - note di variazione, comprese le «VariazioniContrattuali».
- **Schema XSD VFPR12 1.2.3** e MessaggiFatturaTypes 1.0. Una copia sta in `scripts/dati/fe-rsm/`, con lo schema della firma del W3C in locale.
- **Manuale «WEB Service Fatturazione elettronica OE»**, versione 2.0 dell'1/6/2026:
  - è un servizio SOAP su `https://www.pa.sm/tribfews`;
  - si autentica con il TokenFE, che vale un anno ed è legato al profilo PA;
  - i metodi FE-RSM sono `putFERSMFile`, `listFERSMFilesOut`, `getFERSMRicevuta`, `listFERSMFilesIn`, `getFERSMFileIn`, `richiediRettificaFERSMFileIn`, `listEventsFERSMFile` e quelli dei rimborsi monofase e degli allegati.
- **Regole tecniche e procedurali FE-RSM** del 25/5/2026 (slide) e **Decreto Delegato 4/9/2026 n.133**.

## Fasi

| Fase | Cosa | Stato |
|---|---|---|
| 1 | Azienda e persone (titolare, amministrazione, vendite, lettura), clienti e fornitori, articoli, documenti di vendita con numerazione ed emissione, stampa e PDF, file XML FE-RSM da caricare su TribWEB, esito segnato a mano, incassi, cruscotto | **Fatta il 21/10/2026** (migrazione 0052) |
| 2 | Invio diretto all'HUB-SM con il TokenFE dell'azienda: invio, esito, ricevute, fatture ricevute dai fornitori, richiesta di rettifica | Da decidere con Alex (vedi sotto) |
| 3 | Magazzino: depositi, giacenze, carichi e scarichi dai DDT e dalle fatture, varianti, lotti | Da fare |
| 4 | Ciclo passivo e contabilità: fatture dei fornitori, prima nota, scadenzario, riconciliazione | Da fare, con un commercialista che controlli |
| 5 | Vendita al banco dal tablet, statistiche, app degli agenti, «chiedi ai tuoi dati» in sola lettura | Da fare |
| 6 | Fatture verso l'Italia (interscambio con lo SdI tramite l'HUB-SM) | Da fare: regole diverse (IVA, codice destinatario) |

## Prima della fase 2 servono decisioni di Alex

- **Dove tenere il TokenFE.** È una credenziale fiscale dell'azienda. Va cifrato con una chiave che sta solo sul server (una variabile d'ambiente su Vercel o il vault di Supabase) e mandato all'HUB-SM solo da una route server. La chiave nuova la imposta Alex.
- **Chi può invocare il web service.** Dalla sessione cloud `pa.sm` va provato; da Vercel (Francoforte) dovrebbe rispondere. L'ambiente di TEST si attiva da TribWEB.
- **Prezzo di NeonUp** e se resta a parte o dentro il Pro.

## Cosa NeonUp non fa (ancora)

- Non manda niente all'HUB-SM: l'XML si scarica e si carica su TribWEB.
- Non calcola i festivi nei termini di trasmissione: il termine è indicativo.
- Non fa la conservazione a norma: i file restano in NeonUp finché l'azienda lo usa.
- Le fatture verso clienti non sammarinesi o senza codice operatore sono solo su carta.
- I Tipi Cessione si scrivono a mano: i valori stanno nel manuale di TribWEB, che è dietro login.

## Prova del formato

`node --experimental-strip-types scripts/prova-fe-rsm.mjs` genera quattro fatture di esempio e le valida con xmllint sullo schema ufficiale:

- beni con un DDT e bonifico;
- servizi con due DDT;
- nota di credito;
- variazioni contrattuali.

Va rilanciata a ogni modifica di `modules/neonup/fe-rsm.ts` e a ogni nuova versione dello schema.
