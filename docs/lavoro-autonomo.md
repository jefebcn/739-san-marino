# Far lavorare Claude su 739 senza stare al computer

Due prompt pronti da incollare. Si usano da **claude.ai/code** (anche dal telefono, nell'app Claude: sezione Code): nuova sessione, repository `jefebcn/739-san-marino`, si incolla il prompt e si invia. Claude lavora da solo nel cloud e alla fine scrive cosa ha fatto; se serve una tua decisione si ferma e te lo chiede. La sessione si può riaprire più tardi per leggere il risultato o rispondere.

Lo stesso prompt si può anche programmare (per esempio ogni notte o ogni lunedì): basta chiederlo a Claude in una sessione, «programma questo prompt ogni …».

## 1. Avanti con il piano

Per far fare a Claude il prossimo pezzo di lavoro.

```
Sei al lavoro su 739 San Marino. Prima di tutto leggi CLAUDE.md, docs/piano.md e docs/lancio.md: sono la bussola e le regole.

Scegli UNA cosa da fare, in quest'ordine di priorità:
1. quello che ti chiedo qui sotto, se scrivo qualcosa dopo «Oggi:»;
2. altrimenti il primo punto non fatto della fase in corso di docs/piano.md (o un difetto evidente trovato controllando il sito online).
Non uscire dal piano: se una cosa non ci sta, non farla e scrivimela come proposta.

Regole di lavoro (sono già in CLAUDE.md, valgono sempre):
- un passo alla volta, un commit per passo, push diretto su main (niente branch né pull request);
- prima del push: npm run build deve passare e le pagine toccate vanno controllate con screenshot a larghezza telefono, tema chiaro e scuro;
- ogni modifica al database va anche in supabase/migrations/. Applica da solo solo le migrazioni che creano oggetti nuovi; se c'è update, delete, o tocca tabelle o funzioni esistenti, non applicarla: dammi il link "raw" su GitHub e dimmi cosa fa;
- fermati e chiedimi prima di qualsiasi cosa che costa soldi, che richiede variabili d'ambiente o chiavi su Vercel, o che va fuori dal piano;
- rispetta l'identità visiva e le regole di scrittura di CLAUDE.md (niente «·» nei testi, niente trattini lunghi, frasi normali, icone solo da Icona, Tano solo nei momenti giusti);
- non leggere in automatico siti che lo vietano;
- non inventare dati: se manca un dato vero, lascia «Da verificare» o chiedimelo.

Alla fine aggiorna CLAUDE.md e scrivimi in italiano due righe: cosa è online e cosa devo fare io.

Oggi:
```

Dopo «Oggi:» si può scrivere una richiesta precisa («sistema la pagina dei parcheggi», «aggiungi le messe delle chiese») oppure lasciare vuoto.

## 2. Controllo e sistemazione

Per un giro di controllo: cerca problemi e sistema quelli piccoli, senza aggiungere funzioni nuove.

```
Sei al lavoro su 739 San Marino. Leggi CLAUDE.md e docs/lancio.md, poi fai un giro di controllo dell'app online (https://739-san-marino.vercel.app), senza aggiungere funzioni nuove:

1. Apri con Playwright, a larghezza telefono, in tema chiaro e scuro: Oggi, Esplora, le cinque aree con le loro sezioni, Mappa, Eventi, Sport, Castelli, Bollettino, Profilo, Privacy, una scheda di un luogo e un evento. Cerca errori, pagine vuote, testi tagliati, cose che non tornano.
2. Controlla il database Supabase (progetto txjwvjcfubskvjxaelih): advisor di sicurezza e prestazioni, che i job di pg_cron (aggiorna-luoghi-osm, importa-libertas, notifiche-739) abbiano girato, coda delle bozze ferma da troppo tempo, orari di funivia e bus vicini alla scadenza.
3. Controlla la velocità e l'accessibilità delle pagine principali (Lighthouse e axe) e confrontale con i numeri in docs/lancio.md.

Sistema da solo solo i problemi piccoli e sicuri, con le regole di CLAUDE.md (build, screenshot, un commit per correzione, push su main). Per tutto il resto (database, soldi, chiavi, cose fuori dal piano o decisioni di prodotto) non toccare nulla e scrivimelo.

Alla fine scrivimi in italiano: cosa hai controllato, cosa hai sistemato, cosa devo decidere io.
```
