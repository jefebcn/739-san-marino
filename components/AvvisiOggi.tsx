"use client";

import Link from "next/link";
import { RigaAvviso } from "./Avvisi";
import { useCastelloScelto } from "./Castello";
import { inCorso, type Avviso } from "@/lib/avvisi";
import type { Castello } from "@/lib/data";

/** In Oggi: gli avvisi in corso per tutto il territorio e per il castello scelto, al massimo tre. */
export default function AvvisiOggi({ avvisi, castelli }: { avvisi: Avviso[]; castelli: Castello[] }) {
  const slug = useCastelloScelto();
  const mio = castelli.find((c) => c.slug === slug)?.id ?? null;
  const visibili = avvisi.filter((a) => inCorso(a) && (a.castello_id === null || a.castello_id === mio));
  if (!visibili.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Avvisi in corso">
      {visibili.slice(0, 3).map((a) => (
        <RigaAvviso key={a.id} a={a} castello={castelli.find((c) => c.id === a.castello_id)} compatto />
      ))}
      {visibili.length > 3 ? (
        <Link href="/vivere/avvisi" className="text-sm font-medium text-accento">Tutti gli avvisi ({visibili.length})</Link>
      ) : null}
    </section>
  );
}
