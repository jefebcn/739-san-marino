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
| `app/mappa` | Mappa con filtri per categoria; `?luogo=<id>` centra su un luogo |
| `app/castelli`, `app/castelli/[slug]` | Classifica con podio e pagina del singolo castello |
| `app/utili` | Numeri di emergenza (112, 113, 115, 118) e servizi in arrivo |
| `components/Castello.tsx` | Scelta del castello salvata in `localStorage` (`739-castello`) |
| `lib/data.ts` | Tutte le letture dal database e le funzioni per date e orari (fuso `Europe/San_Marino`) |
| `supabase/migrations/` | Schema del database già applicato |

La Home sceglie la versione con l'attributo `data-utente` su `<html>` ("nuovo" o "tornato"), impostato da uno script in `app/layout.tsx` prima che la pagina compaia, per evitare lampeggi.

## Database

Tabelle: `castelli` (i 9 castelli con colore), `profili`, `luoghi`, `eventi`, `checkin`, `metri_movimenti`.
- Un trigger crea il profilo a ogni nuova registrazione.
- Un trigger aggiunge i metri dell'evento a ogni check-in.
- `classifica_castelli_totali()` restituisce solo i totali per castello (funzione pubblica voluta, nessun dato personale).
- Esiste anche una vecchia vista `classifica_castelli`, resa sicura e non più usata: si può eliminare.
- Dati di prova: 2 eventi con titolo "Esempio · …" e 3 luoghi con "Posizione da verificare". Vanno sostituiti con dati veri.

## Identità visiva

- Colori: Notte `#0B1F2E`, Azzurro `#5EB6E4`, Azzurro scuro `#2C79AE`, Nebbia `#F3F6F8`, Segnale `#E8573A` (solo emergenze e avvisi). Un colore per castello, usato solo in classifiche e badge.
- Caratteri: Schibsted Grotesk (tutto), IBM Plex Mono (orari, metri, etichette).
- Logo: il numero 739 con le tre cime del Titano (`components/Logo.tsx`). Mai usare torri, corona o stemma della Repubblica.
- I punti si chiamano **metri**: livelli Valle (0), Mura (200), Torri (450), Vetta (739). Non chiamarli "punti": esiste già la SMaC dello Stato.
- Tono: diretto, "di casa" con i residenti, chiaro per i turisti. Italiano prima, inglese in arrivo.

## Prossimi passi

1. Accesso con email (Supabase Auth). Prima va impostato in Supabase l'URL del sito (`https://739-san-marino.vercel.app`) tra gli indirizzi di ritorno consentiti.
2. Check-in agli eventi con QR, che attiva i metri (la logica nel database c'è già).
3. Pannello per inserire eventi, luoghi, farmacie di turno e orari.
4. Ispirazioni approvate da Alex per Eventi e Mappa (non per la Home): schede evento con foto grande, mappa a tutto schermo con pannello che sale dal basso.
5. Versione inglese.
6. Dominio 739sanmarino.com quando Alex lo acquista.

## Regole di lavoro

- Prima di pubblicare: `npm run build` deve passare.
- Ogni push su `main` va online da solo: per prove più grandi usa un branch, che Vercel pubblica come anteprima.
- Le modifiche al database vanno anche salvate come file in `supabase/migrations/`.
