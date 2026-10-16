"use client";

import { useEffect, useState } from "react";
import { Icona } from "./Icona";

/**
 * «Condividi» (passo 1.7): sul telefono apre il pannello di condivisione (WhatsApp, Instagram, messaggi)
 * con la Web Share API; dove non c'è, copia il link. L'anteprima del link la fa opengraph-image.tsx.
 */
export default function Condividi({ titolo, testo, percorso, className = "", lingua = "it" }: { titolo: string; testo?: string; percorso: string; className?: string; lingua?: "it" | "en" }) {
  const en = lingua === "en";
  const [condivisione, setCondivisione] = useState(false);
  const [copiato, setCopiato] = useState(false);

  useEffect(() => setCondivisione(typeof navigator !== "undefined" && "share" in navigator), []);

  const condividi = async () => {
    const url = new URL(percorso, window.location.origin).href;
    if (condivisione) {
      try {
        await navigator.share({ title: titolo, text: testo, url });
        return;
      } catch (e) {
        // Annullato da chi condivide: niente da fare
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      window.prompt(en ? "Copy the link" : "Copia il link", url);
    }
  };

  return (
    <button type="button" onClick={condividi} className={`bottone secondario premibile ${className}`} aria-live="polite">
      <Icona nome={condivisione ? "condividi" : "collegamento"} size={20} />
      {en ? (copiato ? "Link copied" : condivisione ? "Share" : "Copy the link") : copiato ? "Link copiato" : condivisione ? "Condividi" : "Copia il link"}
    </button>
  );
}
