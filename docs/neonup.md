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
| 2 | Invio diretto all'HUB-SM con il TokenFE dell'azienda: invio, esito, ricevute, fatture ricevute dai fornitori, richiesta di rettifica | **Fatta il 21/10/2026** (migrazione 0053, vedi sotto) |
| 3 | Magazzino: depositi, giacenze, carichi e scarichi dai DDT e dalle fatture, varianti, lotti | **Fatta il 22/10/2026** (migrazione 0054, vedi sotto) |
| 4 | Ciclo passivo e contabilità: fatture dei fornitori, prima nota, scadenzario, riconciliazione | **Fatta il 22/10/2026** come contabilità di gestione (migrazione 0055, vedi sotto); partita doppia, registri e bilancio no |
| 5 | Vendita al banco dal tablet, statistiche, app degli agenti, «chiedi ai tuoi dati» in sola lettura | Da fare |
| 6 | Fatture verso l'Italia (interscambio con lo SdI tramite l'HUB-SM) | Da fare: regole diverse (IVA, codice destinatario) |

## Fase 2: come funziona il collegamento con l'HUB-SM

Scelta di Alex del 21/10/2026: il TokenFE nel Vault di Supabase, niente variabili d'ambiente nuove su Vercel.

- **Il token.** Lo mette solo il titolare, da «Azienda», «Collegamento con l'HUB-SM», scegliendo Test o Reale. `neon_hub_collega` lo salva cifrato con `vault.create_secret` (o `update_secret` se cambia) e in `neon_hub` resta solo l'id del segreto. Lo legge soltanto `neon_hub_token`, chiamata dalle funzioni che parlano con l'HUB-SM; al browser non torna mai. «Scollega» sovrascrive il segreto con `scollegato`.
- **Le chiamate.** Partono dal database con l'estensione `http` (`neon_ws(ambiente, metodo, corpo)`): SOAP 1.1 document/literal, namespace `http://api.tribfews.ciscoop.sm/`, produzione `https://www.pa.sm/tribfews/tribfews`, test `https://www.pa.sm/tribfewstest/tribfews`. Il database li raggiunge entrambi.
- **La coda.** `neon_hub_coda` (verifica, invia, esito, ricevute, rettifica) la lavora pg_cron `neonup-hub` ogni minuto con `neon_hub_lavora()`, al massimo 12 chiamate per passata. La verifica del token usa `listFERSMTempFiles`. Dopo l'invio l'esito si chiede dopo 10 minuti e poi ogni 30 (codici -540 e -542: non ancora pronto), fino a 150 tentativi. Le fatture ricevute si cercano da sole ogni 3 ore per chi è collegato (al massimo 20 file per passata; dai `.p7m` si estrae l'XML).
- **L'invio.** Il file XML lo scrive il browser con `fe-rsm.ts` (lo stesso della fase 1) e lo manda a `neon_hub_invia`, che controlla che corrisponda al documento (numero, data, codice operatore, progressivo), salva la copia esatta in `neon_hub_file` con l'impronta e mette in coda `putFERSMFile`. Un documento non si manda due volte; se l'HUB-SM rifiuta subito il caricamento il documento resta «da inviare» con il motivo.
- **Esiti e ricevute.** `getFERSMRicevuta` porta RicevutaConsegna o RicevutaScarto (con i codici di errore): il documento passa a consegnata o scartata e la ricevuta resta in `neon_hub_ricevute`. Dopo uno scarto `neon_aggiorna_scartata` riprende i dati corretti di cedente e cessionario e il file nuovo ha un nome nuovo.
- **Fatture ricevute** (`neon_passive`, pagina «Fatture ricevute»): `listFERSMFilesIn` e `getFERSMFileIn`; `neon_leggi_fattura` ricava fornitore, numero, data e totale. Si segnano come viste o registrate; «Chiedi una rettifica» con il motivo usa `richiediRettificaFERSMFileIn`.
- **Codici utili:** -1 token non valido, -540 non ancora acquisito, -542 riprovare tra 30 minuti, -252 rifiutato o scartato, -201 data di inizio FE, -230 diritti mancanti.

**Da provare con un token vero:** le prove del 21/10/2026 hanno usato il servizio di test con un token finto (risposta «Token non decrittabile», codice -1, gestita). Il primo giro completo va fatto con un TokenFE generato su TribWEB di TEST, scegliendo «Test»; solo dopo si passa a «Reale».

**Ancora da decidere con Alex:** il prezzo di NeonUp e se resta a parte o dentro il Pro.

## Fase 3: come funziona il magazzino

- **Articoli a magazzino.** Un articolo entra a magazzino con il primo carico o con «Gestito a magazzino» negli Articoli (`neon_mag_articoli`): scorta minima, varianti (es. S, M, L: una variante già movimentata non si toglie), lotti con la scadenza. Gli articoli non gestiti e le righe scritte a mano non muovono niente.
- **Depositi** (`neon_depositi`): il primo, «Magazzino», nasce da solo ed è il predefinito; titolare e amministrazione ne aggiungono fino a 20, cambiano il predefinito, li disattivano.
- **Operazioni e movimenti** (`neon_mag_operazioni`, `neon_mag_movimenti`): ogni operazione ha i suoi movimenti con la quantità col segno. A mano: carico (fornitore, riferimento, costo unitario), scarico, rettifica (+ o −), trasferimento tra depositi (con i lotti), inventario (le differenze tra contato e risultante diventano rettifiche; solo titolare e amministrazione). Niente cancellazioni: «Storna» scrive i movimenti opposti.
- **Dai documenti, da soli** (`neon_mag_da_documento`, chiamata da `neon_emetti`): il DDT scarica; la fattura scarica le righe che nessun DDT di NeonUp indicato nella fattura ha già scaricato (stesso numero e data); la nota di credito ricarica le righe segnate «Rientra in magazzino». Annullare un DDT storna il suo scarico (`neon_annulla`). Senza la variante giusta il documento non si emette.
- **Lotti:** in uscita, se il lotto non è scelto, si scarica prima quello che scade prima; quello che manca resta «senza lotto» in negativo. La giacenza può andare sotto zero (la pagina lo segnala in rosso).
- **Valore:** giacenza per costo medio ponderato dei carichi non stornati (`neon_mag_costi`); è un'indicazione, non una valutazione fiscale del magazzino.
- **Dalle fatture ricevute:** «Carica in magazzino» apre un carico con fornitore (per codice operatore), riferimento e righe lette dall'XML, abbinate al catalogo per codice o descrizione; le righe senza abbinamento vanno scelte a mano.
- Prova del 22/10/2026 in una transazione annullata: 20 controlli passati (FEFO, fattura del DDT che non riscarica, reso, storno del DDT annullato, trasferimento con i lotti, inventario, permessi).

## Fase 4: come funziona la contabilità di gestione

È la contabilità di tutti i giorni, non quella obbligatoria: niente partita doppia, piano dei conti, registri, imposte o bilancio. Se un giorno si vuole la partita doppia, il piano dei conti e le regole vanno decisi con un commercialista sammarinese.

- **Chi:** vedono titolare, amministrazione e «Solo lettura» (pensato per il commercialista, `neon_vede_conti`); scrivono titolare e amministrazione; il ruolo «Vendite» non vede la sezione e segna gli incassi a mano come prima.
- **Conti** (`neon_conti`): cassa, banca, carta o altro, con IBAN, saldo iniziale e la data da cui vale (i movimenti non possono essere prima). Saldo = saldo iniziale più i movimenti non annullati (`neon_saldi`).
- **Prima nota** (`neon_prima_nota`): entrate (importo positivo) e uscite (negativo) con descrizione, categoria (`CATEGORIE` suggerite, si può scriverne un'altra), cliente o fornitore, ed eventualmente il documento di vendita o l'acquisto che salda. Giroconti tra due conti in due metà. Un errore si annulla (resta barrato), mai si cancella; un movimento abbinato all'estratto si annulla solo dopo aver tolto l'abbinamento.
- **Incassi:** un movimento collegato a una fattura, un acconto o una nota di debito aggiorna `incassato_il` da solo quando il dovuto (totale meno le note di credito collegate) è incassato (`neon_ricalcola_incasso`); annullandolo torna da incassare. Nel documento emesso, con i conti, c'è «Registra l'incasso» (conto, data, importo); senza conti resta «Segna come incassata».
- **Acquisti** (`neon_acquisti`): fatture dei fornitori, note di credito (anche collegate a una fattura, che riducono) e ricevute o spese, con scadenza e categoria. Dalle «Fatture ricevute» dell'HUB-SM «Registra tra gli acquisti» precompila fornitore (per codice operatore), numero, data, totale, scadenza (`DataScadenzaPagamento`) e descrizione, e segna la fattura ricevuta come registrata. Si possono segnare come pagati a mano (pagati prima di NeonUp).
- **Scadenzario** (`neon_scadenzario`): da incassare (fatture, acconti, note di debito; note di credito del fornitore non collegate) e da pagare (acquisti; note di credito ai clienti non collegate), con il residuo; un tocco registra il movimento già compilato.
- **Banca:** l'estratto conto CSV dell'home banking si legge nel browser (`leggiCsv`, separatore e colonne riconosciuti, date e numeri all'italiana), si scelgono le colonne (importo unico o entrate e uscite) e si importano solo data, importo e descrizione (`neon_importa_estratto`, senza doppioni con l'impronta). Ogni riga si abbina a un movimento con lo stesso importo entro 15 giorni, diventa un movimento nuovo o si ignora.
- **Per il commercialista:** CSV con separatore «;» e virgola decimale di prima nota, acquisti e vendite del periodo, oppure il ruolo «Solo lettura».
- Prova del 22/10/2026 in una transazione annullata: 22 controlli passati (incasso parziale e totale, annullo, note di credito, acquisti, giroconto e saldi, estratto senza doppioni, abbinamenti, fattura ricevuta registrata una volta, permessi).

## Cosa NeonUp non fa (ancora)

- Le fatture ricevute diventano acquisti con «Registra tra gli acquisti» e merce con «Carica in magazzino»: sono due passi separati.
- Niente partita doppia, registri obbligatori, imposte, bilancio, solleciti o bonifici dalla banca.
- Il magazzino non tiene gli impegni degli ordini dei clienti né gli ordini ai fornitori.
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
