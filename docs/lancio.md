# Prima del lancio pubblico

Cosa deve fare Alex prima di aprire 739 a tutti (passo 1.8, 14/10/2026). In ordine di importanza. Dove serve il codice lo faccio io, basta dirmelo.

## 1. Accesso e email (bloccante)

- [ ] **Supabase, Authentication, URL Configuration**: Site URL `https://739-san-marino.vercel.app`; tra i Redirect URL `https://739-san-marino.vercel.app/**`. Senza questo i link di conferma e di recupero password portano a localhost (è il motivo per cui la conferma dell'email «non riportava da nessuna parte»).
- [ ] **SMTP proprio** (Supabase, Authentication, Emails, SMTP Settings). Quello di Supabase manda pochissime email l'ora: al lancio molte iscrizioni resterebbero senza email di conferma. Consiglio Resend (piano gratuito: 3.000 email al mese, 100 al giorno); vuole un dominio verificato, quindi va fatto dopo il punto 3. Mittente per esempio `739 <ciao@739sanmarino.com>`.
- [ ] **Testi delle email in italiano** (Authentication, Emails, Templates): conferma, recupero password, cambio email. Se vuoi li scrivo io e te li passo da incollare.

## 2. Privacy e termini

- [x] Testi approvati da Alex il 14/10/2026 (età minima 16 anni, foro di San Marino).
- [x] Titolare: Mediterranean Digital Solutions Ltd (Malta), la stessa società di FantaTitano, in `lib/legale.ts`.
- [ ] Oggi la cancellazione dell'account si chiede per email. Se serve, aggiungo «Cancella il mio SMR ID» nel profilo.

## 3. Dominio

- [ ] Comprare `739sanmarino.com` (circa 10 a 15 euro l'anno) e collegarlo al progetto su Vercel (Settings, Domains).
- [ ] Poi lo cambio io in: `metadataBase` di `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, l'indirizzo chiamato da `manda_notifiche()` (migrazione nuova) e `VAPID_SUBJECT`. Tu cambi Site URL e Redirect URL in Supabase.

## 4. Notifiche (passo 1.6)

- [x] Migrazione 0029 applicata da Alex il 14/10/2026.
- [x] Chiavi VAPID su Vercel messe da Alex il 14/10/2026; provata la catena completa (pg_cron, segreto, /api/notifiche: risposta 200). Non cambiarle più: chi ha acceso le notifiche dovrebbe riaccenderle.
- [ ] Provarle su un iPhone (con 739 sulla schermata Home) e su un Android.

## 4 bis. Luoghi nuovi da OpenStreetMap

- [x] Applicare `supabase/migrations/0033_negozi.sql` (fatto da Alex il 15/10/2026, primo aggiornamento lanciato lo stesso giorno) (contiene anche 0030, 0031, 0032): ristoranti e bar, poste, banche, distributori, scuole, chiese, negozi. Poi lanciare l'aggiornamento subito con `cron.schedule('osm-subito', …)` e toglierlo dopo 2 o 3 minuti con `cron.unschedule('osm-subito')`.
- [x] Applicare `supabase/migrations/0034_attivita.sql` (profilo base delle attività: i titolari chiedono e aggiornano la loro scheda).
- [x] Applicare `supabase/migrations/0035_attivita_pro.sql` (739 Pro: menu, prenota, offerte e numeri della scheda).
- [ ] Prima di vendere il primo Pro: un modello di accordo con prezzo (3,99 € al mese o 39 € all'anno), durata e fattura della società; al primo incasso passare a Vercel Pro (Hobby è solo non commerciale).
- [ ] Mandare a Claude i nomi dei ristoranti importanti: quelli che OSM non ha si aggiungono con `/admin/importa`.
- [ ] Per la Fase 1 mancano dati veri: Giunte di castello, associazioni, società sportive (CONS), orari delle messe. Vanno chiesti agli enti o dati da Alex.
- [ ] Facoltativo: chiedere all'Ufficio del Turismo l'elenco dei locali e il calendario degli eventi (il loro sito non si può leggere in automatico).

## 5. Persone

- [ ] Amministratori (vedono tutto):
  `insert into public.amministratori (utente_id) select id from auth.users where email = '…';`
- [ ] Redattori (coda, contenuti, importazione, tornei):
  `insert into public.redazione (utente_id, ruolo) select id, 'redattore' from auth.users where email = '…';`
- [ ] Organizzatori (pubblicano i propri eventi senza passare dalla coda):
  `insert into public.redazione (utente_id, ruolo) select id, 'organizzatore' from auth.users where email = '…';`
- [ ] Chi scrive il Bollettino ogni mattina e chi guarda la coda ogni giorno.

## 6. Dati di prova da togliere

- [ ] I 2 eventi «Esempio · …», l'ufficio di esempio e lo speciale di prova: tutto in un colpo con `supabase/pulizia-prima-del-lancio.sql`, il giorno del lancio.
- [ ] Piazza della Libertà, Prima Torre (Guaita) e stazione della funivia sono luoghi veri con «Posizione da verificare»: si controllano e si toglie l'etichetta (comando d'esempio in fondo allo stesso file).
- [ ] Controllare alla fonte le schede «Da verificare» più viste (farmacie, parcheggi, funivia) e togliere l'etichetta.
- [ ] Orari: funivia inserita fino al 31/12/2027, bus Rimini–San Marino fino al 21/3/2027.

## 7. Vercel

- [ ] Accendere Web Analytics (progetto, Analytics). Finché è spento, ogni pagina prova a caricare lo script delle statistiche e riceve un errore (innocuo, ma si vede nei controlli di qualità).
- [ ] Facoltativo: Speed Insights, per misurare la velocità sui telefoni veri.

## 8. Sicurezza

- Il controllo di Supabase (Advisors) segnala funzioni del database chiamabili dall'app e tabelle senza regole: è voluto, perché tutte le letture e scritture passano da funzioni che controllano chi le chiama.
- [ ] «Leaked password protection» (blocca password già trapelate): in Supabase è disponibile solo dal piano Pro, a pagamento. Da valutare quando ci sono molti utenti.

## 9. Prova finale

- [ ] Installare 739 su un iPhone e su un Android: iscrizione, conferma email, check-in con un QR stampato, una partita, notifiche, apertura senza rete (Oggi e numeri di emergenza).
- [ ] Mandare il link a 3 o 4 persone e guardare cosa non capiscono.

## Controlli fatti da me (14/10/2026)

- **Accessibilità** (axe, 26 pagine, tema chiaro e scuro): corretti i contrasti (testi della barra in basso, Segnale nel tema chiaro e sotto il testo bianco del 112, ottone e verde «aperta» nel chiaro), lo zoom ora è permesso, marcatori della mappa da 24 px, etichette per i lettori di schermo. Restano zero problemi segnalati.
- **Velocità** (Lighthouse, telefono, server di produzione in locale): Oggi 85, Eventi 94, Vivere 86, Sport 86, Farmacie 86, scheda di un luogo 89; accessibilità 100 ovunque. La mappa fa 46: il motore della mappa (MapLibre) è pesante sui telefoni lenti; si può migliorare più avanti caricandolo dopo il resto.
- **Senza rete**: Oggi e la pagina con numeri di emergenza e farmacie si salvano alla prima visita; le altre pagine restano disponibili se già aperte.
