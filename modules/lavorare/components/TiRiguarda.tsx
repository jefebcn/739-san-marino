"use client";

import { useState } from "react";

const euro = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });

/** Due domande per capire se la fattura elettronica interna tocca la tua attività (DD 133/2026, art. 2 e 11) */
export default function TiRiguarda({ soglia }: { soglia: number }) {
  const [a, setA] = useState<"operatori" | "altri" | null>(null);
  const [r, setR] = useState<"sopra" | "sotto" | null>(null);

  const Scelta = ({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" aria-pressed={attivo} onClick={onClick}
      className={`rounded-xl px-4 py-3 text-left text-[14px] font-medium leading-snug transition-colors active:scale-[0.98] ${attivo ? "bg-metallo text-su-accento" : "bg-fondo hover:bg-superficie-2"}`}>
      {children}
    </button>
  );

  const esito =
    a === "altri"
      ? { titolo: "Per queste fatture non cambia niente", testo: "L'obbligo riguarda solo le fatture verso altri operatori sammarinesi con codice operatore economico. Per le fatture verso l'Italia vale già la fattura elettronica del Decreto Delegato 5 agosto 2021 n.147." }
      : a === "operatori" && r === "sopra"
        ? { titolo: "Ti riguarda dal 1° gennaio 2027", testo: "Le fatture verso altri operatori sammarinesi vanno fatte in formato elettronico e mandate all'HUB SM. Puoi già cominciare adesso, per scelta: dal 1° ottobre 2026 è possibile." }
        : a === "operatori" && r === "sotto"
          ? { titolo: "Non sei obbligato", testo: "Puoi continuare con la fattura cartacea, con gli stessi dati di quella elettronica. Se scegli l'elettronica, o se un anno superi la soglia, poi resta obbligatoria anche negli anni dopo." }
          : null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5" aria-labelledby="t-riguarda">
      <h2 id="t-riguarda" className="text-[19px] font-semibold tracking-tight">Ti riguarda?</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium">A chi fai le fatture?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Scelta attivo={a === "operatori"} onClick={() => setA("operatori")}>Anche ad altre attività di San Marino</Scelta>
          <Scelta attivo={a === "altri"} onClick={() => { setA("altri"); setR(null); }}>Solo a privati o a clienti fuori San Marino</Scelta>
        </div>
      </fieldset>
      {a === "operatori" ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[14px] font-medium">I ricavi dell&apos;anno scorso</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Scelta attivo={r === "sopra"} onClick={() => setR("sopra")}><span className="font-mono">{euro.format(soglia)} €</span> o più</Scelta>
            <Scelta attivo={r === "sotto"} onClick={() => setR("sotto")}>Meno di <span className="font-mono">{euro.format(soglia)} €</span></Scelta>
          </div>
        </fieldset>
      ) : null}
      {esito ? (
        <div role="status" className="flex flex-col gap-1 rounded-xl bg-[#09090B] p-4 text-white">
          <span className="text-[16px] font-semibold">{esito.titolo}</span>
          <span className="text-[14px] leading-relaxed text-zinc-300">{esito.testo}</span>
        </div>
      ) : null}
    </section>
  );
}
