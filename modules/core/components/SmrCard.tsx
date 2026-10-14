"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Cime } from "@/components/Logo";
import type { Castello } from "@/lib/data";

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
  /** Apre subito il QR a schermo intero (dalle azioni rapide) */
  apriQr?: boolean;
};

/** La Card SMR ID: sempre scura, come una carta fisica, con QR personale. */
export default function SmrCard({ nome, tessera, castello, rating, apriQr = false }: Props) {
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
        aria-label={`SMR ID di ${nome ?? "utente 739"}, tessera ${tessera}`}
        className="relative isolate grid aspect-[1.586] w-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr_auto] gap-x-4 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(140deg,#1F1F23_0%,#111113_60%,#17150F_100%)] p-5 text-zinc-50 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]"
      >
        {/* Riflesso metallico e curve di livello */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,transparent_35%,rgba(232,211,160,0.10)_48%,transparent_62%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[repeating-radial-gradient(ellipse_120%_90%_at_90%_120%,transparent_0_18px,rgba(201,164,92,0.07)_18px_19px)]" />

        <header className="col-span-2 flex items-center justify-between">
          <span className="flex items-baseline gap-1.5 text-xl font-bold tracking-tighter">
            739 <Cime width={26} />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ottone-300">SMR ID</span>
        </header>

        <div className="flex min-w-0 flex-col justify-end gap-2 self-end">
          <p className="truncate text-[22px] font-bold leading-tight tracking-tight">{nome || "Senza nome"}</p>
          {castello ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/8 px-2 py-1 text-xs font-medium text-zinc-200">
              <span className="size-2.5 rounded-[3px]" style={{ background: castello.colore }} />
              {castello.nome}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">Castello non scelto</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setGrande(true)}
          aria-label="Mostra il QR a schermo intero"
          className="row-span-2 self-end rounded-xl bg-white p-2 transition-transform duration-150 active:scale-95"
        >
          <Qr testo={contenutoQr(tessera)} className="size-[92px]" />
        </button>

        <footer className="flex items-end gap-5">
          <span className="flex flex-col">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-zinc-500">Tessera</span>
            <span className="font-mono text-[13px] font-semibold tracking-wider text-ottone-200">{tessera}</span>
          </span>
          <span className="flex flex-col">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-zinc-500">Rating</span>
            <span className="font-mono text-[13px] font-semibold text-zinc-100">{rating ? Math.round(rating) : "Nuovo"}</span>
          </span>
        </footer>
      </article>

      {grande ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR SMR ID"
          onClick={() => setGrande(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-zinc-950/80 p-8 backdrop-blur-xl"
        >
          <div className="w-full max-w-[320px] rounded-3xl bg-white p-6 shadow-2xl">
            <Qr testo={contenutoQr(tessera)} className="aspect-square w-full" />
          </div>
          <p className="font-mono text-lg font-semibold tracking-wider text-ottone-200">{tessera}</p>
          <p className="text-sm text-zinc-400">Tocca per chiudere</p>
        </div>
      ) : null}
    </>
  );
}
