import type { Metadata } from "next";
import ActionCard from "@/components/ui/ActionCard";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Icona } from "@/components/Icona";
import SmrCard from "@/modules/core/components/SmrCard";

export const metadata: Metadata = { title: "Design system · 739", robots: { index: false } };

// Classi scritte per intero: Tailwind non genera classi composte a runtime
const OTTONE = [
  [100, "bg-ottone-100"],
  [300, "bg-ottone-300"],
  [400, "bg-ottone-400"],
  [500, "bg-ottone-500"],
  [600, "bg-ottone-600"],
  [700, "bg-ottone-700"],
  [800, "bg-ottone-800"],
] as const;
const RUOLI = [
  ["fondo", "bg-fondo"],
  ["superficie", "bg-superficie"],
  ["superficie-2", "bg-superficie-2"],
  ["pannello", "bg-pannello"],
  ["accento", "bg-accento"],
  ["segnale", "bg-segnale"],
] as const;

/** Vetrina del design system: colori, caratteri e componenti di base. */
export default function DesignSystem() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-testo-2">Design system</span>
        <h1 className="text-[34px] font-bold leading-none tracking-tight">739 · Base</h1>
        <p className="text-[15px] text-testo-2">Zinc profondo, ottone per le azioni, Inter per i testi, JetBrains Mono per i numeri.</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Ottone</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {OTTONE.map(([t, classe]) => (
            <div key={t} className="flex flex-col gap-1">
              <span className={`h-12 rounded-xl ${classe}`} />
              <span className="text-center font-mono text-[10px] text-testo-2">{t}</span>
            </div>
          ))}
        </div>
        <div className="h-12 rounded-2xl bg-metallo shadow-lucido" aria-label="Finitura metallica" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Ruoli</h2>
        <div className="grid grid-cols-3 gap-2">
          {RUOLI.map(([nome, classe]) => (
            <div key={nome} className="flex items-center gap-2 rounded-xl border border-linea p-2">
              <span className={`size-7 shrink-0 rounded-lg border border-linea ${classe}`} />
              <span className="truncate font-mono text-[11px] text-testo-2">{nome}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Caratteri</h2>
        <p className="text-[34px] font-bold leading-none tracking-tight">Titolo 34</p>
        <p className="text-xl font-semibold tracking-tight">Sezione 20</p>
        <p className="text-[15px]">Testo 15 · Inter regular, leggibile anche in movimento.</p>
        <p className="text-sm text-testo-2">Descrizione 14 · zinc-400 sul fondo scuro.</p>
        <p className="font-mono text-2xl font-semibold tabular-nums">1.742 · 07:45 · #A39F</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">PrimaryButton</h2>
        <PrimaryButton pieno icona={<Icona nome="sport" />}>Trova una partita</PrimaryButton>
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton variante="secondario">Secondario</PrimaryButton>
          <PrimaryButton variante="fantasma">Fantasma</PrimaryButton>
        </div>
        <div className="flex gap-2">
          <PrimaryButton dimensione="sm">Piccolo</PrimaryButton>
          <PrimaryButton dimensione="sm" disabled>Disattivato</PrimaryButton>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">ActionCard</h2>
        <ActionCard href="/eventi" icona={<Icona nome="eventi" />} titolo="Calcetto a Serravalle" descrizione="Giovedì 20:30 · mancano 3 giocatori" extra={<span className="rounded-md bg-accento-tenue px-2 py-0.5 font-mono text-[11px] font-semibold text-accento">+25 m</span>} />
        <ActionCard href="/utili" icona={<Icona nome="mappa" />} tono="neutro" titolo="Campi vicini" descrizione="Scansione della posizione per trovare dove si gioca" />
        <ActionCard icona={<Icona nome="scudo" />} tono="allerta" titolo="Emergenza" descrizione="Chiama il 112" />
        <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_20%_20%,#C9A45C55,transparent_55%),radial-gradient(circle_at_80%_70%,#5EB6E455,transparent_50%)] p-4">
          <ActionCard vetro href="/mappa" icona={<Icona nome="pin" />} titolo="Scheda in vetro" descrizione="Per pannelli sopra mappe e immagini" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Card SMR ID</h2>
        <p className="text-sm text-testo-2">Esempio con dati finti. Tocca il QR per ingrandirlo.</p>
        <SmrCard nome="Nome Cognome" tessera="739-A3F9-K2" castello={{ id: 2, slug: "borgo-maggiore", nome: "Borgo Maggiore", colore: "#F3A712" }} rating={1500} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">BottomNav</h2>
        <p className="text-sm text-testo-2">È la barra in fondo a questa pagina: vetro smerigliato, voce attiva in ottone. Voci: Home · Sport · Mappa · Eventi · ID.</p>
      </section>
    </div>
  );
}
