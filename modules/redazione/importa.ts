// Validazione dei file JSON incollati in /admin/importa (formato in docs/formato-importazione.md).
// Trasforma i riferimenti scritti a parole (castello, luogo, eventi collegati) negli id del database
// e dice, elemento per elemento, cosa non va. Nessuna chiamata di rete: si può provare senza database.

import { TIPI } from "@/lib/rubriche";

export type Riferimenti = {
  castelli: { id: number; nome: string; slug: string }[];
  luoghi: { id: string; nome: string }[];
  eventi: { id: string; nome: string }[];
};

export type Esito = {
  indice: number;
  tipo: string;
  nome: string;
  /** Elemento pronto per la coda (solo se valido) */
  pronto: Record<string, unknown> | null;
  errori: string[];
  avvisi: string[];
};

const CATEGORIE_LUOGO = ["luogo", "parcheggio", "farmacia", "impianto", "trasporti", "locale", "servizio", "cultura", "panorama", "bagni", "acqua", "ricarica", "ufficio", "salute", "posta", "banca", "carburante", "scuola", "chiesa", "negozio", "azienda", "professionista", "artigiano"];
const AREE = ["vivere", "uscire", "sport", "comunita", "lavorare"];
const TIPI_AVVISO = ["strada", "servizio", "meteo", "evento", "altro"];
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_ORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/;
const ORA = /^([01]\d|2[0-4]):[0-5]\d$/;

const pulisci = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const testo = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Da testo (array, oppure oggetto con "elementi") a elenco di elementi, con un messaggio chiaro se il JSON è rotto. */
export function leggiJson(grezzo: string): { elementi: unknown[] | null; errore: string | null } {
  if (!grezzo.trim()) return { elementi: null, errore: "Incolla il contenuto del file JSON." };
  try {
    const v = JSON.parse(grezzo);
    if (Array.isArray(v)) return { elementi: v, errore: null };
    if (v && Array.isArray(v.elementi)) return { elementi: v.elementi, errore: null };
    return { elementi: null, errore: "Il file deve contenere un elenco di elementi tra parentesi quadre [ … ]." };
  } catch (e) {
    return { elementi: null, errore: `Il JSON non si legge: ${e instanceof Error ? e.message : "errore"}. Controlla virgole e virgolette.` };
  }
}

