"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { PuntoCategoria } from "@/components/Segnaposto";
import { livello } from "@/lib/quota";
import { useSessione } from "@/modules/core/store";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { OGNI, SOGLIE, mieiPremi, premiAttivi, type MioPremio, type PremioAttivo } from "../api";

type Castello = { id: number; nome: string; colore: string };
const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });

/** I premi dei metri, per livello; con l'SMR ID quelli che puoi ritirare adesso e quelli già ritirati */
export default function ElencoPremi({ iniziali, castelli }: { iniziali: PremioAttivo[]; castelli: Castello[] }) {
  const { stato } = useSessione();
  const [premi, setPremi] = useState(iniziali);
  const [metri, setMetri] = useState<number | null>(null);
  const [miei, setMiei] = useState<MioPremio[]>([]);
  const [soloMiei, setSoloMiei] = useState(false);

  useEffect(() => {
    if (stato !== "connesso") return;
    premiAttivi(null).then((r) => { if (!r.errore) setPremi(r.premi); });
    mieiPremi().then((r) => setMiei(r.premi));
    supabaseBrowser().rpc("miei_metri").then(({ data }) => setMetri((data as { totale?: number } | null)?.totale ?? 0));
  }, [stato]);

  const lista = soloMiei ? premi.filter((p) => p.posso) : premi;
  const possibili = premi.filter((p) => p.posso).length;
  const mio = metri !== null ? livello(metri) : null;

  return (
    <div className="flex flex-col gap-6">
      {stato === "connesso" && mio ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-[#09090B] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-col">
            <span className="text-[13px] text-zinc-400">I tuoi metri</span>
            <span className="voce-logo text-[40px] text-ottone-300">{metri}<small className="ml-1 text-[16px]">m</small></span>
            <span className="text-[14px] text-zinc-300">{mio.attuale.nome}{mio.prossimo ? `, ${mio.mancano} m a ${mio.prossimo.nome}` : ""}</span>
          </span>
          <span className="flex flex-col gap-2 sm:items-end">
            <span className="text-[15px]"><b className="font-mono font-medium">{possibili}</b> {possibili === 1 ? "premio che puoi ritirare" : "premi che puoi ritirare"} adesso</span>
            <Link href="/profile?qr=1" className="taglio-piccolo w-fit bg-white px-4 py-1.5 text-[14px] font-semibold text-[#09090B]">Il mio QR</Link>
          </span>
        </div>
      ) : stato === "ospite" ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-superficie p-5">
          <p className="text-[15px] leading-relaxed">I metri si guadagnano con l&apos;SMR ID: check-in agli eventi, partite, tornei di castello. Più sali, più premi puoi ritirare.</p>
          <Link href="/profile?torna=/premi" className="taglio-piccolo w-fit bg-metallo px-4 py-1.5 text-[14px] font-semibold text-su-accento">Entra con SMR ID</Link>
        </div>
      ) : null}

      {stato === "connesso" && possibili ? (
        <div className="flex gap-2">
          {[false, true].map((v) => (
            <button key={String(v)} type="button" aria-pressed={soloMiei === v} onClick={() => setSoloMiei(v)}
              className={`h-10 rounded-xl px-4 text-[14px] font-medium ${soloMiei === v ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>{v ? "Che puoi ritirare" : "Tutti"}</button>
          ))}
        </div>
      ) : null}

      {lista.length ? (
        SOGLIE.map((s) => {
          const qui = lista.filter((p) => p.metri_min === s.metri);
          if (!qui.length) return null;
          return (
            <section key={s.metri} className="flex flex-col gap-3" aria-labelledby={`liv-${s.metri}`}>
              <h2 id={`liv-${s.metri}`} className="flex items-baseline gap-2 text-[19px] font-semibold tracking-tight">
                {s.nome} <span className="text-[14px] font-normal text-testo-2">{s.riga}</span>
              </h2>
              <ul className="grid gap-2.5 lg:grid-cols-2">
                {qui.map((p) => {
                  const c = castelli.find((x) => x.id === p.castello_id);
                  return (
                    <li key={p.id}>
                      <Link prefetch={false} href={`/luoghi/${p.luogo_id}`} className="flex h-full items-start gap-3 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
                        <PuntoCategoria categoria={p.categoria} grande />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[16px] font-semibold leading-snug">{p.titolo}</span>
                          <span className="text-[14px]">{p.luogo}</span>
                          {p.descrizione ? <span className="text-[13px] leading-snug text-testo-2">{p.descrizione}</span> : null}
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[12px] text-testo-2">
                            {c ? <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: c.colore }} />{c.nome}</span> : null}
                            <span>{OGNI[p.ogni].riga}</span>
                            {p.rimasti !== null ? <span>{p.rimasti} rimasti</span> : null}
                            {p.al ? <span>fino al {giorno.format(new Date(`${p.al}T12:00:00Z`))}</span> : null}
                          </span>
                          {p.posso === true ? <span className="mt-1 w-fit rounded-md bg-metallo px-2 py-0.5 text-[12px] font-semibold text-su-accento">Puoi ritirarlo</span> : null}
                        </span>
                        <span className="mt-1 shrink-0 text-testo-2"><Icona nome="avanti" size={16} /></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      ) : (
        <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] leading-relaxed text-testo-2">
          {soloMiei ? "Nessun premio da ritirare adesso: continua a salire." : "I primi premi arrivano dalle attività del territorio. Ne hai una? Offri un premio a chi sale con i metri."}
        </p>
      )}

      {miei.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="t-ritirati">
          <h2 id="t-ritirati" className="text-[19px] font-semibold tracking-tight">I premi che hai ritirato</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {miei.map((m) => (
              <li key={`${m.titolo}-${m.ritirato_il}`} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                <span><b className="font-semibold">{m.titolo}</b>, {m.luogo}</span>
                <span className="shrink-0 text-testo-2">{giorno.format(new Date(m.ritirato_il))}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
