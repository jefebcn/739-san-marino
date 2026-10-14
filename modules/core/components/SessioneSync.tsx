"use client";

import { useEffect } from "react";
import type { Castello } from "@/lib/data";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { EVENTO_CASTELLO, impostaCastello, leggiCastello } from "@/components/Castello";
import { caricaProfilo, salvaProfilo } from "../auth";
import { useSessione } from "../store";
import { adessoSM } from "@/lib/orario";

const CHIAVE_ACCESSO = "739-accesso";

/** Un giorno di accesso per persona (migrazione 0021), al massimo una chiamata al giorno da questo telefono. */
function segnaAccesso(id: string) {
  const oggi = `${id}:${adessoSM().data}`;
  try {
    if (localStorage.getItem(CHIAVE_ACCESSO) === oggi) return;
  } catch {
    /* senza localStorage si segna comunque: il database tiene un solo giorno per persona */
  }
  supabaseBrowser()
    .rpc("segna_accesso")
    .then(({ error }) => {
      // Prima della 0021 la funzione non c'è: si riprova alla prossima apertura
      if (error) return;
      try {
        localStorage.setItem(CHIAVE_ACCESSO, oggi);
      } catch {}
    });
}

/**
 * Collega Supabase Auth allo store della sessione. Non disegna nulla: sta nel layout.
 * Tiene anche allineati il castello del profilo e quello scelto sul telefono (localStorage).
 */
export default function SessioneSync({ castelli }: { castelli: Castello[] }) {
  useEffect(() => {
    const db = supabaseBrowser();
    const { accedi, esci, impostaRecupero } = useSessione.getState();

    const carica = async (utente: { id: string; email?: string | null } | null) => {
      if (!utente) return esci();
      const profilo = await caricaProfilo(utente.id);
      accedi({ id: utente.id, email: utente.email ?? null }, profilo);
      segnaAccesso(utente.id);
      // Il castello del profilo vince su quello salvato sul telefono
      const slug = castelli.find((c) => c.id === profilo?.castello_id)?.slug;
      if (slug && slug !== leggiCastello()) impostaCastello(slug);
    };

    db.auth.getSession().then(({ data }) => carica(data.session?.user ?? null));
    const { data } = db.auth.onAuthStateChange((evento, sessione) => {
      if (evento === "PASSWORD_RECOVERY") impostaRecupero(true);
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT" || evento === "USER_UPDATED") {
        // Fuori dal callback: Supabase sconsiglia altre chiamate dentro onAuthStateChange
        setTimeout(() => carica(sessione?.user ?? null), 0);
      }
    });

    // Se cambi castello dalla Home mentre sei connesso, lo salviamo anche nel profilo
    const castelloCambiato = () => {
      const { profilo, aggiornaProfilo } = useSessione.getState();
      const id = castelli.find((c) => c.slug === leggiCastello())?.id ?? null;
      if (!profilo || id === null || id === profilo.castello_id) return;
      aggiornaProfilo({ castello_id: id });
      salvaProfilo(profilo.id, { castello_id: id });
    };
    window.addEventListener(EVENTO_CASTELLO, castelloCambiato);

    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener(EVENTO_CASTELLO, castelloCambiato);
    };
  }, [castelli]);

  return null;
}
