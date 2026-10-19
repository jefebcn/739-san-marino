// I sentieri di San Marino da OpenStreetMap, per la sezione Itinerari.
//
//   NODE_USE_ENV_PROXY=1 node scripts/sentieri.mjs [--cache cartella]
//
// Legge i percorsi escursionistici (relazioni route=hiking) da Waymarked Trails, il servizio che li ricava ogni giorno
// da OpenStreetMap: elenco della zona, poi la scheda di ognuno con la geometria (un percorso al secondo).
// Tiene quelli con almeno metà della lunghezza dentro San Marino (confini dei castelli in scripts/dati), li semplifica,
// trova i castelli che attraversano e i tratti mancanti, e chiede la quota a OpenTopoData (modello EU-DEM 25 m,
// al massimo 100 punti per percorso, una richiesta al secondo) per il profilo e la salita.
// Scrive modules/itinerari/dati/sentieri.json: si rilancia quando cambiano i sentieri su OSM (una volta l'anno basta).
// Dati © OpenStreetMap contributors, ODbL. Quote: EU-DEM (Copernicus), tramite OpenTopoData.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nome) => {
  const i = process.argv.indexOf(nome);
  return i > 0 ? process.argv[i + 1] : null;
};
const cache = arg("--cache");
if (cache) mkdirSync(cache, { recursive: true });

const WMT = "https://hiking.waymarkedtrails.org/api/v1";
const QUOTE = "https://api.opentopodata.org/v1/eudem25m";
const R = 6378137;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const intestazioni = { "User-Agent": "739SanMarino/1.0 (https://739-san-marino.vercel.app)" };

async function leggi(url, file) {
  if (cache && file && existsSync(join(cache, file))) return JSON.parse(readFileSync(join(cache, file), "utf8"));
  const r = await fetch(url, { headers: intestazioni });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const j = await r.json();
  if (cache && file) writeFileSync(join(cache, file), JSON.stringify(j));
  await pausa(1100);
  return j;
}

// Mercatore (EPSG:3857) -> gradi
const gradi = ([x, y]) => [(x / R) * (180 / Math.PI), (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI)];
const mercatore = (lng, lat) => [R * (lng * Math.PI / 180), R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))];
const metri = (a, b) => {
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180) * 111320;
  const dy = (b[1] - a[1]) * 110540;
  return Math.hypot(dx, dy);
};

