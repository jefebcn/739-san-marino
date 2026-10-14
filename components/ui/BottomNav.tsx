"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icona, type NomeIcona } from "../Icona";

export type VoceNav = { href: string; nome: string; icona: NomeIcona };

/**
 * Barra di navigazione fissa in basso, in vetro smerigliato.
 * `centro` (facoltativo) va in mezzo alle voci: il pulsante delle azioni rapide.
 */
export default function BottomNav({ voci, centro }: { voci: VoceNav[]; centro?: ReactNode }) {
  const path = usePathname();
  const attivo = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  const meta = Math.ceil(voci.length / 2);

  // La voce attiva si riconosce dall'icona piena e dal testo chiaro, senza riquadri colorati
  const voce = (v: VoceNav) => {
    const qui = attivo(v.href);
    return (
      <Link
        key={v.href}
        href={v.href}
        aria-current={qui ? "page" : undefined}
        className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-testo-2 transition-colors aria-[current=page]:text-testo"
      >
        <Icona nome={v.icona} size={24} peso={qui ? "fill" : "regular"} />
        {v.nome}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Sezioni"
      className="z-10 flex-none select-none border-t border-linea bg-[var(--vetro)] px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto grid max-w-[var(--colonna)] items-start" style={{ gridTemplateColumns: `repeat(${voci.length + (centro ? 1 : 0)}, minmax(0, 1fr))` }}>
        {voci.slice(0, meta).map(voce)}
        {centro ? <div className="flex justify-center">{centro}</div> : null}
        {voci.slice(meta).map(voce)}
      </div>
    </nav>
  );
}
