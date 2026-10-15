# Il piano di 739

Versione per il repository del documento «Il piano di 739» (14/10/2026). È la bussola del prodotto: ogni lavoro nuovo parte da qui. Il documento completo, con le tabelle per esteso, è su Claude: https://claude.ai/code/artifact/2e9c42bd-3d62-49cc-af6b-4b92176ec0ab

## L'anima

739 è la piazza che mancava sul telefono: il posto dove San Marino si guarda ogni giorno. Non un elenco di servizi, ma una redazione con un ritmo, che racconta il territorio e lo rende facile da usare. Si sale come sul Titano: partecipando si guadagnano metri, che portano su se stessi e il proprio castello.

## Per chi

Prima il residente e il giovane (aprono ogni giorno, portano i metri al castello), poi famiglie e frontalieri, poi i turisti. Chi paga (locali, aziende, enti) arriva quando c'è un pubblico da mostrare. Regola: chi apre l'app trova in tre secondi la cosa che gli serve adesso.

## Architettura

- **Oggi** (la porta): Home viva che cambia con l'ora. Alle 7:39 il Bollettino; di sera gli eventi di stasera; nel weekend il programma. Per chi arriva la prima volta spiega 739 in tre righe.
- **Cinque aree**:
  - **Vivere**: servizi utili, uffici pubblici, salute e farmacie, trasporti, rifiuti e meteo, avvisi e chiusure, scuola e famiglia.
  - **Uscire**: eventi, mangiare e bere, dormire, musei e cultura, natura e sentieri, negozi e outlet, itinerari.
  - **Sport**: partite aperte, squadre e rating, classifiche, impianti, società sportive, tornei di castello.
  - **Comunità**: i 9 castelli, Giunte, associazioni, volontariato, chiese e messe, bacheca.
  - **Lavorare**: aziende, professionisti, artigiani, offerte di lavoro, fiere e convegni, bandi.
- **Base comune**: SMR ID, metri e castelli, mappa, ricerca unica, motore dati.
- Ogni cosa nuova entra in una delle cinque aree, o non entra.
- Barra in basso proposta: **Oggi · Mappa · + · Sport · Esplora** (Esplora apre le cinque aree; Eventi vive in Uscire e in Oggi). SMR ID resta in alto a destra. Food e Business smettono di essere moduli a parte: diventano Mangiare e bere (Uscire) e Aziende (Lavorare).

## La scheda unica

Qualunque cosa abbia un posto (ufficio, ristorante, parcheggio, impianto) ha la stessa ossatura: nome, posizione e castello, orari con «aperto adesso», contatti, foto con credito, fonte con link, data dell'ultimo controllo, «Da verificare» finché non è controllata, «Segnala un errore». Gli uffici hanno in più «Cosa posso fare qui», scritto in frase normale.

## Catalogo per fase

| Fase | Cosa entra |
|---|---|
| Già nell'app | Emergenze, farmacie, bus e funivia, parcheggi, rifiuti, meteo, eventi, luoghi OSM, partite e classifiche, castelli |
| 0 | Uffici pubblici, ospedale e centri sanitari (solo dati pubblici e link), avvisi |
| 1 | Poste e banche, ricarica e carburanti, scuola e famiglia, musei, impianti e società sportive (CONS), tornei di castello, Giunte, associazioni, chiese e messe |
| 2 | Mangiare e bere, negozi, veterinari, volontariato, aziende, professionisti, artigiani, fiere |
| 3 | Dormire, itinerari, bacheca, offerte di lavoro, bandi |
| 4 | Campionato sammarinese (solo con accordo FSGC), feed ufficiali degli enti |

Fuori per ora: dati clinici, pagamenti in app, prenotazioni gestite da 739, politica, campionato senza accordo.

## Piano editoriale

| Quando | Rubrica |
|---|---|
| Ogni giorno, 7:39 | **Il Bollettino**: meteo, tre cose da sapere oggi, servizi, un avviso se c'è |
| Lunedì | **Il castello della settimana** |
| Mercoledì | **Come si fa**: una pratica spiegata passo per passo |
| Giovedì | **Il weekend dalla vetta**: cinque cose scelte per il fine settimana |
| Domenica sera | **Le partite della settimana** |
| Fine mese | **La vetta del mese** |

Anno: Sant'Agata (5/2), Arengo (25/3), Reggenti (1/4 e 1/10), Giornate Medievali (luglio), 28 luglio, festa di San Marino (3/9), GP a Misano (settembre), Rallylegend (ottobre), Natale delle Meraviglie (dicembre). Date da ricontrollare ogni anno.

Formati: schede, liste scelte (massimo sette voci, sempre con il perché), guide pratiche, storie brevi. L'AI prepara le bozze, una persona approva: nessun contenuto esce senza un occhio umano. Notifiche: al massimo una al giorno (Bollettino o weekend).

## Roadmap

| Fase | Quando | Obiettivo | Passaggio per andare avanti (da tarare) |
|---|---|---|---|
| 0. Fondamenta | ott-nov 2026 | Architettura a cinque aree, Bollettino, uffici e salute, avvisi, strumenti di redazione | Bollettino ogni giorno per 4 settimane; 100 schede verificate |
| 1. Lancio | dic 2026-feb 2027 | Lancio pubblico con il Natale delle Meraviglie: proponi un evento, check-in e metri veri, tornei di castello, notifiche | 1.000 SMR ID; un terzo torna ogni settimana; 40 eventi al mese |
| 2. Locali | primavera 2027 | Mangiare e bere, negozi, aziende; profilo base e Pro | 50 attività con profilo; 10 Pro paganti |
| 3. Turisti | estate 2027 | Inglese, itinerari, dormire, Giornate Medievali, store | Turisti un quinto degli utenti d'estate |
| 4. Istituzioni | da autunno 2027 | Accordi e feed ufficiali, dati aggregati | Due accordi firmati |

## Modello economico

Chi vive e visita San Marino non paga mai. Pagano le attività: profilo base gratis, profilo Pro (menu, offerte, prenotazioni, statistiche; 3,99 € al mese o 39 € all'anno, deciso il 15/10/2026), eventi in evidenza (sempre segnalati come sponsorizzati), pacchetti per manifestazioni, premi dei metri, dati aggregati e anonimi. Niente banner, niente vendita di dati personali. Al primo incasso: Vercel Pro (Hobby è solo non commerciale), piano commerciale Open-Meteo.

## Regole che non cambiano

1. Ogni cosa nuova entra in una delle cinque aree, o non entra.
2. Ogni dato ha una fonte, un link e una data di controllo.
3. Nessun contenuto esce senza un occhio umano.
4. Un sito che vieta la lettura automatica non si legge: si chiede.
5. Chi vive e visita San Marino non paga mai.
6. Si parla come una persona di casa: frasi corte, niente burocratese, italiano prima e inglese poi.
7. I punti si chiamano metri, e si guadagnano partecipando, non spendendo.
