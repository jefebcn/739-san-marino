"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { linguaDi, percorsoIn, traduzione } from "@/lib/lingua";
import { Ridotto } from "./Logo";
import { Icona } from "./Icona";

const CHIAVE = "739-lingua";

function ricorda(lingua: "it" | "en") {
  try {
    localStorage.setItem(CHIAVE, lingua);
  } catch {}
}

/** IT/EN nella testata: porta alla stessa pagina nell'altra lingua (o alla prima pagina, se non c'è ancora) */
export function CambiaLingua() {
  const path = usePathname();
  const lingua = linguaDi(path);
  const altra = lingua === "en" ? "it" : "en";
  // Nelle pagine italiane, sul telefono, solo per chi visita: ai residenti serve spazio per il castello
  return (
    <Link
      href={percorsoIn(altra, path)}
      hrefLang={altra}
      onClick={() => ricorda(altra)}
      aria-label={lingua === "en" ? "Leggi 739 in italiano" : "Read 739 in English"}
      className={`${lingua === "it" ? "per-ospiti " : ""}grid h-10 shrink-0 place-items-center rounded-xl bg-superficie px-3 text-[13px] font-semibold text-testo transition-colors hover:bg-superficie-2 active:scale-95`}
    >
      {altra.toUpperCase()}
    </Link>
  );
}

/** Il logo in alto porta alla prima pagina della lingua in cui sei */
export function LogoTesta() {
  const en = linguaDi(usePathname()) === "en";
  return (
    <Link href={en ? "/en" : "/"} aria-label={en ? "739, back to Today" : "739, torna a Oggi"} className="shrink-0">
      <Ridotto etichetta="739 San Marino" className="h-[22px] w-auto text-testo" />
    </Link>
  );
}

/**
 * La lingua della pagina per i lettori di schermo: lo script nel layout la mette al primo caricamento,
 * questo la tiene giusta quando si passa da una lingua all'altra senza ricaricare.
 */
export function LinguaHtml() {
  const path = usePathname();
  useEffect(() => {
    document.documentElement.lang = linguaDi(path);
  }, [path]);
  return null;
}

/**
 * A chi ha il telefono in un'altra lingua, una riga che propone l'inglese (una volta: poi vale la sua scelta).
 * Chi ha già scelto l'inglese e apre la prima pagina italiana (per esempio dall'icona sulla schermata Home) va a /en.
 */
export function ProponiInglese() {
  const path = usePathname();
  const router = useRouter();
  const [mostra, setMostra] = useState(false);
  const italiano = linguaDi(path) === "it";

  useEffect(() => {
    if (!italiano || path.startsWith("/admin")) return setMostra(false);
    let scelta: string | null = null;
    try {
      scelta = localStorage.getItem(CHIAVE);
    } catch {}
    if (scelta === "en" && path === "/") return router.replace("/en");
    if (scelta) return setMostra(false);
    const lingue = navigator.languages?.length ? navigator.languages : [navigator.language];
    setMostra(!lingue.some((l) => l?.toLowerCase().startsWith("it")));
  }, [italiano, path, router]);

  if (!mostra) return null;
  const verso = traduzione("en", path) ?? "/en";
  return (
    <div role="region" aria-label="Language" lang="en" className="flex items-center gap-3 rounded-xl bg-superficie py-2 pr-2 pl-4 text-sm">
      <span className="min-w-0 flex-1 text-testo-2">739 is also in English.</span>
      <Link href={verso} hrefLang="en" onClick={() => ricorda("en")} className="shrink-0 rounded-lg bg-metallo px-3 py-1.5 font-semibold text-[var(--su-accento)]">
        Read in English
      </Link>
      <button type="button" aria-label="Keep Italian" onClick={() => { ricorda("it"); setMostra(false); }} className="grid size-8 shrink-0 place-items-center rounded-lg text-testo-2 hover:bg-superficie-2 hover:text-testo">
        <Icona nome="chiudi" size={16} />
      </button>
    </div>
  );
}
