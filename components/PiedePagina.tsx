import Link from "next/link";
import { Logo } from "./Logo";
import { AREE } from "@/lib/aree";

const ALTRE = [
  { href: "/bollettino", nome: "Il Bollettino" },
  { href: "/rubriche", nome: "Rubriche" },
  { href: "/eventi", nome: "Calendario" },
  { href: "/castelli", nome: "I 9 castelli" },
  { href: "/guida", nome: "Come funziona 739" },
  { href: "/profile", nome: "Il tuo SMR ID" },
];

/** Piè di pagina, solo su computer: sul telefono la navigazione è la barra in basso. */
export default function PiedePagina() {
  const anno = new Date().getFullYear();
  return (
    <footer className="piede mt-auto hidden flex-col gap-8 border-t border-linea pt-10 lg:flex">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-24">
        <div className="flex max-w-[34ch] flex-col gap-3">
          <Logo />
          <p className="text-sm leading-relaxed text-testo-2">Tutto San Marino, dalla vetta: eventi, servizi, sport e i nove castelli in un posto solo.</p>
        </div>
        <nav aria-label="Aree" className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Le aree</span>
          {AREE.map((a) => (
            <Link key={a.href} href={a.href} className="text-testo-2 transition-colors hover:text-testo">{a.nome}</Link>
          ))}
        </nav>
        <nav aria-label="739" className="flex flex-col gap-2 text-sm">
          <span className="font-medium">739</span>
          {ALTRE.map((a) => (
            <Link key={a.href} href={a.href} className="text-testo-2 transition-colors hover:text-testo">{a.nome}</Link>
          ))}
        </nav>
      </div>
      <p className="text-[13px] leading-relaxed text-testo-2">
        Dati da fonti ufficiali, OpenStreetMap, Open-Meteo e Libertas, citate in ogni pagina. Se trovi un errore, segnalalo dalla scheda.{" "}
        © <span className="font-mono">{anno}</span> 739 San Marino
      </p>
    </footer>
  );
}
