# Fonti di dati per 739

Ricerca del 14 ottobre 2026. Per ogni fonte: cosa offre, quanto si aggiorna e come collegarla.

**Regola:** un sito si legge in automatico solo se il suo robots.txt lo consente. Quando un sito lo vieta, i suoi dati arrivano per altre strade: newsletter e comunicati, contributi di chi organizza, accordi con chi lo gestisce (vedi «Motore dati» in fondo). 739 dà visibilità, quindi c'è qualcosa da offrire in cambio.

## 0. Già usate dall'app

Raccolte a mano il 13/10/2026 e caricate con `supabase/migrations/0004_dati_servizi.sql`. I link sono anche in `lib/fonti.ts`.

| Dato | Fonte | Da ricontrollare |
|---|---|---|
| Farmacie e orari | [ISS](https://www.iss.sm/on-line/home/articolo49000272.html) | Quando l'ISS aggiorna la pagina (ultima versione 03/04/2025) |
| Parcheggi | [visitsanmarino.com](https://www.visitsanmarino.com/pub2/VisitSM/contenuto/Vivi/Parcheggi_a_San_Marino.html) | Ogni anno (tariffe) |
| Funivia | [AASS](https://www.aass.sm/site/home/trasporti/servizio-funivia.html) | Tariffe dal 01/03/2026; chiusure per manutenzione |
| Bus Rimini–San Marino | [Benedettini](https://www.benedettinispa.com/it/rimini-san-marino) | Orari validi 15/09/2026 – 21/03/2027: aggiornare a marzo |
| Bus interni | [AASS](https://www.aass.sm/site/home/trasporti/servizio-autobus/servizio-autobus-di-linea-e-scolastico.html) | A ogni cambio d'orario |
| Raccolta rifiuti | [AASS, ecocalendari 2026](https://www.aass.sm/site/home/ambiente/raccolta-differenziata-porta-a-porta.html) | A fine anno, per il 2027 |

## 1. Collegate in automatico

Collegate il 14/10/2026: meteo in Home e in `/utili/meteo` (`lib/meteo.ts`), articoli di Libertas in fondo a `/eventi` (`lib/stampa.ts`), luoghi OSM su mappa e ricerca scaricati ogni notte dal database (`supabase/migrations/0010_osm_automatico.sql`).

| Fonte | Cosa prendere | Aggiornamento | Come collegarla |
|---|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org) (Overpass API) | Luoghi, bagni pubblici, impianti sportivi, colonnine, monumenti | Continuo, dalla comunità | Overpass API, gratis. Licenza ODbL: va citata la fonte («© OpenStreetMap contributors») |
| [Open-Meteo](https://open-meteo.com) | Meteo attuale e previsioni per San Marino (lat 43.9355, lng 12.4473) | Ogni ora | API senza chiave. Gratis per uso non commerciale, piano a pagamento per uso commerciale |
| [Overture Maps](https://docs.overturemaps.org/) (tema places) | Negozi, locali, aziende, professionisti, artigiani, impianti: a San Marino circa 2.160 luoghi (release 2026-09-23.1), 1.548 nelle categorie di 739, molti con telefono e sito | Ogni mese una release nuova | File GeoParquet pubblici su S3, nessuna chiave né costo. `scripts/overture.py` (DuckDB) estrae un riquadro in pochi secondi; il file si carica in `/admin/fonti` e un amministratore pubblica (migrazione 0038). Licenza CDLA Permissive 2.0 (alcuni luoghi Apache 2.0 o CC0, scritto per ognuno): attribuzione «© Overture Maps Foundation». Dati in gran parte da Meta, poi Microsoft, Foursquare, AllThePlaces: affidabilità variabile, per questo «Da verificare» e controllo dei doppioni |
| [Photon](https://photon.komoot.io) (komoot) | Ricerca di vie, piazze e località sulla mappa | Dati OSM, aggiornati da komoot | Istanza pubblica gratuita «per uso ragionevole», senza garanzie (risposte da 1 a 5 secondi). Passa da `/api/indirizzi` con cache di un giorno: a Photon non arriva l'IP di chi cerca. Se cresce l'uso: istanza propria (Docker, dati OSM) o un indice delle vie nel database |
| [Libertas – feed RSS](https://www.libertas.sm/rss-feed-1442/) | Notizie e articoli settimanali «Gli eventi del fine settimana a San Marino» | Quotidiano | Feed RSS (`/feed/`, 100 articoli). In app: titolo e link degli articoli di Spettacoli, Cultura, Musica e Arte. Gli eventi con data e luogo vanno estratti dal testo e confermati a mano (pannello). La ricerca e la REST API di WordPress mostrano un controllo anti-bot |

## 2. Da collegare con un accordo

| Fonte | Cosa offre | Note |
|---|---|---|
| [visitsanmarino.com](https://www.visitsanmarino.com/pub1/VisitSM/en/) – Ufficio del Turismo | Calendario ufficiale degli eventi | Nessun feed, blocca la lettura automatica. È la fonte di eventi più importante: chiedere un feed o un accesso diretto |
| [AASS](https://www.aass.sm) | Funivia, bus, rifiuti, servizi pubblici | Blocca la lettura automatica. Un feed degli orari e degli avvisi eviterebbe gli aggiornamenti a mano |
| [ISS](https://www.iss.sm) | Farmacie, numeri utili, notizie sanitarie | Chiedere i turni e gli orari speciali (festivi) in formato aggiornabile |
| [Camera di Commercio](https://www.cc.sm) | Registro delle imprese | Blocca la lettura automatica. Utile per il modulo Aziende |
| [FSGC](https://www.fsgc.sm/it) | Calendario, risultati e pagine partita del Campionato Sammarinese | Nessun feed. Rapporto delicato con la Federazione: non usare senza accordo |

## 3. Da consultare a mano

| Fonte | Cosa prendere | Aggiornamento |
|---|---|---|
| [sanmarinosite.com](https://www.sanmarinosite.com/en/events/) | Calendario eventi, [orari e prezzi della funivia](https://www.sanmarinosite.com/en/how-to-reach/ropeway/) | Frequente. Sito privato, nessun feed |
| [GiornaleSM](https://giornalesm.com) e [Tribuna Politica Web](https://news.tribunapoliticaweb.sm) | Riepilogo settimanale degli eventi | Settimanale. GiornaleSM blocca la lettura automatica |
| [gov.sm](https://www.gov.sm) | [Notizie](https://www.gov.sm/pub2/GovSM/Archivio-notizie.html), [circolari e ordinanze](https://www.gov.sm/pub2/GovSM/Circolari-e-Ordinanze.html) (chiusure di strade), [Protezione Civile](https://www.gov.sm/pub2/GovSM/Protezione-Civile.html) | Frequente, nessun feed |
| [CONS](https://www.cons.sm) | [Società sportive](https://www.cons.sm/societa-sportive/), [impianti](https://www.cons.sm/impianti/), [federazioni](https://www.cons.sm/types/federazioni/) | Raro. Utile per il modulo Sport: caricare una volta impianti e società |
| [Musei di Stato](https://www.museidistato.sm) | Gli 8 musei con le loro schede (orari e prezzi non pubblicati sul sito) | Raro |
| [Bonelli Bus](https://www.bonellibus.it/shuttle-rimini-san-marino/) | Seconda navetta Rimini–San Marino, tutti i giorni | Stagionale |
| [Ufficio Statistica](https://www.statistica.sm/pub2/StatisticaSM/Dati-statistici.html) | Popolazione, turismo, prezzi | Bollettino trimestrale, solo PDF |

## Motore dati: come integrare il massimo (piano del 14/10/2026)

Obiettivo di Alex: portare in 739 più dati possibili, senza fermarsi ai siti che bloccano la lettura automatica. La risposta non è forzare quei siti, ma moltiplicare i canali. Sei canali, tutti legittimi, che finiscono nello stesso posto.

### Il cuore: una coda unica delle bozze

Ogni dato che arriva da fuori (evento, luogo, orario, avviso) entra prima in una tabella `importazioni` e non va online da solo.

- Campi: `tipo` (evento, luogo, orario, avviso), `dati` (json già strutturato: titolo, inizio, fine, luogo, castello, prezzo, link), `fonte` (nome), `link_fonte`, `canale` (api, rss, email, contributo, pagina, accordo), `stato` (nuovo, approvato, scartato, duplicato), `simile_a` (id di un elemento già esistente), `creato_il`.
- Doppioni: stesso titolo normalizzato (senza accenti e maiuscole) + stessa data + luogo vicino = `duplicato`, unito all'esistente.
- Pannello `/admin/coda` (solo per gli amministratori): approva con un tocco, modifica, scarta. Le fonti affidabili (accordi, organizzatori verificati) possono essere approvate in automatico.
- Ogni elemento pubblicato mostra la fonte con il link, come già fanno le pagine di Utili.

### Canale 1: dati aperti con API (automatico, già avviato)

- OpenStreetMap: da Vercel l'Overpass API non risponde in tempo reale. Fatto il 14/10/2026: il database scarica i luoghi ogni notte (`aggiorna_luoghi_osm()` con `pg_cron`, migrazione 0010) e li salva in `luoghi` con `fonte = 'osm'` e `id_esterno`, così la mappa legge solo dal database. Prossimo passo: aggiungere ristoranti, bar, negozi e hotel con `opening_hours`, base dei moduli Food e Business.
- Wikidata e Wikimedia Commons: monumenti e luoghi storici con descrizione e **foto a licenza libera** (con autore e licenza da citare). Risolve le foto grandi delle schede.
- Open-Meteo: già collegato.
- Open Charge Map (chiave gratuita): colonnine di ricarica con potenza e stato.

### Canale 2: feed RSS (automatico)

- Libertas: già collegato. Passo successivo: estrarre dagli articoli «Gli eventi del fine settimana» i singoli eventi con l'AI (AI SDK + AI Gateway, risposta in json con titolo, date, orario, luogo, ingresso, contatti) e metterli nella coda come bozze.
- Provare `/feed/` sugli altri siti di notizie costruiti con WordPress (per esempio Tribuna Politica Web), dal server di Vercel e rispettando il loro robots.txt.

### Canale 3: newsletter e comunicati stampa via email (automatico, il più potente)

I siti che bloccano i robot mandano comunque le stesse informazioni per email a chi è iscritto: newsletter e comunicati stampa.

- Creare un indirizzo dedicato (per esempio `redazione@739sanmarino.com` quando c'è il dominio, intanto una casella Gmail) e iscriverlo alle newsletter di Ufficio del Turismo, gov.sm, ISS, AASS, musei, teatro, associazioni.
- Chiedere agli uffici stampa di inserire 739 tra i destinatari dei comunicati, come fanno con le testate.
- Un servizio di email in arrivo (per esempio Resend o Postmark inbound, che chiama un endpoint di 739) passa ogni email all'AI, che estrae eventi e avvisi e li mette nella coda.

### Canale 4: contributi di organizzatori, locali e utenti (cresce da solo)

In un territorio piccolo è il canale che copre di più, perché chi organizza vuole farsi vedere.

- «Proponi un evento» per tutti: modulo semplice, finisce nella coda.
- Account organizzatore (associazioni, pro loco, Giunte di Castello, società sportive, locali): pubblicano e aggiornano i propri eventi e orari; dopo la verifica, approvazione automatica.
- «Segnala un errore» su ogni scheda (orario sbagliato, luogo chiuso).
- Metri come ricompensa per le segnalazioni verificate.

### Canale 5: pagine pubbliche lette con buone maniere (dove è consentito)

- Prima di tutto: leggere il `robots.txt` di ogni sito **dal server di Vercel** (da questo ambiente non è raggiungibile). Molti siti bloccano solo i robot delle AI (GPTBot, ClaudeBot) e non un lettore normale: in quel caso la lettura è consentita.
- Dove è consentita: un lettore con nome dichiarato (User-Agent `739bot` con un link di contatto), al massimo una lettura al giorno per pagina, solo le pagine utili, fonte sempre citata, dati estratti dall'AI e messi nella coda.
- Dove è vietata: niente lettura automatica. Restano email (canale 3), contributi (canale 4) e accordi (canale 6).

### Canale 6: accordi con gli enti (il dato ufficiale)

Ufficio del Turismo (calendario eventi), AASS (funivia, bus, rifiuti, avvisi), ISS (farmacie e festivi), Camera di Commercio (imprese), CONS (impianti e società). Cosa chiedere, dal più semplice: inserire 739 nei comunicati stampa, un export periodico (anche un foglio condiviso), un feed o un'API. In cambio: visibilità, statistiche su quante persone vedono i loro contenuti, pubblicazione corretta e con la fonte.

### Ordine di lavoro

1. Tabella `importazioni` e pannello `/admin/coda`: fatto il 14/10/2026 (migrazioni 0011 e 0012). Libertas alimenta la coda due volte al giorno.
2. Importazione OSM programmata nel database: fatta per bagni, fontanelle, ricarica, impianti, cultura e panorami (migrazione 0010); da estendere a ristoranti, bar e negozi.
3. Estrazione AI degli eventi dal feed di Libertas verso la coda.
4. «Proponi un evento» e «Segnala un errore».
5. Casella email + email in arrivo verso la coda.
6. Verifica dei `robots.txt` dal server e lettore `739bot` dove consentito.
7. Wikidata e Commons per le foto delle schede.

### Promemoria fissi

Ricontrollare a marzo gli orari dei bus Rimini–San Marino e a dicembre gli ecocalendari dell'anno nuovo.

## San Marino RTV (collegata il 16/10/2026)

- Feed RSS ufficiali, uno per categoria, elencati in https://www.sanmarinortv.sm/help/feed-rss; il robots.txt non vieta niente.
- Usati: cronaca (`/news/cronaca-c3.xml`), attualità (`c4`), politica (`c2`), economia (`c5`), cultura (`c6`), sport sammarinese (`/sport/sport-sammarinese-c16.xml`). Fuori Italia, Mondo, comunicati e pubbliredazionali.
- Nel feed ci sono titolo, sommario, data, categoria e link, niente immagini. In 739 (`/notizie` e Oggi) si mostrano così come sono, con il link all'articolo e la fonte.
- Immagini: le foto degli articoli sono di San Marino RTV; per mostrarle serve il loro permesso (da chiedere alla redazione di RTV).
