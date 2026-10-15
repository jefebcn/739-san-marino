# Formato di importazione

Come preparare un file JSON da incollare in `/admin/importa` (solo redazione e amministratori).
Ogni elemento valido finisce nella **coda delle bozze** (`/admin/coda`, scheda «Da vedere»): niente va online finché qualcuno non lo approva.

## Regole generali

- Il file è un elenco tra parentesi quadre `[ … ]`, oppure un oggetto `{ "elementi": [ … ] }`.
- Ogni elemento ha `"tipo"`: `luogo`, `evento`, `avviso` o `contenuto`.
- Date e ore sono **ora di San Marino**, scritte `"2026-10-17T21:00"`. Le sole date (`verificato_il`) si scrivono `"2026-10-14"`.
- Il castello si scrive col nome (`"Borgo Maggiore"`) o con lo slug (`"borgo-maggiore"`): `citta`, `borgo-maggiore`, `serravalle`, `domagnano`, `fiorentino`, `acquaviva`, `faetano`, `chiesanuova`, `montegiardino`.
- Un luogo collegato si scrive col suo nome esatto, come compare in 739 (maiuscole e accenti non contano), oppure con il suo id.
- I link (`sito`, `foto_url`, `fonte_link`) iniziano con `https://`.
- Una foto senza `foto_credito` non passa.
- Ogni dato dovrebbe avere una fonte: `fonte_nome` e, se c'è, `fonte_link`.
- I campi che non servono si tolgono: non scrivere `null` o stringhe vuote.
- Indirizzi, telefoni e orari negli esempi qui sotto sono inventati: servono solo a mostrare la forma.

Prima di mettere in coda, la pagina controlla tutto e dice elemento per elemento cosa non va. Gli elementi con errori restano fuori; quelli giusti entrano anche se altri sono sbagliati.

## luogo

Un luogo nuovo o l'aggiornamento di uno che esiste già.
Quando lo approvi, se in 739 c'è già un luogo con lo stesso nome nello stesso castello, viene **aggiornato** solo nei campi che il file contiene; altrimenti ne nasce uno nuovo, con l'etichetta «Da verificare» (a meno che il file dica `"da_verificare": false`).

