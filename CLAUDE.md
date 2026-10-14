# 739 San Marino

App del territorio di San Marino: eventi, mappa, castelli e servizi utili in un'unica app installabile sul telefono. Il nome viene dall'altezza del Monte Titano (739 m). Il proprietario è Alex Conti: scrivi e rispondi sempre in italiano.

**Bussola del prodotto: `docs/piano.md`** (anima, cinque aree, scheda unica, piano editoriale, roadmap a fasi, regole). Ogni lavoro nuovo deve stare dentro quel piano; se non ci sta, chiedi ad Alex.

## Stato attuale

- **Online:** https://739-san-marino.vercel.app (Vercel, deploy automatico a ogni push su `main`)
- **Repository:** github.com/jefebcn/739-san-marino (pubblico, per scelta di Alex)
- **Database:** Supabase, progetto `739-san-marino` (id `txjwvjcfubskvjxaelih`, regione Francoforte). Da non confondere con il progetto `fantasyfootball` nella stessa organizzazione.
- **Dominio:** non ancora acquistato (739sanmarino.com previsto più avanti).

## Stack

- Next.js 15 (App Router, React 19, TypeScript).
- Tailwind CSS 4 (`postcss.config.mjs`, `tailwind.config.ts` caricato da `app/globals.css` con `@config`). Le classi CSS storiche di `globals.css` stanno in `@layer components`, quindi le utility Tailwind le sovrascrivono sempre. Il codice nuovo si scrive in Tailwind; le classi composte vanno scritte per intero (Tailwind non vede `bg-ottone-${n}`).
- Zustand per lo stato globale; ogni modulo ha il suo store in `modules/<modulo>/store.ts` (oggi `modules/core/store.ts`, la sessione SMR ID).
- `@supabase/supabase-js` con la chiave publishable (pubblica per natura; la sicurezza la fanno le regole RLS). URL e chiave hanno un valore di riserva in `lib/supabase.ts`, quindi su Vercel non servono variabili d'ambiente.
- Mappa: MapLibre GL + stile OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`), nessuna chiave.
- App installabile (PWA): `app/manifest.ts`, icone in `public/icons` generate da `scripts/icone.mjs`.

## Struttura

| Percorso | Cosa fa |
|---|---|
| `app/profile` | SMR ID: accesso/registrazione con email e password, Card digitale con QR, modifica di nome e castello |
| `app/sport`, `app/sport/[id]` | Modulo 1 Sport & Eventi: partite con filtro per sport e "Vicino a me" (posizione), organizza una partita, iscrizione, squadre bilanciate, risultato, classifiche giocatori e castelli |
| `modules/sport` | Codice del modulo Sport: `api.ts` (chiamate alle funzioni del database), `store.ts` (sport scelto, scheda, posizione), `glicko.ts` (probabilità di vittoria), `geo.ts` (distanze), `components/` |
| `app/admin/coda`, `modules/coda` | Coda delle bozze (motore dati): per redazione e amministratori (con la 0019; prima solo amministratori). Schede Da vedere, Segnalazioni, Pubblicate, Scartate; gli eventi si completano (giorno, ora, luogo dall'elenco, castello, organizzatore, metri) e si pubblica nel calendario, si scarta, si segna come doppione o si rimette in coda. `date.ts` precompila giorno e ora leggendo il testo («venerdì 16 ottobre, alle ore 21»). Luoghi, avvisi e contenuti importati mostrano un riepilogo e si approvano come sono («Esiste già» se c'è un luogo con lo stesso nome nel castello: approvando lo si aggiorna). Il link compare nel profilo SMR ID. Non indicizzata |
| `app/admin/importa`, `modules/redazione/importa.ts` | Importazione della redazione: si incolla un file JSON (formato in `docs/formato-importazione.md`, un esempio per tipo), la pagina lo controlla elemento per elemento senza rete (categorie, coordinate dentro San Marino, date, orari settimanali, castello e luoghi scritti a parole trasformati in id, foto con credito) e manda in coda solo quelli validi (`importa_redazione`). Non indicizzata |
| `lib/aree.ts` | **Elenco unico delle cinque aree** (Vivere, Uscire, Sport, Comunità, Lavorare) e delle loro sezioni: nome, icona, una riga, `href` (senza `href` la sezione è «in arrivo»), `categorie` di luoghi. Lo usano Esplora, le pagine delle aree, la ricerca, la fila in Oggi, la guida e i filtri della mappa: una sezione nuova si aggiunge solo qui |
| `app/esplora` | Le cinque aree come schede grandi, ognuna con un dato vivo (farmacie aperte, eventi della settimana, partite aperte, castello in vetta) |
| `app/vivere`, `app/uscire`, `app/comunita`, `app/lavorare` | Pagine delle aree (`components/aree/PaginaArea.tsx`): sezioni attive con lo stato di adesso, poi «In arrivo» con la riga su cosa conterranno. Vivere ha in cima i numeri di emergenza (ha preso il posto di Utili). Sport resta `/sport`, con «Anche in Sport» in fondo |
| `app/vivere/[sezione]`, `app/uscire/[sezione]`, `app/sport/impianti` | Sezioni fatte di luoghi (`components/aree/PaginaSezione.tsx`): uffici pubblici, salute e farmacie, bagni, fontanelle e ricarica; musei e monumenti; panorami; impianti sportivi. Uffici e Salute hanno in cima «Cosa devo fare?» (`components/CosaDevoFare.tsx`), che cerca tra le pratiche delle schede (`getPratiche()`, titolo, spiegazione e documenti) e porta alla pratica dentro la scheda (`/luoghi/<id>#pratica-<n>`); compare solo quando c'è almeno una pratica. Salute ha anche le farmacie aperte adesso. Le pratiche si trovano anche nella ricerca unica |
| `modules/core` | Core SMR ID: store Zustand della sessione, funzioni di accesso (`auth.ts`), `SessioneSync` (nel layout), `SmrCard`, `Accesso`, `Profilo` |
| `lib/supabase/browser.ts` | Client Supabase per il browser con la sessione nei cookie (`@supabase/ssr`); `lib/supabase.ts` resta per le letture pubbliche lato server |
| `app/page.tsx`, `lib/oggi.ts`, `components/oggi/` | **Oggi** (la Home) cambia con l'ora di San Marino (`fasciaDi()`): dalle 5 alle 12 il Bollettino delle 7:39 (`Bollettino.tsx`, si compone da solo: meteo, avvisi del castello, eventi di oggi, farmacie aperte, prossima funivia per Città, raccolta di oggi, partite di oggi; in cima il Bollettino scritto dalla redazione se è uscito oggi); dalle 12 alle 18 «Oggi pomeriggio e stasera»; dalle 18 «Stasera e domani»; da venerdì alle 12 a domenica alle 18 «Il weekend», diviso per giorno e con «Il weekend dalla vetta» se è uscito da meno di 4 giorni (`Programma.tsx`). Se il programma è vuoto compare il prossimo evento. Chi arriva la prima volta vede sempre il benvenuto (`data-utente="nuovo"`). Poi aree, "Adesso" (non di mattina: è già nel Bollettino), prossimi eventi e partite senza ripetere quelli già sopra, castelli in vetta, emergenza |
| `app/bollettino` | Il Bollettino di oggi a qualunque ora e l'archivio dei Bollettini scritti (contenuti di tipo `bollettino`). Collegato da Oggi, Rubriche e ricerca |
| `app/cerca` | Ricerca unica su servizi, eventi, luoghi e castelli (`components/Ricerca.tsx`, senza accenti e maiuscole) |
| `app/guida` | Come funziona 739: sezioni, metri e livelli |
| `app/eventi`, `app/eventi/[id]` | Calendario raggruppato per giorno e dettaglio evento (calendario, indicazioni, check-in disattivato) |
| `app/luoghi/[id]`, `components/Scheda.tsx` | **La scheda unica** di qualunque luogo: nome, categoria e castello col suo punto colore, «Da verificare», stato di apertura (`components/StatoApertura.tsx`, stessa logica delle farmacie su `orari_settimana`), indicazioni e mappa, indirizzo, orari, telefono, email, sito, tariffe, foto con credito, «Cosa posso fare qui» (`cosa_fare`), fonte e «Controllato il …» in fondo. Si apre dalla mappa («Apri la scheda»), dalla ricerca, dalle sezioni delle aree, da farmacie, parcheggi e castelli. Il «torna indietro» porta alla sezione che elenca il luogo (`ritornoDiCategoria` in `lib/aree.ts`). `getLuogo()` legge i campi della 0013 e, se mancano, quelli di base |
| `app/admin/numeri`, `modules/redazione/components/Numeri.tsx` | Numeri per gli amministratori (`numeri_739()`, migrazione 0021): SMR ID totali e nuovi, attivi in 7 giorni, chi torna ogni settimana (attivi la settimana scorsa tornati in questa), eventi pubblicati in 30 giorni e in calendario nei prossimi 30, schede verificate, giorni con il Bollettino scritto nelle ultime 4 settimane, ognuno con l'obiettivo della sua fase. Link nel profilo degli amministratori. Non indicizzata |
| `components/SegnalaErrore.tsx` | «Segnala un errore» in fondo a schede ed eventi: pannello dal basso (in un portal sul body) con orario, posizione, chiuso, altro e un testo. Va nella coda come `segnalazione` (canale `contributo`); anche senza accesso |
| `lib/useAdesso.ts` | L'ora attuale nel browser, aggiornata ogni minuto (null al primo disegno) |
| `app/storie/[slug]`, `app/rubriche` | Contenuti della redazione: pagina del singolo contenuto (foto grande con credito, titolo, sommario, testo in markdown con `components/Testo.tsx`, eventi e luoghi collegati, fonte) e archivio per rubrica (`?tipo=`). Tipi e nomi delle rubriche in `lib/contenuti.ts` (`TIPI`). Collegati da Esplora e dalla ricerca |
| `app/admin/contenuti`, `modules/redazione` | Pannello dei contenuti per la redazione: elenco con stato (bozza, programmato, pubblicato), nuovo, modifica con anteprima del markdown, eventi e luoghi collegati, pubblica adesso o programma per giorno e ora di San Marino, elimina. `Riservato.tsx` mostra i pannelli solo a chi ha il ruolo (i permessi veri li fa il database). Non indicizzata |
| `app/vivere/avvisi`, `components/Avvisi.tsx`, `components/AvvisiOggi.tsx`, `lib/avvisi.ts` | Avvisi e chiusure: in corso e nei prossimi 7 giorni. In Oggi, sotto la ricerca, al massimo tre in corso (tutto il territorio più il castello scelto). In Vivere la riga dice quanti sono. Sulla mappa quelli con un luogo o un punto (categoria `avviso`, area Vivere). Colore Segnale solo per la gravità «attenzione» |
| `app/mappa` | Mappa a tutto schermo con filtri in alto e pannello che sale dal basso (3 altezze); `?luogo=<id>` apre quel luogo |
| `app/castelli`, `app/castelli/[slug]` | Classifica con podio e pagina del singolo castello |
| `app/utili/farmacie` | Farmacie aperte adesso (calcolate dagli orari settimanali) ed elenco completo |
| `app/utili/trasporti` | Funivia e bus: conto alla rovescia e tabellone delle prossime partenze |
| `app/utili/rifiuti` | Calendario della raccolta per castello (parte dal castello scelto) |
| `app/utili/parcheggi` | Parcheggi con posti, tariffe e indicazioni |
| `app/utili/meteo` | Meteo attuale, prossime 12 ore e 7 giorni (Open-Meteo); temperatura anche in Home accanto al saluto |
| `components/ui/` | Componenti base del design system: `PrimaryButton`, `ActionCard`, `BottomNav` |
| `app/design` | Vetrina del design system (non nel menu, non indicizzata) |
| `components/Quota.tsx` | Altimetro: scala 0–739 m con le tacche dei livelli, usata nella pagina SMR ID |
| `components/Castello.tsx` | Scelta del castello salvata in `localStorage` (`739-castello`) e griglia di scelta per i nuovi |
| `lib/data.ts` | Letture di eventi, luoghi e classifica, funzioni per date e orari (fuso `Europe/San_Marino`) |
| `lib/servizi.ts` | Letture dei servizi (turni, linee e partenze, raccolta, parcheggi) |
| `lib/orario.ts` | Prossime partenze e giorno della settimana a San Marino; senza dipendenze, gira anche nel browser |
| `lib/fonti.ts` | Link alle fonti ufficiali mostrati in fondo alle pagine dei servizi |
| `lib/meteo.ts` | Meteo da Open-Meteo (nessuna chiave, cache 15 minuti) e codici meteo in italiano con icona |
| `lib/stampa.ts` | Articoli su spettacoli, mostre e cultura dal feed RSS di Libertas (cache 3 ore), in fondo alla pagina Eventi: solo titolo, data e link |
| `supabase/migrations/` | Schema del database già applicato |

