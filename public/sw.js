// Service worker di 739 (passi 1.6 e 1.8): notifiche e funzionamento minimo senza rete.
// Registrato da components/RegistraSW.tsx. Cambiare VERSIONE quando cambia questo file.
const VERSIONE = "739-v3";
const PAGINE = `${VERSIONE}-pagine`;
const STATICI = `${VERSIONE}-statici`;
const RISORSE = `${VERSIONE}-risorse`;

// Salvate subito all'installazione: Oggi e la pagina senza rete (numeri di emergenza e farmacie)
const DA_SALVARE = ["/", "/offline"];
// Mai salvate: pannelli, API, check-in
const MAI = [/^\/admin/, /^\/api\//, /\/checkin/];

/** Salva una pagina e i file di /_next/static che la fanno funzionare (stili, codice, caratteri) */
async function salvaPagina(percorso) {
  const risposta = await fetch(percorso, { cache: "no-store" });
  if (!risposta.ok) return;
  const html = await risposta.clone().text();
  await (await caches.open(PAGINE)).put(percorso, risposta);
  const file = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
  const statici = await caches.open(STATICI);
  await Promise.all(file.map((f) => statici.match(f).then((c) => c || statici.add(f)).catch(() => {})));
  // Icone e immagini dell'app citate nella pagina (la barra in basso, il +, le aree)
  const immagini = [...new Set(html.match(/\/(?:icone|icone-colore|icons|castelli|brand)\/[^"'\s)\\?]+/g) || [])];
  const risorse = await caches.open(RISORSE);
  await Promise.all(immagini.map((f) => risorse.match(f).then((c) => c || risorse.add(f)).catch(() => {})));
}

async function taglia(nome, massimo) {
  const cache = await caches.open(nome);
  const chiavi = await cache.keys();
  await Promise.all(chiavi.slice(0, Math.max(0, chiavi.length - massimo)).map((k) => cache.delete(k)));
}

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(Promise.all(DA_SALVARE.map((p) => salvaPagina(p).catch(() => {}))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomi) => Promise.all(nomi.filter((n) => !n.startsWith(`${VERSIONE}-`)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// ——— Senza rete (passo 1.8) ———
// Pagine: prima la rete (e si salva la copia); se manca o tarda più di 5 secondi, la copia salvata; se non c'è, /offline.
// File di /_next/static: hanno il nome che cambia a ogni versione, quindi prima la copia salvata.
// Immagini e icone dell'app: la copia salvata subito, aggiornata in sottofondo.
self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (MAI.some((r) => r.test(url.pathname))) return;

  if (req.mode === "navigate") {
    evento.respondWith(pagina(evento, req, url));
    return;
  }
  // Le richieste interne di Next tra una pagina e l'altra: senza rete falliscono e Next ricarica la pagina, che passa di qui
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(
      caches.open(STATICI).then(async (cache) => {
        const salvata = await cache.match(req);
        if (salvata) return salvata;
        const risposta = await fetch(req);
        if (risposta.ok) cache.put(req, risposta.clone()).then(() => taglia(STATICI, 200));
        return risposta;
      }),
    );
    return;
  }

  if (/^\/(icone|icone-colore|icons|castelli|mascotte|brand)\//.test(url.pathname) || url.pathname.startsWith("/_next/image")) {
    evento.respondWith(
      caches.open(RISORSE).then(async (cache) => {
        const salvata = await cache.match(req);
        const dallaRete = fetch(req)
          .then((r) => {
            if (r.ok) cache.put(req, r.clone()).then(() => taglia(RISORSE, 120));
            return r;
          })
          .catch(() => salvata);
        return salvata || dallaRete;
      }),
    );
  }
});

async function pagina(evento, req, url) {
  const cache = await caches.open(PAGINE);
  const chiave = url.pathname;
  const salvata = await cache.match(chiave);
  const dallaRete = fetch(req).then((r) => {
    if (r.ok && !r.redirected) {
      evento.waitUntil(cache.put(chiave, r.clone()).then(() => taglia(PAGINE, 30)));
      if (chiave === "/") evento.waitUntil(salvaPagina("/offline").catch(() => {}));
    }
    return r;
  });
  try {
    if (!salvata) return await dallaRete;
    // Rete lenta in montagna: dopo 5 secondi la copia salvata, la rete intanto aggiorna la copia
    const attesa = new Promise((ok) => setTimeout(() => ok(salvata), 5000));
    return await Promise.race([dallaRete.catch(() => salvata), attesa]);
  } catch {
    return salvata || (await cache.match("/offline")) || new Response("Sei senza rete.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

// ——— Notifiche (passo 1.6): il messaggio arriva da /api/notifiche ———
self.addEventListener("push", (evento) => {
  let dati = {};
  try {
    dati = evento.data ? evento.data.json() : {};
  } catch {
    dati = { corpo: evento.data ? evento.data.text() : "" };
  }
  evento.waitUntil(
    self.registration.showNotification(dati.titolo || "739 San Marino", {
      body: dati.corpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-64.png",
      lang: "it",
      tag: dati.tag || "739",
      data: { url: dati.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL(evento.notification.data?.url || "/", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) {
        if ("focus" in f) {
          f.navigate(url);
          return f.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
