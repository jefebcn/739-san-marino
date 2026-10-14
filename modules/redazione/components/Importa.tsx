"use client";

import Link from "next/link";
import { useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { importaRedazione } from "@/modules/coda/api";
import { leggiJson, valida, type Esito, type Riferimenti } from "../importa";

const NOMI_TIPO: Record<string, string> = { luogo: "Luogo", evento: "Evento", avviso: "Avviso", contenuto: "Contenuto" };

/** Incolla un file JSON, controlla elemento per elemento, manda in coda quelli validi. */
export default function Importa({ riferimenti }: { riferimenti: Riferimenti }) {
  const [grezzo, setGrezzo] = useState("");
  const [esiti, setEsiti] = useState<Esito[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState<number | null>(null);

  const controlla = () => {
    setFatto(null);
    const { elementi, errore: e } = leggiJson(grezzo);
    setErrore(e);
    setEsiti(elementi ? valida(elementi, riferimenti) : null);
  };

  const validi = esiti?.filter((x) => x.pronto) ?? [];
  const sbagliati = esiti?.filter((x) => !x.pronto) ?? [];

  const invia = async () => {
    setInvio(true);
    setErrore(null);
    const r = await importaRedazione(validi.map((x) => x.pronto!));
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setFatto(r.n);
    setEsiti(null);
    setGrezzo("");
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-testo-2">Contenuto del file JSON</span>
        <textarea
          rows={12}
          value={grezzo}
          onChange={(e) => {
            setGrezzo(e.target.value);
            setEsiti(null);
          }}
          spellCheck={false}
          placeholder='[{"tipo": "luogo", "nome": "…", "categoria": "ufficio", …}]'
          className="w-full rounded-xl border border-linea bg-superficie px-4 py-3 font-mono text-[13px] leading-relaxed outline-none placeholder:text-testo-2/60 focus:border-accento"
        />
        <span className="text-xs text-testo-2">
          Un elenco di luoghi, eventi, avvisi e contenuti.{" "}
          <a href="https://github.com/jefebcn/739-san-marino/blob/main/docs/formato-importazione.md" target="_blank" rel="noreferrer" className="font-semibold text-accento underline">
            Come scrivere il file
          </a>
        </span>
      </label>
      <PrimaryButton variante="secondario" onClick={controlla} disabled={!grezzo.trim()}>Controlla</PrimaryButton>

      {fatto !== null ? (
        <p role="status" className="rounded-xl bg-accento-tenue px-4 py-3 text-sm text-accento">
          {fatto === 1 ? "1 elemento è in coda." : `${fatto} elementi sono in coda.`}{" "}
          <Link href="/admin/coda" className="font-semibold underline">Apri la coda</Link> per approvarli.
        </p>
      ) : null}
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}

      {esiti ? (
        <section className="flex flex-col gap-3" aria-live="polite">
          <p className="text-[15px]">
            <b className="font-mono font-medium">{validi.length}</b> {validi.length === 1 ? "valido" : "validi"},{" "}
            <b className={`font-mono font-medium ${sbagliati.length ? "text-segnale" : ""}`}>{sbagliati.length}</b> con errori, su {esiti.length}.
          </p>
          <ul className="divide-y divide-linea rounded-2xl bg-superficie">
            {esiti.map((x) => (
              <li key={x.indice} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-0.5 shrink-0 ${x.pronto ? "text-ok" : "text-segnale"}`}><Icona nome={x.pronto ? "scudo" : "allerta"} size={18} /></span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-medium leading-snug">
                    <span className="font-mono text-xs text-testo-2">{x.indice + 1}</span> {NOMI_TIPO[x.tipo] ?? "Elemento"}: {x.nome}
                  </span>
                  {x.errori.map((m) => <span key={m} className="text-[13px] text-segnale">{m}</span>)}
                  {x.avvisi.map((m) => <span key={m} className="text-[13px] text-testo-2">{m}</span>)}
                </span>
              </li>
            ))}
          </ul>
          {validi.length ? (
            <PrimaryButton onClick={invia} disabled={invio}>
              {invio ? "Invio…" : validi.length === 1 ? "Metti in coda 1 elemento" : `Metti in coda ${validi.length} elementi`}
            </PrimaryButton>
          ) : null}
          {validi.length && sbagliati.length ? <p className="text-[13px] text-testo-2">Quelli con errori restano fuori: correggili nel file e incollali di nuovo.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
