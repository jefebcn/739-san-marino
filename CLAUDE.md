# 739 San Marino

App del territorio di San Marino: eventi, mappa, castelli e servizi utili in un'unica app installabile sul telefono. Il nome viene dall'altezza del Monte Titano (739 m). Il proprietario è Alex Conti: scrivi e rispondi sempre in italiano.

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
| `app/food`, `app/business` | Moduli 2 e 3, schermate "Coming Soon" (`components/ui/ComingSoon.tsx`) |
| `modules/core` | Core SMR ID: store Zustand della sessione, funzioni di accesso (`auth.ts`), `SessioneSync` (nel layout), `SmrCard`, `Accesso`, `Profilo` |
| `lib/supabase/browser.ts` | Client Supabase per il browser con la sessione nei cookie (`@supabase/ssr`); `lib/supabase.ts` resta per le letture pubbliche lato server |
| `app/page.tsx` | Home: saluto e ricerca, banner (benvenuto per chi arriva, evento in evidenza per chi torna), fila di categorie, "Adesso a San Marino" (farmacie, funivia, raccolta, parcheggi), eventi e partite a scorrimento, castelli in vetta, emergenza |
| `app/cerca` | Ricerca unica su servizi, eventi, luoghi e castelli (`components/Ricerca.tsx`, senza accenti e maiuscole) |
| `app/guida` | Come funziona 739: sezioni, metri e livelli |
| `app/eventi`, `app/eventi/[id]` | Calendario raggruppato per giorno e dettaglio evento (calendario, indicazioni, check-in disattivato) |
| `app/mappa` | Mappa a tutto schermo con filtri in alto e pannello che sale dal basso (3 altezze); `?luogo=<id>` apre quel luogo |
| `app/castelli`, `app/castelli/[slug]` | Classifica con podio e pagina del singolo castello |
| `app/utili` | Numeri di emergenza e i servizi con il loro stato attuale |
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

In alto: selettore del castello a sinistra (`components/SceltaCastello.tsx`, si apre dal basso), ricerca e SMR ID a destra (`components/AzioniTesta.tsx`). Navigazione in basso: Home · Mappa · **+** · Sport · Eventi; il **+** centrale apre le azioni rapide (`components/AzioniRapide.tsx`: organizza partita `/sport?nuova=1`, il mio QR `/profile?qr=1`, cerca, farmacie, 112). Castelli, Utili, Food e Business dalla fila di categorie in Home.

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
- `luoghi.fonte` ("manuale" o "osm"), `id_esterno` (es. `node/123`) e `aggiornato_il` (migrazione 0009). I luoghi OSM (bagni, fontanelle, ricarica auto, impianti, musei e monumenti, panorami, info turistiche) arrivano ogni notte alle 3.23 UTC da `aggiorna_luoghi_osm()` (migrazione 0010, **da applicare a mano**; pg_cron e il nuovo vincolo delle categorie sono già applicati. Il primo aggiornamento non è nel file: lanciato dentro lo script supererebbe il tempo massimo dell'SQL Editor e annullerebbe tutto): non duplicano quelli manuali della stessa categoria entro 60 m e spariscono se tolti da OSM. Non modificarli a mano: l'aggiornamento successivo li riscrive.
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

1. Accesso con email e password fatto (`/profile`). Da fare in Supabase (Authentication → URL Configuration): Site URL `https://739-san-marino.vercel.app` e `https://739-san-marino.vercel.app/profile` tra i Redirect URL, altrimenti i link di conferma e di recupero password portano a localhost. Per l'uso reale serve un SMTP proprio: quello di Supabase invia pochissime email l'ora.
2. Check-in agli eventi con QR, che attiva i metri (la logica nel database c'è già). I metri personali vanno poi passati alla quota nella pagina SMR ID (`metri` in `modules/core/components/Profilo.tsx`, oggi fisso a 0).
3. Pannello per inserire eventi, luoghi, turni delle farmacie, partenze e calendario della raccolta (le tabelle ci sono già).
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
