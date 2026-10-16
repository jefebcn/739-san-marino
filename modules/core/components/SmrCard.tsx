"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Ridotto } from "@/components/Logo";
import type { Castello } from "@/lib/data";
import { EmblemaCastello } from "@/components/LogoCastello";

/** Contenuto del QR personale: lo leggeranno gli scanner di 739 (check-in, partite, negozi). */
export const contenutoQr = (tessera: string) => `739ID:${tessera}`;

function useQr(testo: string) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let attivo = true;
    QRCode.toString(testo, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#09090B", light: "#FFFFFF" } })
      .then((s) => attivo && setSvg(s))
      .catch(() => attivo && setSvg(null));
    return () => {
      attivo = false;
    };
  }, [testo]);
  return svg;
}

function Qr({ testo, className = "" }: { testo: string; className?: string }) {
  const svg = useQr(testo);
  // L'SVG è generato qui da `qrcode` a partire dalla tessera: nessun contenuto esterno
  return svg ? (
    <span className={`block [&_svg]:h-full [&_svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <span className={`block animate-pulse rounded bg-zinc-200 ${className}`} />
  );
}

type Props = {
  nome: string | null;
  tessera: string;
  castello: Castello | null;
  /** Rating sportivo (Glicko-2): arriva con il modulo Sport */
  rating: number | null;
  /** I metri della quota (null finché non arrivano) */
  metri?: number | null;
  /** Apre subito il QR a schermo intero (dalle azioni rapide) */
  apriQr?: boolean;
  /** Anteprima per chi non ha ancora l'SMR ID: niente QR vero */
  esempio?: boolean;
};

/**
 * La Card SMR ID nello stile del logo: nera piena come una carta fisica, il 739 in alto, nome e castello,
 * il QR personale su una tessera bianca, in basso tessera, metri (in ottone, come sempre i metri) e rating.
 * Il colore del castello è solo una riga sul bordo basso.
 */
export default function SmrCard({ nome, tessera, castello, rating, metri = null, apriQr = false, esempio = false }: Props) {
  const [grande, setGrande] = useState(apriQr);

  useEffect(() => {
    if (!grande) return;
    const chiudi = (e: KeyboardEvent) => e.key === "Escape" && setGrande(false);
    window.addEventListener("keydown", chiudi);
    return () => window.removeEventListener("keydown", chiudi);
  }, [grande]);

  return (
    <>
      <article
        aria-label={esempio ? "Esempio di SMR ID" : `SMR ID di ${nome ?? "utente 739"}, tessera ${tessera}`}
        className="relative isolate grid aspect-[1.586] w-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr_auto] gap-x-4 overflow-hidden rounded-2xl bg-[#09090B] p-5 text-zinc-50 shadow-[0_24px_48px_-28px_rgba(9,9,11,0.55)] lg:p-6"
      >
        <header className="col-span-2 flex items-center justify-between">
          <Ridotto etichetta="739" className="h-6 w-auto text-zinc-50" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">SMR ID</span>
        </header>

        <div className="flex min-w-0 flex-col justify-end gap-2 self-end pb-3">
          <p className="truncate font-[family-name:var(--titoli)] text-[22px] font-semibold leading-tight tracking-tight lg:text-[26px]">{nome || "Senza nome"}</p>
          {castello ? (
            <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-zinc-300">
              <EmblemaCastello c={castello} className="size-6 !rounded-md" />
              <span className="truncate">{castello.nome}</span>
            </span>
          ) : (
            <span className="text-[13px] text-zinc-400">Castello non scelto</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => !esempio && setGrande(true)}
          disabled={esempio}
          aria-label="Mostra il QR a schermo intero"
          className="row-span-2 self-end rounded-xl bg-white p-2 transition-transform duration-150 active:scale-95 disabled:cursor-default"
        >
          {esempio ? <span className="grid size-[88px] place-items-center text-center text-[11px] font-medium leading-tight text-zinc-500 lg:size-[104px]">Il tuo QR</span> : <Qr testo={contenutoQr(tessera)} className="size-[88px] lg:size-[104px]" />}
        </button>

        <footer className="flex items-end gap-5">
          <Dato titolo="Tessera" valore={tessera} />
          <Dato titolo="Quota" valore={metri === null ? "–" : `${metri} m`} ottone />
          <Dato titolo="Rating" valore={rating ? String(Math.round(rating)) : "Nuovo"} />
        </footer>

        {castello ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1" style={{ background: castello.colore }} /> : null}
      </article>

      {grande ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR SMR ID"
          onClick={() => setGrande(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[#09090B]/90 p-8 backdrop-blur-xl"
        >
          <Ridotto etichetta="739" className="h-7 w-auto text-white" />
          <div className="w-full max-w-[320px] rounded-3xl bg-white p-6 shadow-2xl">
            <Qr testo={contenutoQr(tessera)} className="aspect-square w-full" />
          </div>
          <p className="text-center">
            <span className="block text-[17px] font-semibold text-white">{nome || "SMR ID"}</span>
            <span className="font-mono text-[15px] font-medium tracking-wider text-zinc-300">{tessera}</span>
          </p>
          <p className="text-sm text-zinc-400">Tocca per chiudere</p>
        </div>
      ) : null}
    </>
  );
}

/** Una dicitura della carta: piccola in maiuscolo, come su una carta fisica, col valore sotto */
function Dato({ titolo, valore, ottone = false }: { titolo: string; valore: string; ottone?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-500">{titolo}</span>
      <span className={`whitespace-nowrap font-mono text-[13px] font-medium tracking-wide ${ottone ? "text-ottone-300" : "text-zinc-100"}`}>{valore}</span>
    </span>
  );
}
