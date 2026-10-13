# 739 San Marino

Tutto San Marino, dalla vetta. App del territorio: eventi, mappa, castelli e servizi utili.

## Com'è fatta

- **Next.js 15** (App Router), pubblicata su **Vercel** (progetto `739-san-marino`)
- **Supabase** per database, login e file (progetto `739-san-marino`, Francoforte)
- **MapLibre + OpenFreeMap** per la mappa: nessuna chiave a pagamento

## Pagine

| Pagina | Cosa mostra | Dati |
|---|---|---|
| `/` | Prossimi eventi, la tua quota, scorciatoie | `eventi` |
| `/mappa` | Mappa a tutto schermo con pannello dal basso | `luoghi` |
| `/eventi` | Calendario completo | `eventi` |
| `/castelli` | Classifica dei nove castelli in metri | `classifica_castelli_totali()` |
| `/utili` | Numeri di emergenza e stato dei servizi | vari |
| `/utili/farmacie` | Farmacie aperte adesso | `luoghi` (farmacia) |
| `/utili/trasporti` | Funivia e bus Rimini–San Marino, prossime partenze | `linee`, `partenze` |
| `/utili/rifiuti` | Calendario della raccolta per castello e zona | `raccolta_rifiuti` |
| `/utili/parcheggi` | Parcheggi con posti e tariffe | `luoghi` (parcheggio) |

## Avvio in locale

```bash
cp .env.example .env.local   # inserisci la chiave publishable di Supabase
npm install
npm run dev
```

## Database

Lo schema è in `supabase/migrations/` (0001–0004 già applicati; 0005 da applicare a mano).
Tabelle: `castelli`, `profili`, `luoghi`, `eventi`, `checkin`, `metri_movimenti`.
Ogni check-in aggiunge in automatico i metri dell'evento all'utente.

I due eventi con titolo "Esempio" e i tre luoghi con "Posizione da verificare" sono dati di prova: sostituiscili con quelli veri.

## Prossimi passi

1. Collegare un repository GitHub al progetto Vercel
2. Collegare il dominio 739sanmarino.com
3. Attivare l'accesso (email con link magico di Supabase) e il check-in
4. Versione inglese dei contenuti