In alto: selettore del castello a sinistra (`components/SceltaCastello.tsx`, si apre dal basso), ricerca e SMR ID a destra (`components/AzioniTesta.tsx`). Navigazione in basso: **Oggi · Mappa · + · Sport · Esplora** (Oggi è la Home). Il **+** centrale apre le azioni rapide (`components/AzioniRapide.tsx`: organizza partita `/sport?nuova=1`, cosa succede, il mio QR `/profile?qr=1`, cerca, farmacie, 112). In Oggi la fila in alto porta alle cinque aree. Vecchi indirizzi (in `next.config.ts`): `/utili` → `/vivere`, `/food` → `/uscire#mangiare`, `/business` → `/lavorare#aziende`; `/utili/farmacie`, `/utili/trasporti`, `/utili/rifiuti`, `/utili/parcheggi`, `/utili/meteo`, `/castelli` ed `/eventi` restano dove sono, collegati dalle aree. La mappa filtra prima per area, poi per categoria.

L'app si adatta allo schermo che la apre: a tutto schermo sul telefono (rispettando tacca e bordi con le safe area), e su schermi larghi i contenuti stanno in una colonna centrata di 640 px (`--colonna`, `--lato` in `globals.css`). Niente cornice da telefono finto.

La Home sceglie la versione con l'attributo `data-utente` su `<html>` ("nuovo" o "tornato"), impostato da uno script in `app/layout.tsx` prima che la pagina compaia, per evitare lampeggi.

