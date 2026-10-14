// Service worker di 739 (passi 1.6 e 1.8): notifiche e funzionamento minimo senza rete.
// Registrato da components/RegistraSW.tsx. Cambiare VERSIONE quando cambia questo file.
const VERSIONE = "739-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

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
