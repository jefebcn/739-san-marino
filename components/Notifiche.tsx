"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icona } from "./Icona";

// Notifiche dell'app installata (passo 1.6): solo con consenso esplicito, chiesto al momento giusto
// (pagina del Bollettino, profilo, dopo il primo check-in), mai all'apertura. Al massimo una al giorno.

const CHIAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const CHIESTO = "739-notifiche-chiesto";

type Scelte = { bollettino: boolean; weekend: boolean };
type Stato = "attesa" | "nonsupportato" | "installa" | "negato" | "pronto";

function chiaveBinaria(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

function iPhoneNonInstallato() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installata = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !installata;
}

/** Lo stato delle notifiche su questo telefono e le funzioni per cambiarle */
function useNotifiche() {
  const [stato, setStato] = useState<Stato>("attesa");
  const [scelte, setScelte] = useState<Scelte | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  useEffect(() => {
    if (!CHIAVE) return setStato("nonsupportato");
    if (iPhoneNonInstallato()) return setStato("installa");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setStato("nonsupportato");
    if (Notification.permission === "denied") return setStato("negato");
    navigator.serviceWorker.ready
      .then((r) => r.pushManager.getSubscription())
      .then(async (s) => {
        if (s) {
          const { data } = await supabaseBrowser().rpc("mie_notifiche", { p_endpoint: s.endpoint });
          setScelte((data as Scelte | null) ?? null);
        }
        setStato("pronto");
      })
      .catch(() => setStato("nonsupportato"));
  }, []);

  /** Accende o cambia le scelte; con entrambe spente toglie l'iscrizione */
  const salva = async (nuove: Scelte) => {
    setInvio(true);
    setErrore(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!nuove.bollettino && !nuove.weekend) {
        const s = await reg.pushManager.getSubscription();
        if (s) {
          await supabaseBrowser().rpc("togli_notifiche", { p_endpoint: s.endpoint });
          await s.unsubscribe();
        }
        setScelte(null);
        return;
      }
      if (Notification.permission !== "granted") {
        const permesso = await Notification.requestPermission();
        if (permesso !== "granted") {
          setStato(permesso === "denied" ? "negato" : "pronto");
          return;
        }
      }
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveBinaria(CHIAVE) }));
      const j = s.toJSON();
      const { error } = await supabaseBrowser().rpc("iscrivi_notifiche", {
        p_endpoint: s.endpoint,
        p_p256dh: j.keys?.p256dh ?? "",
        p_auth: j.keys?.auth ?? "",
        p_bollettino: nuove.bollettino,
        p_weekend: nuove.weekend,
      });
      if (error) throw new Error(error.code === "P0001" ? error.message : "Le notifiche non si sono accese. Riprova tra poco.");
      setScelte(nuove);
    } catch (e) {
      setErrore((e as Error).message || "Le notifiche non si sono accese. Riprova tra poco.");
    } finally {
      setInvio(false);
    }
  };

  return { stato, scelte, salva, errore, invio };
}

function Interruttore({ acceso, onCambia, titolo, testo, disattivo }: { acceso: boolean; onCambia: (v: boolean) => void; titolo: string; testo: string; disattivo: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-medium">{titolo}</span>
        <span className="text-[13px] text-testo-2">{testo}</span>
      </span>
      <input type="checkbox" role="switch" checked={acceso} disabled={disattivo} onChange={(e) => onCambia(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-linea transition-colors peer-checked:bg-[var(--ottone)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accento)] peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

/** Le notifiche con i due interruttori: pagina del Bollettino e profilo */
export default function Notifiche() {
  const { stato, scelte, salva, errore, invio } = useNotifiche();
  if (stato === "attesa" || stato === "nonsupportato") return null;

  return (
    <section className="flex flex-col gap-1 rounded-2xl bg-superficie px-4 pt-4 pb-1" aria-labelledby="titolo-notifiche">
      <h2 id="titolo-notifiche" className="flex items-center gap-2 text-[17px] font-semibold">
        <Icona nome="avvisi" size={22} /> Notifiche
      </h2>
      {stato === "installa" ? (
        <p className="pb-3 text-sm leading-relaxed text-testo-2">Su iPhone le notifiche arrivano solo con 739 sulla schermata Home: tocca Condividi, poi «Aggiungi alla schermata Home», e apri 739 da lì.</p>
      ) : stato === "negato" ? (
        <p className="pb-3 text-sm leading-relaxed text-testo-2">Le notifiche di 739 sono bloccate nelle impostazioni del telefono. Se le vuoi, riattivale da lì per questo sito.</p>
      ) : (
        <>
          <p className="text-sm text-testo-2">Al massimo una al giorno, solo quelle che scegli.</p>
          <div className="divide-y divide-linea">
            <Interruttore acceso={!!scelte?.bollettino} disattivo={invio} onCambia={(v) => salva({ bollettino: v, weekend: scelte?.weekend ?? false })} titolo="Il Bollettino" testo="Ogni mattina alle 7:39: meteo, eventi e avvisi del giorno." />
            <Interruttore acceso={!!scelte?.weekend} disattivo={invio} onCambia={(v) => salva({ bollettino: scelte?.bollettino ?? false, weekend: v })} titolo="Il weekend" testo="Il venerdì mattina, al posto del Bollettino: cosa succede fino a domenica." />
          </div>
          {errore ? <p role="alert" className="pb-3 text-sm text-segnale">{errore}</p> : null}
        </>
      )}
    </section>
  );
}

/** Dopo il primo check-in: una domanda sola, che non torna se la si chiude */
export function ChiediNotifiche() {
  const { stato, scelte, salva, invio } = useNotifiche();
  const [nascosto, setNascosto] = useState(true);

  useEffect(() => {
    try {
      setNascosto(localStorage.getItem(CHIESTO) === "1");
    } catch {
      setNascosto(false);
    }
  }, []);

  if (nascosto || stato !== "pronto" || scelte) return null;
  const chiudi = () => {
    try {
      localStorage.setItem(CHIESTO, "1");
    } catch {}
    setNascosto(true);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-superficie p-4" aria-label="Notifiche">
      <p className="text-[15px] leading-relaxed">
        <b className="font-semibold">Vuoi il Bollettino ogni mattina alle 7:39?</b>{" "}
        <span className="text-testo-2">Meteo, eventi e avvisi del giorno, al massimo una notifica al giorno.</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={invio} onClick={async () => { await salva({ bollettino: true, weekend: true }); chiudi(); }} className="h-10 rounded-xl bg-metallo px-4 text-sm font-semibold text-su-accento active:scale-[0.97] disabled:opacity-50">
          Sì, avvisami
        </button>
        <button type="button" onClick={chiudi} className="h-10 rounded-xl px-3 text-sm font-medium text-testo-2 hover:text-testo">No, grazie</button>
      </div>
    </section>
  );
}
