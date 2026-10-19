"use client";

import { useEffect, useRef, useState } from "react";

type Rilevatore = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/**
 * Legge un QR con la fotocamera posteriore. Dove il browser ha il lettore integrato (BarcodeDetector, Android)
 * usa quello; altrove (iPhone) legge i fotogrammi con jsQR, caricato solo qui. Chiama `onLetto` una volta e si ferma.
 */
export default function LettoreQr({ onLetto, onChiudi }: { onLetto: (testo: string) => void; onChiudi: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let flusso: MediaStream | null = null;
    let fermo = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch {
        setErrore("La fotocamera non si è aperta: dai il permesso a 739 nelle impostazioni del telefono, o scrivi il numero della tessera qui sotto.");
        return;
      }
      if (fermo || !video.current) return flusso.getTracks().forEach((t) => t.stop());
      video.current.srcObject = flusso;
      await video.current.play().catch(() => undefined);

      const Integrato = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Rilevatore }).BarcodeDetector;
      const integrato = Integrato ? new Integrato({ formats: ["qr_code"] }) : null;
      const jsQR = integrato ? null : (await import("jsqr")).default;
      const tela = document.createElement("canvas");
      const ctx = tela.getContext("2d", { willReadFrequently: true });

      const giro = async () => {
        if (fermo || !video.current) return;
        const v = video.current;
        let testo: string | null = null;
        if (v.readyState >= 2 && v.videoWidth) {
          if (integrato) {
            testo = (await integrato.detect(v).catch(() => []))[0]?.rawValue ?? null;
          } else if (jsQR && ctx) {
            // Un fotogramma ridotto basta e non scalda il telefono
            const s = Math.min(1, 640 / v.videoWidth);
            tela.width = Math.round(v.videoWidth * s);
            tela.height = Math.round(v.videoHeight * s);
            ctx.drawImage(v, 0, 0, tela.width, tela.height);
            const img = ctx.getImageData(0, 0, tela.width, tela.height);
            testo = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data ?? null;
          }
        }
        if (testo && !fermo) {
          fermo = true;
          flusso?.getTracks().forEach((t) => t.stop());
          onLetto(testo);
          return;
        }
        timer = setTimeout(giro, 200);
      };
      giro();
    })();

    return () => {
      fermo = true;
      if (timer) clearTimeout(timer);
      flusso?.getTracks().forEach((t) => t.stop());
    };
    // Una sola lettura per apertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {errore ? (
        <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p>
      ) : (
        <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-[#09090B]">
          <video ref={video} muted playsInline className="size-full object-cover" aria-label="Fotocamera per leggere il QR dell'SMR ID" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80" />
        </div>
      )}
      <button type="button" onClick={onChiudi} className="w-fit text-[14px] font-semibold text-testo-2 underline underline-offset-2">Chiudi la fotocamera</button>
    </div>
  );
}
