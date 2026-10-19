"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { linguaDi } from "@/lib/lingua";
import { VOCI_EN } from "./NavDesktop";
import { Ridotto } from "./Logo";
import { AREE } from "@/lib/aree";

const ALTRE = [
  { href: "/bollettino", nome: "Il Bollettino" },
  { href: "/notizie", nome: "Notizie" },
  { href: "/rubriche", nome: "Rubriche" },
  { href: "/eventi", nome: "Calendario" },
  { href: "/castelli", nome: "I 9 castelli" },
  { href: "/guida", nome: "Come funziona 739" },
  { href: "/attivita", nome: "Per le attività" },
  { href: "/profile", nome: "Il tuo SMR ID" },
];

/** Piè di pagina, solo su computer: sul telefono la navigazione è la barra in basso. */
export default function PiedePagina() {
  const anno = new Date().getFullYear();
  if (linguaDi(usePathname()) === "en") return <PiedeEn anno={anno} />;
  return (
    <footer className="piede mt-auto hidden flex-col gap-8 border-t border-linea pt-10 lg:flex">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-24">
        <div className="flex max-w-[34ch] flex-col gap-3">
          <Ridotto etichetta="739 San Marino" className="h-6 w-auto self-start text-testo" />
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
        © <span className="font-mono">{anno}</span> 739 San Marino.{" "}
        <Link href="/privacy" className="underline-offset-2 hover:text-testo hover:underline">Privacy</Link>,{" "}
        <Link href="/termini" className="underline-offset-2 hover:text-testo hover:underline">Termini d&apos;uso</Link>
      </p>
    </footer>
  );
}

function PiedeEn({ anno }: { anno: number }) {
  return (
    <footer className="piede mt-auto hidden flex-col gap-8 border-t border-linea pt-10 lg:flex">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-24">
        <div className="flex max-w-[34ch] flex-col gap-3">
          <Ridotto etichetta="739 San Marino" className="h-6 w-auto self-start text-testo" />
          <p className="text-sm leading-relaxed text-testo-2">The app of the Republic of San Marino. 739 is the height of Monte Titano, in metres.</p>
        </div>
        <nav aria-label="Visit" className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Visit</span>
          {[...VOCI_EN, { href: "/en/viewpoints", nome: "Viewpoints" }, { href: "/en/pharmacies", nome: "Pharmacies" }].map((v) => (
            <Link key={v.href} href={v.href} className="text-testo-2 transition-colors hover:text-testo">{v.nome}</Link>
          ))}
        </nav>
        <nav aria-label="739" className="flex flex-col gap-2 text-sm">
          <span className="font-medium">739</span>
          <Link href="/" hrefLang="it" lang="it" className="text-testo-2 transition-colors hover:text-testo">739 in italiano</Link>
          <Link href="/privacy" hrefLang="it" className="text-testo-2 transition-colors hover:text-testo">Privacy (in Italian)</Link>
          <Link href="/termini" hrefLang="it" className="text-testo-2 transition-colors hover:text-testo">Terms of use (in Italian)</Link>
        </nav>
      </div>
      <p className="text-[13px] leading-relaxed text-testo-2">
        Data from official sources, OpenStreetMap, Overture Maps and Open-Meteo, credited on each page. Names, descriptions and event details are written by local businesses and our editors, in Italian.{" "}
        © <span className="font-mono">{anno}</span> 739 San Marino.
      </p>
    </footer>
  );
}
