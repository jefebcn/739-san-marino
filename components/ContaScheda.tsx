"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * I numeri della scheda di un'attività (739 Pro, migrazione 0035): una visita per scheda e per sessione del browser,
 * più i tocchi sui link con `data-conta` (telefono, indicazioni, sito, email, menu, prenota). Solo totali per giorno.
 */
export default function ContaScheda({ luogo }: { luogo: string }) {
  useEffect(() => {
    const conta = (tipo: string) => supabaseBrowser().rpc("conta_scheda", { p_luogo: luogo, p_tipo: tipo }).then(() => {}, () => {});
    const chiave = `739-vista-${luogo}`;
    try {
      if (!sessionStorage.getItem(chiave)) {
        sessionStorage.setItem(chiave, "1");
        conta("visita");
      }
    } catch {
      conta("visita");
    }
    const tocco = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-conta]");
      if (el?.dataset.conta) conta(el.dataset.conta);
    };
    document.addEventListener("click", tocco);
    return () => document.removeEventListener("click", tocco);
  }, [luogo]);
  return null;
}
