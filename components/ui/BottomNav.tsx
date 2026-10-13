"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icona, type NomeIcona } from "../Icona";

export type VoceNav = { href: string; nome: string; icona: NomeIcona };

/** Barra di navigazione fissa in basso, in vetro smerigliato. La voce attiva si accende in ottone. */
export default function BottomNav({ voci }: { voci: VoceNav[] }) {
  const path = usePathname();
  const attivo = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <nav
      aria-label="Sezioni"
      className="z-10 grid flex-none select-none border-t border-linea bg-[var(--vetro)] px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] backdrop-blur-xl backdrop-saturate-150"
      style={{ gridTemplateColumns: `repeat(${voci.length}, minmax(0, 1fr))` }}
    >
      {voci.map((v) => (
        <Link
          key={v.href}
          href={v.href}
          aria-current={attivo(v.href) ? "page" : undefined}
          className="group flex min-h-[52px] flex-col items-center gap-0.5 py-0.5 text-[11px] font-medium text-testo-2 aria-[current=page]:text-testo"
        >
          <span className="grid h-8 w-14 place-items-center rounded-xl transition-colors duration-150 group-aria-[current=page]:bg-accento-tenue group-aria-[current=page]:text-accento [&_svg]:size-[22px]">
            <Icona nome={v.icona} />
          </span>
          {v.nome}
        </Link>
      ))}
    </nav>
  );
}
