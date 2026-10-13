"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Castello } from "@/lib/data";
import { testoSu } from "@/lib/colore";

const CHIAVE = "739-castello";
const EVENTO = "739-castello-cambiato";
const fmt = new Intl.NumberFormat("it-IT");

function leggi(): string | null {
  try {
    return localStorage.getItem(CHIAVE);
  } catch {
    return null;
  }
}

function imposta(slug: string | null) {
  try {
    if (slug) localStorage.setItem(CHIAVE, slug);
    else localStorage.removeItem(CHIAVE);
  } catch {}
  document.documentElement.dataset.utente = slug ? "tornato" : "nuovo";
  window.dispatchEvent(new Event(EVENTO));
}

export function useCastelloScelto() {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    const agg = () => setSlug(leggi());
    agg();
    window.addEventListener(EVENTO, agg);
    return () => window.removeEventListener(EVENTO, agg);
  }, []);
  return slug;
}

/** Chip dell'HUD in alto: il tuo castello con posizione e metri, sempre visibile. */
export function HudCastello({ classifica }: { classifica: Castello[] }) {
  const slug = useCastelloScelto();
  const [pronto, setPronto] = useState(false);
  useEffect(() => setPronto(true), []);
  const pos = classifica.findIndex((c) => c.slug === slug);
  const c = classifica[pos];

  if (!pronto) return <span className="hud-chip" aria-hidden="true" style={{ width: 120, opacity: 0.4 }} />;
  if (!c) {
    return (
      <Link href="/#scegli" className="hud-chip vuota premibile">Scegli il castello</Link>
    );
  }
  return (
    <Link href={`/castelli/${c.slug}`} className="hud-chip premibile" aria-label={`${c.nome}, ${pos + 1}° posto, ${fmt.format(c.metri ?? 0)} metri`}>
      <span className="stemma-mini" style={{ background: c.colore, color: testoSu(c.colore) }}>{pos + 1}°</span>
      <span className="nome">{c.nome}</span>
      <span className="num">{fmt.format(c.metri ?? 0)} m</span>
    </Link>
  );
}

/** Griglia per scegliere il proprio castello (per i nuovi utenti). */
export function ScegliCastello({ castelli }: { castelli: Castello[] }) {
  const scelto = useCastelloScelto();
  const ordinati = [...castelli].sort((a, b) => a.id - b.id);
  return (
    <div className="scegli" role="group" aria-label="Scegli il tuo castello">
      {ordinati.map((c) => (
        <button
          key={c.id}
          type="button"
          className="premibile"
          aria-pressed={scelto === c.slug}
          onClick={() => {
            imposta(c.slug);
            document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="punto" style={{ background: c.colore }} />
          {c.nome}
        </button>
      ))}
    </div>
  );
}

/** Scheda del castello scelto (per chi torna). */
export function MioCastello({ classifica }: { classifica: Castello[] }) {
  const slug = useCastelloScelto();
  const pos = classifica.findIndex((c) => c.slug === slug);
  const c = classifica[pos];
  if (!c) return null;
  return (
    <section className="mio-castello">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span className="etichetta">Il tuo castello</span>
        <button type="button" className="link" onClick={() => imposta(null)}>Cambia</button>
      </div>
      <Link href={`/castelli/${c.slug}`} className="premibile" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="stemma" style={{ background: c.colore, color: testoSu(c.colore) }}>{pos + 1}°</span>
        <span style={{ minWidth: 0 }}>
          <b style={{ fontSize: 20, display: "block" }}>{c.nome}</b>
          <span className="meta">{fmt.format(c.metri ?? 0)} m · {pos + 1}° su {classifica.length}</span>
        </span>
        <span className="vai" style={{ marginLeft: "auto" }}>Vedi</span>
      </Link>
    </section>
  );
}

/** Riapre la guida di benvenuto senza perdere il castello scelto. */
export function RiapriGuida() {
  return (
    <button
      type="button"
      className="link"
      onClick={() => {
        document.documentElement.dataset.utente = "nuovo";
        document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      Come funziona 739
    </button>
  );
}