## Database

Tabelle: `castelli` (i 9 castelli con colore), `profili`, `luoghi`, `eventi`, `checkin`, `metri_movimenti`, più i servizi (migrazioni 0002–0004, dati reali raccolti il 13/10/2026 con le fonti scritte in `0004_dati_servizi.sql`):
- `luoghi` ha anche `indirizzo`, `telefono`, `orari` (testo), `orari_settimana` (json, per calcolare "aperta adesso"), `tariffa`, `posti`, `da_verificare`. Farmacie e parcheggi sono luoghi, così compaiono sulla mappa.
- A San Marino le farmacie non fanno turni a rotazione: Cailungo (Ospedale) è aperta 24 ore su 24, nei festivi apre anche Città. Per questo l'app mostra le farmacie aperte adesso. La tabella `turni_farmacie` è vuota e inutilizzata: si può eliminare.
- `linee` e `partenze` (direzione, ora, giorni 1=lunedì…7=domenica, periodo `dal`/`al`). Le corse della funivia sono inserite fino al 31/12/2027, quelle del bus Rimini–San Marino fino al 21/3/2027: vanno aggiunte le nuove quando escono gli orari. Al browser arrivano solo le corse di oggi e domani.
- `raccolta_rifiuti` (castello, zona, frazione, giorni, note). Serravalle e Domagnano non hanno il porta a porta.
- `0005_stazione_funivia.sql` corregge la posizione della stazione della funivia (applicata a mano da Alex il 14/10/2026).
- `da_verificare = true` mostra l'etichetta "Da verificare": toglierla solo dopo aver controllato il dato alla fonte.
- Un trigger crea il profilo a ogni nuova registrazione, con nome e castello presi dai metadati del modulo di iscrizione e un numero tessera univoco `739-XXXX-XX` (`nuova_tessera()`, migrazione 0006). L'utente può modificare solo `nome`, `castello_id` e `lingua` del proprio profilo (permessi per colonna), non la tessera.
- Il QR della Card contiene `739ID:<tessera>`: lo leggeranno gli scanner di 739.
- Sport (migrazioni 0007 e 0008): tabelle `sport` (calcetto, padel, tennis, basket 3x3, pallavolo), `partite`, `iscrizioni`, `rating_sport` (Glicko-2 per utente e sport: rating, rd, volatilità). Partite e iscrizioni non si leggono direttamente: passano dalle funzioni `elenco_partite`, `dettaglio_partita`, `giocatori_partita` (solo con accesso), `classifica_sport` (solo con accesso), `classifica_castelli_sport`; le scritture da `crea_partita`, `iscriviti_partita`, `ritirati_partita`, `annulla_partita`, `forma_squadre`, `registra_risultato`. `glicko2()` è l'algoritmo di Glickman (verificato con l'esempio dell'articolo); ogni giocatore viene aggiornato contro la media della squadra avversaria. Le squadre si bilanciano dando i giocatori, dal rating più alto, alla squadra con la somma più bassa.
- `0008_sport_azioni.sql` (ritirarsi, annullare, formare le squadre, registrare il risultato) è stata applicata a mano da Alex dall'SQL Editor il 14/10/2026: l'applicazione automatica chiede una conferma che scade. Per le prossime migrazioni con update/delete, dare ad Alex il link al file "raw" su GitHub: copiato dalla chat il testo può arrivare tagliato.
- `luoghi.fonte` ("manuale" o "osm"), `id_esterno` (es. `node/123`) e `aggiornato_il` (migrazione 0009). I luoghi OSM (bagni, fontanelle, ricarica auto, impianti, musei e monumenti, panorami, info turistiche) arrivano ogni notte alle 3.23 UTC da `aggiorna_luoghi_osm()` (migrazione 0010, applicata a mano da Alex il 14/10/2026; primo aggiornamento lo stesso giorno: 117 luoghi. Il primo aggiornamento non va lanciato dentro uno script dell'SQL Editor: se i server sono lenti supera il tempo massimo e annulla tutto. Per lanciarlo subito si programma un'esecuzione una tantum con `cron.schedule` e poi si toglie con `cron.unschedule`): non duplicano quelli manuali della stessa categoria entro 60 m e spariscono se tolti da OSM. Non modificarli a mano: l'aggiornamento successivo li riscrive.
- Coda delle bozze (migrazioni 0011 e 0012): `importazioni` (tipo evento/luogo/avviso, `dati` json, fonte, link_fonte, canale, stato nuovo/approvato/scartato/duplicato, `simile_a`, `elemento_id`), senza policy: si usa solo con le funzioni `coda_bozze`, `conteggio_bozze`, `approva_bozza` (crea l'evento: l'ora arriva come ora di San Marino, il castello se manca è quello del luogo), `scarta_bozza` (anche come doppione), `ripristina_bozza`, tutte riservate agli amministratori. `amministratori` (utente_id) si riempie a mano: `insert into public.amministratori (utente_id) select id from auth.users where email = '…';`. `eventi` ha `fonte` e `link_fonte`, mostrati in fondo alla pagina dell'evento. `importa_libertas()` mette in coda due volte al giorno (pg_cron `importa-libertas`, 5.17 e 15.17 UTC) gli articoli di Libertas su spettacoli, mostre e cultura degli ultimi 30 giorni, una volta sola per articolo. Nelle funzioni XML di Postgres ogni articolo estratto è un documento a sé: i percorsi partono da `/item/…`. 0012 applicata a mano da Alex il 14/10/2026; prima importazione lo stesso giorno: 11 bozze. **Nessun amministratore ancora**: va aggiunto Alex dopo che si registra.
- Scheda unica (migrazione 0013, **da applicare a mano**): `luoghi` ha in più `area`, `sottocategoria`, `sito`, `email`, `foto_url`, `foto_credito`, `fonte_nome`, `fonte_link`, `verificato_il` (data dell'ultimo controllo), `cosa_fare` (json: `[{titolo, testo, documenti[], link}]`). L'importazione OSM notturna non li tocca.
- Segnalazioni (migrazione 0014, **da applicare a mano dopo la 0013**): `importazioni` accetta i tipi `segnalazione` e `contenuto` e ha `luogo_id`, `evento_id`, `segnalato_da`, `impronta` (md5 di IP e giorno, mai l'IP in chiaro). `segnala_errore()` è aperta a tutti con limiti: 5 al giorno per persona o rete, una al giorno sulla stessa scheda, 60 l'ora in tutto senza accesso. In `/admin/coda` la scheda «Segnalazioni» (`coda_bozze('segnalazioni')`) con «Corretto» (`chiudi_segnalazione`, segna la scheda come controllata oggi) e «Ignora»; «Da vedere» non mostra più le segnalazioni.
- Ruoli (migrazione 0015, applicata): `amministratori` (0011) e `redazione` (utente_id, ruolo `redattore` o `organizzatore`, aggiunto_il), senza policy di scrittura: un utente non può mai darsi un ruolo; si aggiungono dall'SQL Editor (`insert into public.redazione (utente_id, ruolo) select id, 'redattore' from auth.users where email = '…';`). `e_redattore()` vale anche per gli amministratori, `e_organizzatore()` anche per redattori e amministratori; `miei_ruoli()` li restituisce all'app (`modules/core/ruoli.ts`), che nel profilo mostra la sezione Amministrazione, Redazione o Organizzatore con i pannelli giusti. Le funzioni della coda passano a `e_redattore()` con la 0019.
- Contenuti (migrazione 0016 applicata, **0017 da applicare a mano**): `contenuti` (tipo bollettino/castello_settimana/come_si_fa/weekend/partite_settimana/vetta_mese/lista/storia/speciale, titolo, slug unico, sommario, corpo in markdown, area, castello_id, foto_url, foto_credito, luoghi[] ed eventi[] collegati, pubblicato_il, stato bozza/pubblicato, autore, fonte_nome, fonte_link). Il pubblico legge solo i pubblicati con `pubblicato_il` passato: così un contenuto si programma. La redazione legge tutto e crea (0016); modificare ed eliminare arrivano con la 0017 (l'applicazione automatica chiede conferma per quelle regole).
- Avvisi (migrazione 0018, applicata): `avvisi` (titolo, testo, tipo strada/servizio/meteo/evento/altro, castello_id vuoto = tutto il territorio, luogo_id oppure lat/lng, dal, al vuoto = fino a nuovo avviso, gravità info/attenzione, fonte_nome, fonte_link, autore). Lettura pubblica; la redazione crea (0018); modificare ed eliminare con la 0019. Arrivano anche dalla coda (tipo `avviso`, passo 0.6).
- Importazione (migrazione 0019, **da applicare a mano dopo 0013 e 0014**): categorie `ufficio` e `salute`; modifica ed eliminazione degli avvisi per la redazione; `slug_da()`; `importa_redazione(jsonb)` mette in coda luoghi, eventi, avvisi e contenuti (canale `redazione`); tutte le funzioni della coda passano a `e_redattore()`; `coda_bozze` segnala il luogo simile (stesso nome normalizzato e castello); `approva_bozza` crea l'evento, aggiorna o crea il luogo (nuovi con «Da verificare»), crea l'avviso, crea il contenuto come bozza (slug unico).
- Ufficio di esempio (migrazione 0020, **da applicare a mano dopo 0013 e 0019**): un luogo «Esempio: ufficio pubblico» (categoria `ufficio`, «Da verificare», una pratica di esempio). Nessun dato inventato: va cancellato quando arrivano gli uffici veri (il comando è nel file).
- Misurare (migrazione 0021, **da applicare a mano**): `profili.ultimo_accesso` e la tabella `accessi` (utente_id, giorno: un giorno per persona, niente orari né pagine), senza policy. `segna_accesso()` la chiama `SessioneSync` al massimo una volta al giorno per telefono (chiave `739-accesso` in localStorage); `numeri_739()` dà solo totali e solo agli amministratori. Le visite anonime le conta Vercel Web Analytics (`<Analytics />` di `@vercel/analytics` nel layout, senza cookie né chiavi): va acceso dal pannello di Vercel, progetto, Analytics.
- Un trigger aggiunge i metri dell'evento a ogni check-in.
- `classifica_castelli_totali()` restituisce solo i totali per castello (funzione pubblica voluta, nessun dato personale).
- Esiste anche una vecchia vista `classifica_castelli`, resa sicura e non più usata: si può eliminare.
- Dati di prova: 2 eventi con titolo "Esempio · …" e 3 luoghi con "Posizione da verificare". Vanno sostituiti con dati veri.

## Identità visiva

- Stile "fintech locale": base zinc profonda (`zinc-950`), accento **ottone** (scala `ottone-50…900` in `tailwind.config.ts`, `bg-metallo` per i bottoni primari: ottone pieno, senza effetto lucido), Segnale `#E8573A` solo per emergenze e avvisi, azzurro `#5EB6E4` solo per informazioni e mappa. Un colore per castello, usato solo in classifiche e badge.
- Tema: scuro di default, chiaro solo se il telefono è in modalità chiara (scelta di Alex). I colori si usano tramite i ruoli (`bg-fondo`, `bg-superficie`, `text-testo`, `text-testo-2`, `border-linea`, `text-accento`, `bg-accento-tenue`… o le variabili CSS corrispondenti), mai esadecimali fissi nelle pagine.
- Ombre minime, vetro smerigliato (`backdrop-blur`) solo per barre e pannelli sopra mappe o immagini.
- Caratteri: Geist (testi e titoli, titoli a peso 600, mai 700+) e Geist Mono (solo numeri: orari, metri, rating, conti alla rovescia, a peso 500). Caricati con `next/font` in `app/layout.tsx`.
- Icone: solo Phosphor (`@phosphor-icons/react`), tramite `components/Icona.tsx` (nomi italiani). Stile scelto da Alex il 14/10/2026 su set di riferimento Flaticon ("Basic UI", "User Interface", "Essential UI"): icone **piene con angoli arrotondati**, cioè il peso `fill` di Phosphor, predefinito in `Icona`. Frecce, "+" e lente restano `bold` (piene diventerebbero triangoli o macchie). Nella barra in basso tutte le icone sono piene e la voce attiva si distingue per il colore. Mai disegnare icone SVG a mano; l'unico SVG fatto a mano è il logo. Le icone Flaticon vere si possono usare solo se Alex le scarica col suo account (licenza e attribuzione).
- Regole "anti-AI" (dalle skill design-taste-frontend e redesign-existing-projects, applicate a ottobre 2026 su richiesta di Alex):
  - niente etichette maiuscole spaziate sopra i titoli (eyebrow); le uniche ammesse sono le diciture della Card SMR ID, come su una carta fisica;
  - niente puntini "·" come separatore nei testi visibili: virgole, "alle", due punti o a capo (i titoli delle schede del browser restano "Pagina · 739 San Marino");
  - niente trattini lunghi (—) nei testi;
  - niente gradienti lucidi, bagliori, angoli da mirino o macchie di colore decorative;
  - un solo accento (ottone): categorie e icone in colore neutro; i colori dei castelli solo come punto o dettaglio;
  - raggi: contenitori 16 px (`rounded-2xl`), controlli 12 px (`rounded-xl`), pulsante + tondo;
  - schede senza bordo (solo fondo `bg-superficie`), bordo solo per campi e liste raggruppate;
  - testi in frase normale, niente Title Case né maiuscolo.
- Stile HUD, da strumento di montagna, usato con misura: niente striscia dell'altimetro in alto (scelta di Alex); la quota personale sta nella pagina SMR ID. Elementi ricorrenti: `.pannello` (scheda scura) e `.topo` (curve di livello leggere), numeri grandi in mono. Usarli con misura.
- Logo: il numero 739 con le tre cime del Titano (`components/Logo.tsx`). Mai usare torri, corona o stemma della Repubblica.
- I punti si chiamano **metri**: livelli Valle (0), Mura (200), Torri (450), Vetta (739). Non chiamarli "punti": esiste già la SMaC dello Stato.
- Tono: diretto, "di casa" con i residenti, chiaro per i turisti. Italiano prima, inglese in arrivo.

## Prossimi passi

Fase 0 (fondamenta, passi 0.1–0.10) pubblicata il 14/10/2026. Si lavora per fasi come in `docs/piano.md`; la Fase 1 è il lancio.

0. **Migrazioni da applicare a mano, in quest'ordine**: 0013, 0014, 0017, 0019, 0020, 0021 (dall'SQL Editor, col link al file raw su GitHub). Finché mancano, l'app funziona lo stesso ma senza i campi della scheda, le segnalazioni, la modifica dei contenuti, l'importazione, l'ufficio di esempio e i numeri.
1. Accesso con email e password fatto (`/profile`). Da fare in Supabase (Authentication → URL Configuration): Site URL `https://739-san-marino.vercel.app` e `https://739-san-marino.vercel.app/profile` tra i Redirect URL, altrimenti i link di conferma e di recupero password portano a localhost. Per l'uso reale serve un SMTP proprio: quello di Supabase invia pochissime email l'ora.
2. Check-in agli eventi con QR, che attiva i metri (la logica nel database c'è già). I metri personali vanno poi passati alla quota nella pagina SMR ID (`metri` in `modules/core/components/Profilo.tsx`, oggi fisso a 0).
3. Pannello per inserire eventi, luoghi, turni delle farmacie, partenze e calendario della raccolta (le tabelle ci sono già). Fatto: la coda delle bozze `/admin/coda` pubblica eventi, luoghi, avvisi e contenuti; `/admin/importa` li carica da un file JSON. Mancano turni, partenze e raccolta.
4. Ispirazione approvata da Alex per Eventi (non per la Home): schede evento con foto grande. La mappa a tutto schermo con pannello dal basso è fatta.
5. Versione inglese.
6. Dominio 739sanmarino.com quando Alex lo acquista.

## Fonti di dati

L'elenco dei siti da cui prendere informazioni, con quelli già usati, come collegare gli altri e cosa richiede un accordo, è in `docs/fonti.md`. Non leggere in automatico i siti che lo vietano nel loro robots.txt. Alex vuole integrare più dati possibili: il piano in sei canali (coda unica delle bozze con approvazione, API aperte, RSS, newsletter via email, contributi di organizzatori e utenti, pagine consentite dal robots.txt, accordi con gli enti) e l'ordine di lavoro sono nella sezione «Motore dati» di `docs/fonti.md`. Collegate in automatico (ottobre 2026):
- **Open-Meteo** e **feed di Libertas**: letture dirette dal server Next.js con la cache di `fetch` (`next.revalidate`), niente cron né chiavi. Se la fonte non risponde la sezione sparisce senza errori.
- **OpenStreetMap**: da Vercel i server Overpass non rispondono (la mappa aspettava 22 secondi), quindi i luoghi li scarica il database ogni notte (`aggiorna_luoghi_osm()`, migrazione 0010, con `pg_cron` ed estensione `http`) e li salva in `luoghi` con `fonte = 'osm'`. I server Overpass pubblici sono spesso sovraccarichi (504): la funzione ne prova tre e, se nessuno risponde, lascia tutto com'era. Per aggiungere ristoranti, bar e negozi (moduli Food e Business) basta estendere la query e le categorie in quella funzione.
- Da questa sessione cloud Open-Meteo e Overpass non si raggiungono (rete del container): Overpass si prova dall'SQL di Supabase, Open-Meteo sul sito online.

## Regole di lavoro

- Prima di pubblicare: `npm run build` deve passare.
- Pubblica sempre direttamente su `main` (scelta di Alex): niente branch, anteprime o pull request. Ogni push su `main` va online da solo, quindi prima di pushare la build deve passare e le pagine toccate vanno controllate.
- Le modifiche al database vanno anche salvate come file in `supabase/migrations/`.