export function valida(elementi: unknown[], rif: Riferimenti): Esito[] {
  const castello = (v: unknown, errori: string[]) => {
    if (v === undefined || v === null || v === "") return null;
    const c = rif.castelli.find((x) => x.id === Number(v) || x.slug === v || pulisci(x.nome) === pulisci(String(v)));
    if (!c) errori.push(`Castello «${v}» sconosciuto: usa il nome o lo slug (es. borgo-maggiore).`);
    return c?.id ?? null;
  };
  const luogo = (v: unknown, errori: string[]) => {
    if (!v) return null;
    if (typeof v === "string" && ID.test(v)) return v;
    const l = rif.luoghi.find((x) => pulisci(x.nome) === pulisci(String(v)));
    if (!l) errori.push(`Luogo «${v}» non trovato tra i luoghi di 739: scrivi il nome esatto o importalo prima.`);
    return l?.id ?? null;
  };
  const collegati = (v: unknown, elenco: { id: string; nome: string }[], cosa: string, errori: string[]) => {
    if (v === undefined) return [];
    if (!Array.isArray(v)) {
      errori.push(`«${cosa}» deve essere un elenco.`);
      return [];
    }
    return v
      .map((x) => {
        if (typeof x === "string" && ID.test(x)) return x;
        const t = elenco.find((y) => pulisci(y.nome).startsWith(pulisci(String(x))));
        if (!t) errori.push(`${cosa === "luoghi" ? "Luogo" : "Evento"} collegato «${x}» non trovato.`);
        return t?.id ?? null;
      })
      .filter((x): x is string => Boolean(x));
  };
  const url = (v: unknown, campo: string, errori: string[]) => {
    const t = testo(v);
    if (t && !/^https?:\/\//.test(t)) errori.push(`«${campo}» deve iniziare con https://`);
    return t;
  };
  const quando = (v: unknown, campo: string, errori: string[], obbligatorio = false) => {
    const t = testo(v);
    if (!t) {
      if (obbligatorio) errori.push(`Manca «${campo}» (es. "2026-10-17T21:00", ora di San Marino).`);
      return null;
    }
    if (!DATA_ORA.test(t) || isNaN(new Date(t.length === 16 ? `${t}:00Z` : t).getTime())) errori.push(`«${campo}» non è una data valida: scrivi "2026-10-17T21:00".`);
    return t;
  };

  return elementi.map((grezzo, indice) => {
    const e = (grezzo && typeof grezzo === "object" ? grezzo : {}) as Record<string, unknown>;
    const errori: string[] = [];
    const avvisi: string[] = [];
    const tipo = String(e.tipo ?? "");
    const nome = testo(e.titolo) ?? testo(e.nome) ?? `Elemento ${indice + 1}`;
    let pronto: Record<string, unknown> = {};

    if (tipo === "luogo") {
      const categoria = testo(e.categoria);
      if (!testo(e.nome)) errori.push("Manca «nome».");
      if (!categoria || !CATEGORIE_LUOGO.includes(categoria)) errori.push(`«categoria» deve essere una di: ${CATEGORIE_LUOGO.join(", ")}.`);
      const lat = e.lat === undefined ? null : Number(e.lat);
      const lng = e.lng === undefined ? null : Number(e.lng);
      if ((lat === null) !== (lng === null)) errori.push("Servono sia «lat» sia «lng».");
      if (lat !== null && (isNaN(lat) || lat < 43.85 || lat > 44.0 || lng === null || isNaN(lng) || lng < 12.38 || lng > 12.53)) errori.push("Le coordinate non cadono a San Marino.");
      if (lat === null) avvisi.push("Senza coordinate: si potrà solo aggiornare un luogo che esiste già con lo stesso nome e castello.");
      if (e.area !== undefined && !AREE.includes(String(e.area))) errori.push(`«area» deve essere una di: ${AREE.join(", ")}.`);
      if (e.orari_settimana !== undefined) {
        const o = e.orari_settimana as Record<string, unknown>;
        const ok = o && typeof o === "object" && Object.entries(o).every(([g, fasce]) => /^[1-7]$/.test(g) && Array.isArray(fasce) && fasce.every((f) => Array.isArray(f) && f.length === 2 && f.every((x) => ORA.test(String(x)))));
        if (!ok) errori.push('«orari_settimana» va scritto così: {"1": [["08:00","13:00"]], …} con 1 = lunedì.');
      }
      if (e.cosa_fare !== undefined && !(Array.isArray(e.cosa_fare) && e.cosa_fare.every((p) => p && typeof p === "object" && testo((p as Record<string, unknown>).titolo)))) {
        errori.push("«cosa_fare» è un elenco di pratiche, ognuna con almeno «titolo».");
      }
      if (e.verificato_il !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(e.verificato_il))) errori.push("«verificato_il» va scritto come 2026-10-14.");
      if (testo(e.foto_url) && !testo(e.foto_credito)) errori.push("C'è una foto senza «foto_credito».");
      if (!testo(e.fonte_nome)) avvisi.push("Senza «fonte_nome»: ogni dato dovrebbe avere una fonte.");
      pronto = {
        nome: testo(e.nome), categoria, lat, lng, castello_id: castello(e.castello ?? e.castello_id, errori),
        descrizione: testo(e.descrizione), indirizzo: testo(e.indirizzo), telefono: testo(e.telefono), orari: testo(e.orari),
        orari_settimana: e.orari_settimana ?? null, tariffa: testo(e.tariffa), posti: e.posti ?? null,
        area: testo(e.area), sottocategoria: testo(e.sottocategoria), sito: url(e.sito, "sito", errori), email: testo(e.email),
        foto_url: url(e.foto_url, "foto_url", errori), foto_credito: testo(e.foto_credito),
        fonte_nome: testo(e.fonte_nome), fonte_link: url(e.fonte_link, "fonte_link", errori),
        verificato_il: testo(e.verificato_il), cosa_fare: e.cosa_fare ?? null,
        da_verificare: typeof e.da_verificare === "boolean" ? e.da_verificare : true,
      };
    } else if (tipo === "evento") {
      if (!testo(e.titolo)) errori.push("Manca «titolo».");
      const inizio = quando(e.inizio, "inizio", errori, true);
      const fine = quando(e.fine, "fine", errori);
      if (inizio && fine && fine < inizio) errori.push("«fine» è prima di «inizio».");
      const metri = e.metri === undefined ? 20 : Number(e.metri);
      if (isNaN(metri) || metri < 0 || metri > 500) errori.push("«metri» va da 0 a 500.");
      if (testo(e.per_chi) && String(e.per_chi).trim().length > 60) errori.push("«per_chi» è troppo lungo (al massimo 60 caratteri).");
      pronto = {
        titolo: testo(e.titolo), descrizione: testo(e.descrizione), inizio, fine,
        luogo_id: luogo(e.luogo ?? e.luogo_id, errori), castello_id: castello(e.castello ?? e.castello_id, errori),
        organizzatore: testo(e.organizzatore), metri, fonte_nome: testo(e.fonte_nome), fonte_link: url(e.fonte_link, "fonte_link", errori),
        per_chi: testo(e.per_chi), prezzo: testo(e.prezzo), indirizzo: testo(e.indirizzo), contatto: testo(e.contatto),
      };
    } else if (tipo === "avviso") {
      if (!testo(e.titolo)) errori.push("Manca «titolo».");
      const t = String(e.tipo_avviso ?? "altro");
      if (!TIPI_AVVISO.includes(t)) errori.push(`«tipo_avviso» deve essere uno di: ${TIPI_AVVISO.join(", ")}.`);
      const gravita = String(e.gravita ?? "info");
      if (!["info", "attenzione"].includes(gravita)) errori.push("«gravita» è info oppure attenzione.");
      const dal = quando(e.dal, "dal", errori);
      const al = quando(e.al, "al", errori);
      if (dal && al && al < dal) errori.push("«al» è prima di «dal».");
      if (!dal) avvisi.push("Senza «dal»: l'avviso parte quando lo approvi.");
      pronto = {
        titolo: testo(e.titolo), testo: testo(e.testo), tipo_avviso: t, gravita, dal, al,
        castello_id: castello(e.castello ?? e.castello_id, errori), luogo_id: luogo(e.luogo ?? e.luogo_id, errori),
        lat: e.lat ?? null, lng: e.lng ?? null, fonte_nome: testo(e.fonte_nome), fonte_link: url(e.fonte_link, "fonte_link", errori),
      };
    } else if (tipo === "contenuto") {
      const t = String(e.tipo_contenuto ?? "");
      if (!(t in TIPI)) errori.push(`«tipo_contenuto» deve essere uno di: ${Object.keys(TIPI).join(", ")}.`);
      if (!testo(e.titolo) || String(e.titolo).trim().length < 3) errori.push("Manca «titolo» (almeno 3 caratteri).");
      if (e.slug !== undefined && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(e.slug))) errori.push("«slug» in minuscolo con i trattini, es. il-weekend-dalla-vetta.");
      if (e.area !== undefined && !AREE.includes(String(e.area))) errori.push(`«area» deve essere una di: ${AREE.join(", ")}.`);
      if (testo(e.foto_url) && !testo(e.foto_credito)) errori.push("C'è una foto senza «foto_credito».");
      if (!testo(e.corpo)) avvisi.push("Senza «corpo»: il testo andrà scritto in /admin/contenuti.");
      pronto = {
        tipo_contenuto: t, titolo: testo(e.titolo), slug: testo(e.slug), sommario: testo(e.sommario), corpo: typeof e.corpo === "string" ? e.corpo : "",
        area: testo(e.area), castello_id: castello(e.castello ?? e.castello_id, errori),
        foto_url: url(e.foto_url, "foto_url", errori), foto_credito: testo(e.foto_credito),
        luoghi: collegati(e.luoghi, rif.luoghi, "luoghi", errori), eventi: collegati(e.eventi, rif.eventi, "eventi", errori),
        fonte_nome: testo(e.fonte_nome), fonte_link: url(e.fonte_link, "fonte_link", errori),
      };
    } else {
      errori.push(`«tipo» deve essere luogo, evento, avviso o contenuto${tipo ? ` (c'è «${tipo}»)` : ""}.`);
    }

    // Via i campi vuoti: la coda conserva solo quello che c'è
    const pulito = Object.fromEntries(Object.entries(pronto).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));
    return { indice, tipo, nome, pronto: errori.length ? null : { tipo, ...pulito }, errori, avvisi };
  });
}
