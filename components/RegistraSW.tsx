"use client";

import { useEffect } from "react";

/** Registra il service worker (public/sw.js): notifiche e funzionamento minimo senza rete. Non disegna nulla. */
export default function RegistraSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
