"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icona, type NomeIcona } from "./Icona";

const voci: { href: string; nome: string; icona: NomeIcona }[] = [
  { href: "/", nome: "Home", icona: "home" },
  { href: "/mappa", nome: "Mappa", icona: "mappa" },
  { href: "/eventi", nome: "Eventi", icona: "eventi" },
  { href: "/castelli", nome: "Castelli", icona: "castelli" },
  { href: "/utili", nome: "Utili", icona: "utili" },
];

export default function Nav() {
  const path = usePathname();
  const attivo = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  return (
    <nav className="nav" aria-label="Sezioni">
      {voci.map((v) => (
        <Link key={v.href} href={v.href} aria-current={attivo(v.href) ? "page" : undefined}>
          <span className="ico"><Icona nome={v.icona} /></span>
          {v.nome}
        </Link>
      ))}
    </nav>
  );
}
