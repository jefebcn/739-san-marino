// Notifiche push nel browser: le usano il Bollettino (components/Notifiche.tsx) e gli avvisi personali
// (components/AvvisiPersonali.tsx). Un telefono ha una sola iscrizione push, condivisa dai due.

export const CHIAVE_VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function chiaveBinaria(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function iPhoneNonInstallato() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installata = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !installata;
}

export type StatoPush = "attesa" | "nonsupportato" | "installa" | "negato" | "pronto";

/** Cosa può fare questo telefono con le notifiche, senza chiedere niente */
export function statoPush(): StatoPush {
  if (!CHIAVE_VAPID) return "nonsupportato";
  if (iPhoneNonInstallato()) return "installa";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "nonsupportato";
  if (Notification.permission === "denied") return "negato";
  return "pronto";
}

/** L'iscrizione push di questo telefono; con `crea` chiede il permesso e la crea se manca (null se il permesso non c'è) */
export async function iscrizionePush(crea: boolean) {
  const reg = await navigator.serviceWorker.ready;
  const esistente = await reg.pushManager.getSubscription();
  if (esistente || !crea) return esistente;
  if (Notification.permission !== "granted" && (await Notification.requestPermission()) !== "granted") return null;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveBinaria(CHIAVE_VAPID) });
}
