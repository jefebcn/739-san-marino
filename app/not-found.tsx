"use client";

import { usePathname } from "next/navigation";
import Tano from "@/components/Tano";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { linguaDi } from "@/lib/lingua";

export default function NonTrovato() {
  // Sotto /en la pagina non trovata parla inglese
  const en = linguaDi(usePathname()) === "en";
  return (
    <section className="flex flex-col items-center gap-4 pt-6 text-center">
      <Tano posa="tranquillo" priority lingua={en ? "en" : "it"} className="h-56 w-auto lg:h-64" />
      <h1 className="titolo [text-wrap:balance]">{en ? "Nothing here, let's go back to Today" : <>Qui non c&apos;è niente, torniamo a Oggi</>}</h1>
      <p className="sottotitolo">{en ? "The page you are looking for doesn't exist or has moved." : "La pagina che cerchi non esiste o è stata spostata."}</p>
      <PrimaryButton href={en ? "/en" : "/"} pieno className="max-w-sm">{en ? "Back to Today" : "Torna a Oggi"}</PrimaryButton>
    </section>
  );
}
