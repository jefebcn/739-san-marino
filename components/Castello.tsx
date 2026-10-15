"use client";

import { useEffect, useState } from "react";
import type { Castello } from "@/lib/data";
import { EmblemaCastello } from "./LogoCastello";

export const CHIAVE_CASTELLO = "739-castello";
export const EVENTO_CASTELLO = "739-castello-cambiato";

export function leggiCastello(): string | null {
  try {
    return localStorage.getItem(CHIAVE_CASTELLO);
  } catch {
    return null;
  }
}

export function impostaCastello(slug: string | null) {
  try {
    if (slug) localStorage.setItem(CHIAVE_CASTELLO, slug);
    else localStorage.removeItem(CHIAVE_CASTELLO);
  } catch {}
  document.documentElement.dataset.utente = slug ? "tornato" : "nuovo";
  window.dispatchEvent(new Event(EVENTO_CASTELLO));
}

export function useCastelloScelto() {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    const agg = () => setSlug(leggiCastello());
    agg();
    window.addEventListener(EVENTO_CASTELLO, agg);
    return () => window.removeEventListener(EVENTO_CASTELLO, agg);
  }, []);
  return slug;
}

/** Griglia per scegliere il proprio castello (per i nuovi utenti). */
export function ScegliCastello({ castelli, fila }: { castelli: Castello[]; fila?: boolean }) {
  const scelto = useCastelloScelto();
  const ordinati = [...castelli].sort((a, b) => a.id - b.id);
  return (
    <div className={fila ? "scegli fila" : "scegli"} role="group" aria-label="Scegli il tuo castello">
      {ordinati.map((c) => (
        <button
          key={c.id}
          type="button"
          className="premibile"
          aria-pressed={scelto === c.slug}
          onClick={() => {
            impostaCastello(c.slug);
            document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <EmblemaCastello c={c} className={fila ? "size-12" : "size-14"} />
          {c.nome}
        </button>
      ))}
    </div>
  );
}