// Confini dei castelli (castelli_confini, migrazione 0040, semplificati)
const confini = JSON.parse(readFileSync(join(radice, "scripts/dati/confini-castelli.json"), "utf8"));
function dentro(x, y, anello) {
  let c = false;
  for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
    const [xi, yi] = anello[i], [xj, yj] = anello[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const castelloDi = ([x, y]) => confini.find((c) => c.g.coordinates.some((p) => dentro(x, y, p[0])))?.id ?? null;

// Douglas-Peucker in metri
function semplifica(punti, tolleranza) {
  if (punti.length < 3) return punti;
  const tieni = new Uint8Array(punti.length);
  tieni[0] = tieni[punti.length - 1] = 1;
  const pila = [[0, punti.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanzaSegmento(punti[i], punti[a], punti[b]);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tolleranza) { tieni[idx] = 1; pila.push([a, idx], [idx, b]); }
  }
  return punti.filter((_, i) => tieni[i]);
}
function distanzaSegmento(p, a, b) {
  const k = Math.cos((a[1] * Math.PI) / 180) * 111320;
  const [px, py, ax, ay, bx, by] = [p[0] * k, p[1] * 110540, a[0] * k, a[1] * 110540, b[0] * k, b[1] * 110540];
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Le vie di una relazione in ordine, unite in tratti continui (Waymarked le dà già ordinate; si girano quelle al contrario)
function tratti(route) {
  const vie = [];
  (function giu(n) {
    if (n.ways) for (const w of n.ways) vie.push(w.geometry.coordinates.map(gradi));
    for (const k of ["main", "appendices"]) for (const m of n[k] ?? []) giu(m);
  })(route);
  const out = [];
  for (let v of vie) {
    const t = out.at(-1);
    if (t) {
      const fine = t.at(-1);
      const [a, b] = [metri(fine, v[0]), metri(fine, v.at(-1))];
      if (b < a && b < 30) v = [...v].reverse();
      if (Math.min(a, b) < 30) { t.push(...v.slice(1)); continue; }
      // La prima via del tratto può essere al contrario
      if (metri(t[0], v[0]) < 30 || metri(t[0], v.at(-1)) < 30) {
        const inizio = metri(t[0], v.at(-1)) < 30 ? v : [...v].reverse();
        t.unshift(...inizio.slice(0, -1));
        continue;
      }
    }
    out.push([...v]);
  }
  return out;
}

// Unisce i tratti che si toccano anche se nella relazione sono in ordine sparso (girandoli se serve)
function unisci(parti) {
  const out = parti.map((p) => [...p]);
  for (let cambiato = true; cambiato;) {
    cambiato = false;
    for (let i = 0; i < out.length && !cambiato; i++) {
      for (let j = i + 1; j < out.length && !cambiato; j++) {
        const [a, b] = [out[i], out[j]];
        let nuovo = null;
        if (metri(a.at(-1), b[0]) < 30) nuovo = [...a, ...b.slice(1)];
        else if (metri(a.at(-1), b.at(-1)) < 30) nuovo = [...a, ...[...b].reverse().slice(1)];
        else if (metri(b.at(-1), a[0]) < 30) nuovo = [...b, ...a.slice(1)];
        else if (metri(a[0], b[0]) < 30) nuovo = [...[...b].reverse(), ...a.slice(1)];
        if (nuovo) {
          out.splice(j, 1);
          out[i] = nuovo;
          cambiato = true;
        }
      }
    }
  }
  return out;
}

const lunghezza = (linea) => linea.slice(1).reduce((s, p, i) => s + metri(linea[i], p), 0);

// Punti a distanza regolare lungo una linea
function campiona(linea, n) {
  const L = lunghezza(linea);
  const passo = L / (n - 1);
  const out = [[linea[0], 0]];
  let fatto = 0, prossimo = passo;
  for (let i = 1; i < linea.length && out.length < n - 1; i++) {
    const seg = metri(linea[i - 1], linea[i]);
    while (fatto + seg >= prossimo && out.length < n - 1) {
      const t = (prossimo - fatto) / seg;
      out.push([[linea[i - 1][0] + t * (linea[i][0] - linea[i - 1][0]), linea[i - 1][1] + t * (linea[i][1] - linea[i - 1][1])], prossimo]);
      prossimo += passo;
    }
    fatto += seg;
  }
  out.push([linea.at(-1), L]);
  return out;
}

async function quote(punti) {
  const locs = punti.map(([p]) => `${p[1].toFixed(5)},${p[0].toFixed(5)}`).join("|");
  for (let prova = 0; prova < 3; prova++) {
    const r = await fetch(`${QUOTE}?locations=${locs}`, { headers: intestazioni });
    await pausa(1100);
    if (r.ok) {
      const j = await r.json();
      if (j.status === "OK") return j.results.map((x) => x.elevation);
    }
    await pausa(3000);
  }
  return null;
}

const slugDi = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const difficolta = (t) => {
  const d = [t["description:it"], t.description, t["description:en"]].filter(Boolean).join(" ").toLowerCase();
  if (/medio[\s-]*difficil|medium-hard/.test(d)) return "medio-difficile";
  if (/medio[\s-]*facil|medium-easy/.test(d)) return "medio-facile";
  if (/difficil|challenging|hard/.test(d)) return "impegnativo";
  if (/media|medium/.test(d)) return "media";
  if (/facile|easy/.test(d)) return "facile";
  return null;
};
const nonSegnalato = (t) => /non segnalat|not mark/i.test([t["description:it"], t.description, t["description:en"]].join(" "));
const descrizione = (t) => {
  const d = t["description:it"] ?? t.description ?? null;
  if (!d) return null;
  // Le descrizioni che dicono solo difficoltà o segnaletica le mostra la pagina in altro modo
  const resto = d.replace(/(percorso|sentiero|route) non (segnalato|market?d?)/gi, "").replace(/(difficolt[aà]|difficulty):?\s*[\w\s-]+/gi, "").replace(/^[\s\-–]+|[\s\-–]+$/g, "");
  return resto.length > 3 && !/^(medio[\s-]*facile|medio[\s-]*difficile|facile|media)$/i.test(resto) ? resto : null;
};
const durata = (t) => {
  const d = t.duration;
  if (!d) return null;
  const m = d.match(/^(\d{1,2}):(\d{2})$/) ?? d.match(/^(\d+)\s*h$/);
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : null;
};
const sito = (t) => {
  for (const u of [t.website, t["contact:website"]]) {
    if (u && /sanmarinoexperience\.com|territorio\.sm/.test(u)) return u.replace(/^http:/, "https:");
  }
  return null;
};
const mappaPdf = (t) => [t["source:file"], t.website].find((u) => u?.startsWith("https://ebikexperience.it/") && u.endsWith(".pdf")) ?? null;

// 1. I percorsi della zona
const [o, s] = mercatore(12.39, 43.88), [e, n] = mercatore(12.53, 44.0);
const elenco = (await leggi(`${WMT}/list/by_area?bbox=${o.toFixed(0)},${s.toFixed(0)},${e.toFixed(0)},${n.toFixed(0)}&limit=200`, "elenco.json")).results;
console.log(`${elenco.length} percorsi nella zona`);

const sentieri = [];
for (const voce of elenco) {
  const d = await leggi(`${WMT}/details/relation/${voce.id}`, `r${voce.id}.json`);
  const t = d.tags ?? {};
  // Il tratto più lungo per primo: lì sono la partenza e il profilo
  const parti = unisci(tratti(d.route)).sort((x, y) => lunghezza(y) - lunghezza(x));
  const tot = parti.reduce((s, p) => s + lunghezza(p), 0);
  if (!tot) continue;

  // Quanto sta dentro San Marino e in quali castelli
  const perCastello = {};
  let dentroSm = 0;
  for (const p of parti) for (let i = 1; i < p.length; i++) {
    const L = metri(p[i - 1], p[i]);
    const c = castelloDi([(p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2]);
    if (c) { dentroSm += L; perCastello[c] = (perCastello[c] ?? 0) + L; }
  }
  if (dentroSm / tot < 0.5) continue;
  const nome = d.name ?? t.name;
  if (!nome) continue;

  const linee = parti.map((p) => semplifica(p, 4).map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))]));
  const tuttiPunti = linee.flat();
  const bbox = [
    Math.min(...tuttiPunti.map((p) => p[0])), Math.min(...tuttiPunti.map((p) => p[1])),
    Math.max(...tuttiPunti.map((p) => p[0])), Math.max(...tuttiPunti.map((p) => p[1])),
  ];
  // Gli altri tratti sono rami (un capo tocca un altro tratto) o pezzi staccati, cioè tratti mancanti su OSM
  const tocca = (p, o) => [p[0], p.at(-1)].some((q) => o.some((_, k) => k > 0 && distanzaSegmento(q, o[k - 1], o[k]) < 30));
  const rete = new Set([0]);
  for (let nuovi = true; nuovi;) {
    nuovi = false;
    parti.forEach((p, i) => {
      if (!rete.has(i) && [...rete].some((j) => tocca(p, parti[j]) || tocca(parti[j], p))) { rete.add(i); nuovi = true; }
    });
  }
  const staccati = rete.size < parti.length;
  const principale = parti[0];
  const continuo = parti.length === 1 || lunghezza(principale) / tot >= 0.7;

  // Quote: 100 punti su tutto il percorso (proporzionati alla lunghezza dei tratti)
  let profilo = null, salita = null, discesa = null, qmin = null, qmax = null;
  // Con un tratto principale: 80 punti lì (il profilo) e 20 sugli altri tratti (per la quota più bassa e più alta)
  const altri = tot - lunghezza(principale);
  const campioni = parti.length === 1 ? campiona(principale, 100)
    : continuo ? [...campiona(principale, 80), ...parti.slice(1).flatMap((p) => campiona(p, Math.max(2, Math.round((20 * lunghezza(p)) / altri))))]
    : parti.flatMap((p) => campiona(p, Math.max(2, Math.round((100 * lunghezza(p)) / tot))));
  const nProfilo = parti.length === 1 ? 100 : 80;
  const fileQuote = cache ? join(cache, `q${voce.id}.json`) : null;
  let q = fileQuote && existsSync(fileQuote) ? JSON.parse(readFileSync(fileQuote, "utf8")) : null;
  if (!q) {
    q = await quote(campioni.slice(0, 100));
    if (q && fileQuote) writeFileSync(fileQuote, JSON.stringify(q));
  }
  if (q && q.every((x) => typeof x === "number")) {
    qmin = Math.round(Math.min(...q));
    qmax = Math.round(Math.max(...q));
    if (continuo) {
      // Media su tre punti per togliere il rumore del modello, poi le salite e le discese
      const qp = q.slice(0, nProfilo);
      const liscio = qp.map((_, i) => (qp[Math.max(0, i - 1)] + qp[i] + qp[Math.min(qp.length - 1, i + 1)]) / 3);
      salita = 0; discesa = 0;
      for (let i = 1; i < liscio.length; i++) {
        const dz = liscio[i] - liscio[i - 1];
        if (dz > 0) salita += dz; else discesa -= dz;
      }
      salita = Math.round(salita / 5) * 5;
      discesa = Math.round(discesa / 5) * 5;
      profilo = campioni.slice(0, qp.length).map(([, dist], i) => [Math.round(dist), Math.round(qp[i])]);
    }
  }

  const numero = t.ref ?? null;
  sentieri.push({
    id: voce.id,
    slug: slugDi(`${numero ?? ""} ${nome}`),
    numero,
    nome,
    da: t.from ?? null,
    a: t.to ?? null,
    via: t.via ?? null,
    lunghezza_m: Math.round(tot),
    anello: t.roundtrip === "yes",
    continuo,
    tratti_mancanti: staccati || Boolean(t.fixme) || /da mappare|da unire/i.test(t.note ?? ""),
    segnalato: nonSegnalato(t) ? false : null,
    difficolta: difficolta(t),
    durata_min: durata(t),
    descrizione: descrizione(t),
    gestore: t.operator ?? null,
    sito: sito(t),
    mappa_pdf: mappaPdf(t),
    castelli: Object.entries(perCastello).sort((a, b) => b[1] - a[1]).filter(([, L]) => L >= 100 || L / tot > 0.1).map(([c]) => Number(c)),
    in_sm: Math.round((dentroSm / tot) * 100) / 100,
    quota_min: qmin,
    quota_max: qmax,
    salita_m: salita,
    discesa_m: discesa,
    profilo,
    inizio: linee[0][0],
    bbox: bbox.map((x) => Number(x.toFixed(5))),
    linee,
  });
  console.log(`${numero ?? "-"} ${nome}: ${Math.round(tot)} m, ${parti.length} ${parti.length === 1 ? "tratto" : "tratti"}${staccati ? " (staccati)" : ""}${continuo ? ", profilo" : ""}, quote ${qmin ?? "?"}-${qmax ?? "?"}${salita !== null ? `, salita ${salita}` : ""}`);
}

// In ordine di numero (2, 2b, 2d, 3, …, 10, 10a…)
const chiave = (s) => {
  const m = (s.numero ?? "999").match(/^(\d+)(.*)$/);
  return m ? [Number(m[1]), m[2]] : [999, s.numero];
};
sentieri.sort((a, b) => {
  const [na, sa] = chiave(a), [nb, sb] = chiave(b);
  return na - nb || String(sa).localeCompare(String(sb)) || a.nome.localeCompare(b.nome);
});
// Slug unici
const visti = new Set();
for (const s of sentieri) {
  if (visti.has(s.slug)) s.slug = `${s.slug}-${s.id}`;
  visti.add(s.slug);
}

const uscita = join(radice, "modules/itinerari/dati/sentieri.json");
mkdirSync(dirname(uscita), { recursive: true });
writeFileSync(uscita, JSON.stringify({ aggiornato_il: new Date().toISOString().slice(0, 10), sentieri }));
console.log(`${sentieri.length} sentieri in ${uscita} (${Math.round(readFileSync(uscita).length / 1024)} KB)`);
