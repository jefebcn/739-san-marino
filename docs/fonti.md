# Fonti di dati per 739

Ricerca del 14 ottobre 2026. Per ogni fonte: cosa offre, quanto si aggiorna e come collegarla.

**Regola:** i siti che bloccano la lettura automatica (robots.txt) non vanno letti in automatico. Per quelli i dati si copiano a mano, citando la fonte, oppure si chiede un accordo a chi li gestisce. 739 dà loro visibilità, quindi c'è qualcosa da offrire in cambio.

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

Collegate il 14/10/2026: meteo in Home e in `/utili/meteo`, luoghi OSM su mappa e ricerca, articoli di Libertas in fondo a `/eventi` (vedi `lib/meteo.ts`, `lib/osm.ts`, `lib/stampa.ts`).

| Fonte | Cosa prendere | Aggiornamento | Come collegarla |
|---|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org) (Overpass API) | Luoghi, bagni pubblici, impianti sportivi, colonnine, monumenti | Continuo, dalla comunità | Overpass API, gratis. Licenza ODbL: va citata la fonte («© OpenStreetMap contributors») |
| [Open-Meteo](https://open-meteo.com) | Meteo attuale e previsioni per San Marino (lat 43.9355, lng 12.4473) | Ogni ora | API senza chiave. Gratis per uso non commerciale, piano a pagamento per uso commerciale |
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

## Piano consigliato

1. **Mappa:** importare da OpenStreetMap i luoghi che mancano (bagni, impianti, monumenti), con un aggiornamento periodico, senza toccare farmacie e parcheggi già caricati dalle fonti ufficiali.
2. **Meteo:** aggiungere il meteo in Home e in Utili con Open-Meteo.
3. **Eventi:** leggere il feed di Libertas, proporre gli eventi del weekend come bozze, pubblicarli dopo un controllo a mano (serve il pannello di inserimento).
4. **Promemoria:** ricontrollare a marzo gli orari dei bus e a dicembre gli ecocalendari.
5. **Accordi:** contattare Ufficio del Turismo, AASS e ISS per avere eventi, orari e turni in formato aggiornabile.
