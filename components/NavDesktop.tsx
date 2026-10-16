"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AREE } from "@/lib/aree";
import { linguaDi } from "@/lib/lingua";
import { Icona } from "./Icona";

/** Le voci della testata su computer: Oggi, le cinque aree, la mappa. Sul telefono c'è la barra in basso. */
const VOCI = [
  { href: "/", nome: "Oggi", percorsi: ["/", "/bollettino"] },
  // Un'area è «qui» anche nelle sue sezioni (es. /utili/farmacie è Vivere, /eventi è Uscire)
  ...AREE.map((a) => ({ href: a.href, nome: a.nome, percorsi: [a.href, ...a.sezioni.map((s) => s.href).filter((h): h is string => Boolean(h))] })),
  { href: "/mappa", nome: "Mappa", percorsi: ["/mappa"] },
];

/** In inglese: le pagine per chi visita (lib/lingua.ts) */
export const VOCI_EN = [
  { href: "/en", nome: "Today", percorsi: ["/en"] },
  { href: "/en/transport", nome: "Getting around", percorsi: ["/en/transport", "/en/parking"] },
  { href: "/en/pharmacies", nome: "Pharmacies", percorsi: ["/en/pharmacies"] },
  { href: "/en/emergency", nome: "Emergency", percorsi: ["/en/emergency"] },
];

function attiva(path: string, percorsi: string[]) {
  return percorsi.some((p) => (p === "/" || p === "/en" ? path === p : path === p || path.startsWith(p + "/")));
}

export function NavDesktop() {
  const path = usePathname();
  const voci = linguaDi(path) === "en" ? VOCI_EN : VOCI;
  // Con percorsi annidati (/sport e /sport/impianti) vince la prima area che li contiene
  const qui = voci.find((v) => attiva(path, v.percorsi))?.href;
  return (
    <nav aria-label={voci === VOCI_EN ? "Sections" : "Sezioni"} className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex">
      {voci.map((v) => (
        <Link
          key={v.href}
          href={v.href}
          prefetch={v.href === "/mappa" ? false : undefined}
          aria-current={qui === v.href ? "page" : undefined}
          className="rounded-xl px-3 py-2 text-[15px] font-medium text-testo-2 transition-colors hover:bg-superficie hover:text-testo aria-[current=page]:text-testo aria-[current=page]:bg-superficie"
        >
          {v.nome}
        </Link>
      ))}
    </nav>
  );
}

/** Ricerca nella testata su computer: una casella vera sugli schermi grandi, un'icona sugli altri. */
export function CercaDesktop() {
  // La ricerca è in italiano: nelle pagine inglesi non c'è ancora
  if (linguaDi(usePathname()) === "en") return null;
  return (
    <>
      <form action="/cerca" role="search" className="hidden h-10 w-56 shrink-0 items-center gap-2 rounded-xl bg-superficie px-3 text-testo-2 focus-within:ring-2 focus-within:ring-accento xl:flex">
        <Icona nome="cerca" size={18} />
        <label htmlFor="cerca-testata" className="sr-only">Cerca</label>
        <input id="cerca-testata" name="q" type="search" placeholder="Cerca su 739" className="h-full min-w-0 flex-1 bg-transparent text-sm text-testo outline-none placeholder:text-testo-2" />
      </form>
      <Link href="/cerca" aria-label="Cerca" className="hidden size-10 shrink-0 place-items-center rounded-xl bg-superficie text-testo transition-colors hover:bg-superficie-2 lg:grid xl:hidden">
        <Icona nome="cerca" size={20} />
      </Link>
    </>
  );
}
