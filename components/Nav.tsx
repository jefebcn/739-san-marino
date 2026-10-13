"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const voci = [
  { href: "/", nome: "Home", d: "M4 11l8-7 8 7v9h-5v-6h-6v6H4z" },
  { href: "/mappa", nome: "Mappa", d: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" },
  { href: "/eventi", nome: "Eventi", d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { href: "/castelli", nome: "Castelli", d: "M3 20h18M5 20V10l3-2 3 2v10M13 20V6l3-3 3 3v14" },
  { href: "/utili", nome: "Utili", d: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v5M12 16.5v.5" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Sezioni">
      {voci.map((v) => (
        <Link key={v.href} href={v.href} aria-current={path === v.href ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={v.d} />
          </svg>
          {v.nome}
        </Link>
      ))}
    </nav>
  );
}
