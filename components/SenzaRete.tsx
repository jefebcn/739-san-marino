"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { linguaDi } from "@/lib/lingua";

/** Una riga in cima quando il telefono è senza rete: la pagina è l'ultima copia salvata (public/sw.js). */
export default function SenzaRete() {
  const [offline, setOffline] = useState(false);
  const en = linguaDi(usePathname()) === "en";
  useEffect(() => {
    const aggiorna = () => setOffline(!navigator.onLine);
    aggiorna();
    window.addEventListener("online", aggiorna);
    window.addEventListener("offline", aggiorna);
    return () => {
      window.removeEventListener("online", aggiorna);
      window.removeEventListener("offline", aggiorna);
    };
  }, []);
  if (!offline) return null;
  if (en)
    return (
      <p role="status" className="rounded-xl bg-superficie px-4 py-2.5 text-sm text-testo-2">
        You are offline: this is the copy saved on your phone. In an emergency call <a href="tel:112" className="font-mono font-medium text-segnale underline underline-offset-2">112</a>.
      </p>
    );
  return (
    <p role="status" className="rounded-xl bg-superficie px-4 py-2.5 text-sm text-testo-2">
      Sei senza rete: quello che vedi è salvato sul telefono. Per un&apos;emergenza chiama il <a href="tel:112" className="font-mono font-medium text-segnale underline underline-offset-2">112</a>.
    </p>
  );
}
