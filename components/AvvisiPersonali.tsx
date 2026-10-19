"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { iscrizionePush, statoPush, type StatoPush } from "@/lib/push";
import { useSessione } from "@/modules/core/store";
import { Icona } from "./Icona";

/**
 * Gli avvisi personali su questo telefono (migrazione 0049): arrivano solo a chi è entrato con l'SMR ID,
 * per le cose sue (una prenotazione nuova al gestore, la risposta del centro a chi prenota). Non sono il Bollettino.
 * `testo` dice perché accenderli in quella pagina.
 */
export default function AvvisiPersonali({ testo, compatto = false }: { testo: string; compatto?: boolean }) {
  const { stato: sessione } = useSessione();
  const [stato, setStato] = useState<StatoPush>("attesa");
  const [attivi, setAttivi] = useState<boolean | null>(null);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (sessione !== "connesso") return;
    const s = statoPush();
    setStato(s);
    if (s !== "pronto") return;
    iscrizionePush(false)
      .then(async (i) => {
        if (!i) return setAttivi(false);
        const { data } = await supabaseBrowser().rpc("avvisi_attivi", { p_endpoint: i.endpoint });
        setAttivi(data === true);
      })
      .catch(() => setStato("nonsupportato"));
  }, [sessione]);

  async function accendi() {
    setInvio(true);
    setErrore(null);
    try {
      const i = await iscrizionePush(true);
      if (!i) {
        setStato(Notification.permission === "denied" ? "negato" : "pronto");
        return;
      }
      const j = i.toJSON();
      const { error } = await supabaseBrowser().rpc("attiva_avvisi", { p_endpoint: i.endpoint, p_p256dh: j.keys?.p256dh ?? "", p_auth: j.keys?.auth ?? "" });
      if (error) throw new Error(error.code === "P0001" ? error.message : "Gli avvisi non si sono accesi. Riprova tra poco.");
      setAttivi(true);
    } catch (e) {
      setErrore((e as Error).message || "Gli avvisi non si sono accesi. Riprova tra poco.");
    } finally {
      setInvio(false);
    }
  }

  async function spegni() {
    setInvio(true);
    try {
      const i = await iscrizionePush(false);
      if (i) {
        await supabaseBrowser().rpc("togli_avvisi", { p_endpoint: i.endpoint });
        // L'iscrizione del telefono resta se serve ancora al Bollettino
        const { data } = await supabaseBrowser().rpc("mie_notifiche", { p_endpoint: i.endpoint });
        const scelte = data as { bollettino?: boolean; weekend?: boolean; scadenze?: boolean } | null;
        if (!scelte || !(scelte.bollettino || scelte.weekend || scelte.scadenze)) await i.unsubscribe();
      }
      setAttivi(false);
    } finally {
      setInvio(false);
    }
  }

  if (sessione !== "connesso" || stato === "attesa" || stato === "nonsupportato" || (stato === "pronto" && attivi === null)) return null;

  const spiegazione =
    stato === "installa" ? "Su iPhone gli avvisi arrivano solo con 739 sulla schermata Home: tocca Condividi, poi «Aggiungi alla schermata Home», e apri 739 da lì."
    : stato === "negato" ? "Le notifiche di 739 sono bloccate nelle impostazioni del telefono: riattivale da lì per questo sito."
    : attivi ? "Accesi su questo telefono." : testo;

  return (
    <div className={`flex items-start gap-3 rounded-2xl ${compatto ? "border border-linea p-3.5" : "bg-superficie p-4"}`}>
      <span className="mt-0.5 shrink-0"><Icona nome="avvisi" size={22} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">Avvisi sul telefono</span>
          <span className="text-[13px] leading-snug text-testo-2">{spiegazione}</span>
        </span>
        {stato === "pronto" ? (
          attivi ? (
            <button type="button" disabled={invio} onClick={spegni} className="w-fit text-[13px] font-semibold text-testo-2 underline underline-offset-2 disabled:opacity-50">Spegni su questo telefono</button>
          ) : (
            <button type="button" disabled={invio} onClick={accendi} className="taglio-piccolo h-9 w-fit bg-metallo px-4 text-[14px] font-semibold text-su-accento disabled:opacity-50">{invio ? "Accendo…" : "Accendi gli avvisi"}</button>
          )
        ) : null}
        {errore ? <span role="alert" className="text-[13px] text-segnale">{errore}</span> : null}
      </span>
    </div>
  );
}