| Campo | Obbligatorio | Cosa contiene |
|---|---|---|
| `nome` | sì | Nome del luogo |
| `categoria` | sì | `luogo`, `parcheggio`, `farmacia`, `impianto`, `trasporti`, `locale`, `servizio`, `cultura`, `panorama`, `bagni`, `acqua`, `ricarica`, `ufficio`, `salute`, `posta`, `banca`, `carburante`, `scuola`, `chiesa`, `negozio` (le ultime sei dopo la migrazione 0033), `azienda`, `professionista`, `artigiano` (dopo la 0036) |
| `lat`, `lng` | per i luoghi nuovi | Coordinate, devono cadere a San Marino |
| `castello` | no | Nome o slug del castello |
| `area` | no | `vivere`, `uscire`, `sport`, `comunita`, `lavorare` |
| `sottocategoria` | no | Testo libero, es. «Anagrafe». Per i locali uno di: `ristorante`, `pizzeria`, `piadineria`, `cibo veloce`, `bar`, `gelateria`, `pub` (così finiscono nel gruppo giusto di «Mangiare e bere» e hanno l'icona giusta sulla mappa). Per aziende, professionisti e artigiani i tipi sono quelli di `modules/attivita/tipi.ts` |
| `descrizione`, `indirizzo`, `telefono`, `email`, `sito` | no | |
| `orari` | no | Orari in testo, come li legge una persona |
| `orari_settimana` | no | Orari per calcolare «aperto adesso»: `{"1": [["08:00","13:00"]], …}`, 1 = lunedì, 7 = domenica, più fasce per giorno |
| `tariffa`, `posti` | no | |
| `foto_url`, `foto_credito` | no | Il credito è obbligatorio se c'è la foto |
| `cosa_fare` | no | Pratiche: `[{"titolo": "…", "testo": "…", "documenti": ["…"], "link": "https://…"}]` |
| `fonte_nome`, `fonte_link` | consigliati | Da dove viene il dato |
| `verificato_il` | no | Giorno dell'ultimo controllo alla fonte |
| `da_verificare` | no | `true` (predefinito) o `false` |

```json
{
  "tipo": "luogo",
  "nome": "Ufficio di Stato Civile, Servizi Demografici ed Elettorali",
  "categoria": "ufficio",
  "area": "vivere",
  "sottocategoria": "Anagrafe",
  "castello": "citta",
  "lat": 43.9358,
  "lng": 12.4473,
  "indirizzo": "Via Esempio 1, Città di San Marino",
  "telefono": "+378 0549 000000",
  "orari": "Lunedì–venerdì 8.15–13.30",
  "orari_settimana": { "1": [["08:15", "13:30"]], "2": [["08:15", "13:30"]], "3": [["08:15", "13:30"]], "4": [["08:15", "13:30"]], "5": [["08:15", "13:30"]] },
  "cosa_fare": [
    { "titolo": "Rinnovare la carta d'identità", "testo": "Si prenota e si va allo sportello con la carta vecchia.", "documenti": ["Carta scaduta", "Una foto tessera"] }
  ],
  "fonte_nome": "Portale della PA",
  "fonte_link": "https://www.gov.sm/",
  "verificato_il": "2026-10-14"
}
```

### Un ristorante che su OpenStreetMap manca

I ristoranti arrivano da soli da OpenStreetMap ogni notte, ma i più importanti a volte non ci sono, o ci sono con dati scarsi. Si aggiungono così: un luogo inserito dalla redazione vince sempre, perché l'aggiornamento notturno non duplica un locale entro 60 metri da uno inserito a mano.

```json
{
  "tipo": "luogo",
  "nome": "Nome del ristorante",
  "categoria": "locale",
  "sottocategoria": "ristorante",
  "area": "uscire",
  "castello": "citta",
  "lat": 43.9363,
  "lng": 12.4467,
  "indirizzo": "Via Esempio 2, Città di San Marino",
  "telefono": "+378 0549 000000",
  "sito": "https://esempio.sm",
  "orari": "Pranzo e cena, chiuso il martedì",
  "descrizione": "Cucina sammarinese, terrazza sulla valle.",
  "fonte_nome": "Sito del ristorante",
  "fonte_link": "https://esempio.sm"
}
```

## evento

Quando lo approvi diventa un evento del calendario. Se manca il castello, si prende quello del luogo.

| Campo | Obbligatorio | Cosa contiene |
|---|---|---|
| `titolo` | sì | |
| `inizio` | sì | `"2026-10-17T21:00"` |
| `fine` | no | Non prima di `inizio` |
| `luogo` | no | Nome esatto di un luogo di 739 |
| `castello` | no | |
| `descrizione`, `organizzatore` | no | |
| `per_chi` | no | `Tutti`, `Famiglie e bambini`, `Ragazzi`, `Adulti` o `Professionisti e aziende` (questi ultimi compaiono anche in Lavorare, Fiere e convegni) |
| `prezzo`, `indirizzo`, `contatto` | no | Come nel modulo «Proponi un evento» (`indirizzo` se non c'è un `luogo`) |
| `metri` | no | Metri del check-in, da 0 a 500 (predefinito 20) |
| `fonte_nome`, `fonte_link` | consigliati | |

```json
{
  "tipo": "evento",
  "titolo": "Concerto d'autunno",
  "inizio": "2026-10-24T21:00",
  "fine": "2026-10-24T23:00",
  "luogo": "Cava dei Balestrieri",
  "castello": "citta",
  "organizzatore": "Istituti Culturali",
  "descrizione": "Musica da camera in teatro.",
  "metri": 30,
  "fonte_nome": "Istituti Culturali",
  "fonte_link": "https://www.museidisanmarino.sm/"
}
```

## avviso

Strade chiuse, servizi sospesi, allerte meteo. Compare in Oggi (filtrato per castello) e in Vivere, Avvisi, dal momento `dal` al momento `al`.

| Campo | Obbligatorio | Cosa contiene |
|---|---|---|
| `titolo` | sì | |
| `testo` | no | |
| `tipo_avviso` | no | `strada`, `servizio`, `meteo`, `evento`, `altro` (predefinito) |
| `gravita` | no | `info` (predefinito) o `attenzione` |
| `dal`, `al` | no | Senza `dal` parte quando lo approvi |
| `castello`, `luogo` | no | |
| `lat`, `lng` | no | Se ci sono, l'avviso compare anche sulla mappa |
| `fonte_nome`, `fonte_link` | consigliati | |

```json
{
  "tipo": "avviso",
  "titolo": "Strada chiusa per lavori",
  "testo": "Senso unico alternato con semaforo.",
  "tipo_avviso": "strada",
  "gravita": "attenzione",
  "dal": "2026-10-20T07:00",
  "al": "2026-10-24T18:00",
  "castello": "Serravalle",
  "fonte_nome": "AASLP"
}
```

## contenuto

Bollettino, rubriche, liste, storie e speciali. Quando lo approvi diventa una **bozza** in `/admin/contenuti`, da rileggere e pubblicare (o programmare) da lì.

| Campo | Obbligatorio | Cosa contiene |
|---|---|---|
| `tipo_contenuto` | sì | `bollettino`, `castello_settimana`, `come_si_fa`, `weekend`, `partite_settimana`, `vetta_mese`, `lista`, `storia`, `speciale` |
| `titolo` | sì | Almeno 3 caratteri |
| `slug` | no | Indirizzo della pagina, minuscolo coi trattini; se manca si ricava dal titolo |
| `sommario` | no | Una o due righe |
| `corpo` | no | Testo in Markdown |
| `area`, `castello` | no | |
| `luoghi`, `eventi` | no | Elenchi di nomi (o id) da collegare |
| `foto_url`, `foto_credito` | no | |
| `fonte_nome`, `fonte_link` | no | |

```json
{
  "tipo": "contenuto",
  "tipo_contenuto": "lista",
  "titolo": "Cinque panorami da vedere al tramonto",
  "sommario": "Dove andare quando il sole scende sull'Adriatico.",
  "corpo": "## La Cesta\n\nIl punto più alto, con la vista sulla costa.\n\n## Montale\n\nPiù tranquillo, si arriva a piedi.",
  "area": "uscire",
  "luoghi": ["Torre del Montale"]
}
```

## Un file completo

```json
[
  { "tipo": "avviso", "titolo": "Funivia ferma per manutenzione", "tipo_avviso": "servizio", "dal": "2026-11-03T08:00", "al": "2026-11-05T18:00", "castello": "borgo-maggiore" },
  { "tipo": "evento", "titolo": "Mercatino in piazza", "inizio": "2026-11-08T09:00", "castello": "Borgo Maggiore" }
]
```
