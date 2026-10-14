"use client";

import { useEffect, useState } from "react";

/** L'ora attuale, aggiornata ogni minuto. È null al primo disegno: così server e telefono non litigano sull'ora. */
export function useAdesso() {
  const [ora, setOra] = useState<Date | null>(null);
  useEffect(() => {
    setOra(new Date());
    const t = setInterval(() => setOra(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ora;
}
