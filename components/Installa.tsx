"use client";

import { useEffect, useState } from "react";

type EventoInstalla = Event & { prompt: () => Promise<void> };

export default function Installa() {
  const [evento, setEvento] = useState<EventoInstalla | null>(null);
  const [ios, setIos] = useState(false);
  const [visibile, setVisibile] = useState(false);

  useEffect(() => {
    const giaApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let chiuso = false;
    try {
      chiuso = localStorage.getItem("739-installa-chiuso") === "1";
    } catch {}
    if (giaApp || chiuso) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos) setVisibile(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalla);
      setVisibile(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visibile) return null;

  const chiudi = () => {
    setVisibile(false);
    try {
      localStorage.setItem("739-installa-chiuso", "1");
    } catch {}
  };

  return (
    <div className="installa" role="region" aria-label="Installa l'app">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>Installa 739</strong>
        <span>
          {ios ? "Tocca Condividi, poi «Aggiungi alla schermata Home»." : "Aggiungila alla schermata Home: si apre come un'app."}
        </span>
      </div>
      {evento ? (
        <button
          type="button"
          className="pulsante"
          onClick={async () => {
            await evento.prompt();
            chiudi();
          }}
        >
          Installa
        </button>
      ) : null}
      <button type="button" className="chiudi" aria-label="Chiudi" onClick={chiudi}>
        ×
      </button>
    </div>
  );
}
