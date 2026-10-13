# 739 San Marino

App del territorio di San Marino: eventi, mappa, castelli e servizi utili in un'unica app installabile sul telefono. Il nome viene dall'altezza del Monte Titano (739 m). Il proprietario è Alex Conti: scrivi e rispondi sempre in italiano.

## Stato attuale

- **Online:** https://739-san-marino.vercel.app (Vercel, deploy automatico a ogni push su `main`)
- **Repository:** github.com/jefebcn/739-san-marino (pubblico, per scelta di Alex)
- **Database:** Supabase, progetto `739-san-marino` (id `txjwvjcfubskvjxaelih`, regione Francoforte). Da non confondere con il progetto `fantasyfootball` nella stessa organizzazione.
- **Dominio:** non ancora acquistato (739sanmarino.com previsto più avanti).

## Stack

- Next.js 15 (App Router, React 19, TypeScript), niente Tailwind: stili in `app/globals.css` con variabili CSS.
- `@supabase/supabase-js` con la chiave publishable (pubblica per natura; la sicurezza la fanno le regole RLS). URL e chiave hanno un valore di riserva in `lib/supabase.ts`, quindi su Vercel non servono variabili d'ambiente.
- Mappa: MapLibre GL + stile OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`), nessuna chiave.
- App installabile (PWA): `app/manifest.ts`, icone in `public/icons` generate da `scripts/icone.mjs`.

## Struttura

| Percorso | Cosa fa |
|---|---|
| `app/page.tsx` | Home a due versioni: guida di benvenuto per chi arriva la prima volta, Home personale per chi ha scelto un castello |
| `app/eventi`, `app/eventi/[id]` | Calendario raggruppato per giorno e dettaglio evento (calendario, indicazioni, check-in disattivato) |
| `app/mappa` | Mappa a tutto schermo con filtri in alto e pannello che sale dal basso (3 altezze); `?luogo=<id>` apre quel luogo |
| `app/castelli`, `app/castelli/[slug]` | Classifica con podio e pagina del singolo castello |
| `app/utili` | Numeri di emergenza e i servizi con il loro stato attuale |
| `app/utili/farmacie` | Farmacie aperte adesso (calcolate dagli orari settimanali) ed elenco completo |
| `app/utili/trasporti` | Funivia e bus: conto alla rovescia e tabellone delle prossime partenze |
| `app/utili/rifiuti` | Calendario della raccolta per castello (parte dal castello scelto) |
| `app/utili/parcheggi` | Parcheggi con posti, tariffe e indicazioni |
| `components/Quota.tsx` | Altimetro: scala 0–739 m con le tacche dei livelli, usata nell'HUD e in Home |
| `components/Castello.tsx` | Scelta del castello salvata in `localStorage` (`739-castello`) e chip del castello nell'HUD |
| `lib/data.ts` | Letture di eventi, luoghi e classifica, funzioni per date e orari (fuso `Europe/San_Marino`) |
| `lib/servizi.ts` | Letture dei servizi (turni, linee e partenze, raccolta, parcheggi) |
| `lib/orario.ts` | Prossime partenze e giorno della settimana a San Marino; senza dipendenze, gira anche nel browser |
| `lib/fonti.ts` | Link alle fonti ufficiali mostrati in fondo alle pagine dei servizi |
| `supabase/migrations/` | Schema del database già applicato |

La Home sceglie la versione con l'attributo `data-utente` su `<html>` ("nuovo" o "tornato"), impostato da uno script in `app/layout.tsx` prima che la pagina compaia, per evitare lampeggi.

## Database

Tabelle: `castelli` (i 9 castelli con colore), `profili`, `luoghi`, `eventi`, `checkin`, `metri_movimenti`, più i servizi (migrazioni 0002–0004, dati reali raccolti il 13/10/2026 con le fonti scritte in `0004_dati_servizi.sql`):
- `luoghi` ha anche `indirizzo`, `telefono`, `orari` (testo), `orari_settimana` (json, per calcolare "aperta adesso"), `tariffa`, `posti`, `da_verificare`. Farmacie e parcheggi sono luoghi, così compaiono sulla mappa.
- A San Marino le farmacie non fanno turni a rotazione: Cailungo (Ospedale) è aperta 24 ore su 24, nei festivi apre anche Città. Per questo l'app mostra le farmacie aperte adesso. La tabella `turni_farmacie` è vuota e inutilizzata: si può eliminare.
- `linee` e `partenze` (direzione, ora, giorni 1=lunedì…7=domenica, periodo `dal`/`al`). Le corse della funivia sono inserite fino al 31/12/2027, quelle del bus Rimini–San Marino fino al 21/3/2027: vanno aggiunte le nuove quando escono gli orari. Al browser arrivano solo le corse di oggi e domani.
- `raccolta_rifiuti` (castello, zona, frazione, giorni, note). Serravalle e Domagnano non hanno il porta a porta.
- `0005_stazione_funivia.sql` è da applicare a mano (corregge la posizione della stazione della funivia).
- `da_verificare = true` mostra l'etichetta "Da verificare": toglierla solo dopo aver controllato il dato alla fonte.
- Un trigger crea il profilo a ogni nuova registrazione.
- Un trigger aggiunge i metri dell'evento a ogni check-in.
- `classifica_castelli_totali()` restituisce solo i totali per castello (funzione pubblica voluta, nessun dato personale).
- Esiste anche una vecchia vista `classifica_castelli`, resa sicura e non più usata: si può eliminare.
- Dati di prova: 2 eventi con titolo "Esempio · …" e 3 luoghi con "Posizione da verificare". Vanno sostituiti con dati veri.

## Identità visiva

- Colori: Notte `#0B1F2E`, Azzurro `#5EB6E4`, Azzurro scuro `#2C79AE`, Nebbia `#F3F6F8`, Segnale `#E8573A` (solo emergenze e avvisi). Un colore per castello, usato solo in classifiche e badge.
- Tema automatico: chiaro di giorno, scuro se il telefono è in modalità scura. I colori si usano solo tramite le variabili di ruolo in `globals.css` (`--sfondo`, `--superficie`, `--testo`, `--testo-2`, `--linea`, `--accento`, `--pannello`…), mai esadecimali fissi nelle pagine, altrimenti il tema scuro si rompe.
- Caratteri: Space Grotesk (testi e titoli, peso massimo 700), JetBrains Mono (numeri, orari, metri, etichette; cifre a larghezza fissa).
- Stile HUD, da strumento di montagna: in alto sempre visibili il castello (posizione e metri) e l'altimetro della quota personale. Elementi ricorrenti: `.pannello` (scheda scura), `.topo` (curve di livello sullo sfondo), `.cornice` (angoli da mirino), numeri grandi in mono. Usarli con misura: non su ogni scheda.
- Logo: il numero 739 con le tre cime del Titano (`components/Logo.tsx`). Mai usare torri, corona o stemma della Repubblica.
- I punti si chiamano **metri**: livelli Valle (0), Mura (200), Torri (450), Vetta (739). Non chiamarli "punti": esiste già la SMaC dello Stato.
- Tono: diretto, "di casa" con i residenti, chiaro per i turisti. Italiano prima, inglese in arrivo.

## Prossimi passi

1. Accesso con email (Supabase Auth). Prima va impostato in Supabase l'URL del sito (`https://739-san-marino.vercel.app`) tra gli indirizzi di ritorno consentiti.
2. Check-in agli eventi con QR, che attiva i metri (la logica nel database c'è già). I metri personali vanno poi passati all'altimetro (`metriPersonali` in `app/layout.tsx` e `metri` in `app/page.tsx`, oggi fissi a 0).
3. Pannello per inserire eventi, luoghi, turni delle farmacie, partenze e calendario della raccolta (le tabelle ci sono già).
4. Ispirazione approvata da Alex per Eventi (non per la Home): schede evento con foto grande. La mappa a tutto schermo con pannello dal basso è fatta.
5. Versione inglese.
6. Dominio 739sanmarino.com quando Alex lo acquista.

## Regole di lavoro

- Prima di pubblicare: `npm run build` deve passare.
- Pubblica sempre direttamente su `main` (scelta di Alex): niente branch, anteprime o pull request. Ogni push su `main` va online da solo, quindi prima di pushare la build deve passare e le pagine toccate vanno controllate.
- Le modifiche al database vanno anche salvate come file in `supabase/migrations/`.
