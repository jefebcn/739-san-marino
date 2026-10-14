"use client";

import { useEffect, useState } from "react";
import ActionCard from "@/components/ui/ActionCard";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Icona } from "@/components/Icona";
import { impostaCastello } from "@/components/Castello";
import type { Castello } from "@/lib/data";
import { esci, salvaProfilo } from "../auth";
import { useSessione } from "../store";
import Accesso, { Campo, NuovaPassword } from "./Accesso";
import SmrCard from "./SmrCard";
import { mioRating } from "@/modules/sport/api";
import { EtichetteScala, Scala } from "@/components/Quota";
import { Cime } from "@/components/Logo";
import { livello } from "@/lib/quota";

function Intestazione({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{titolo}</h1>
      <p className="text-[15px] text-testo-2">{testo}</p>
    </header>
  );
}

/** La quota personale in metri: si muove con i check-in agli eventi. */
function Quota() {
  // I metri personali arriveranno con i check-in: fino ad allora la quota parte da 0
  const metri = 0;
  const { prossimo, mancano } = livello(metri);
  return (
    <section className="pannello quota topo" aria-label="La tua quota">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span className="etichetta">La tua quota</span>
        <span className="etichetta">Vetta 739 m</span>
      </div>
      <span className="quota-num">{metri}<small>m</small></span>
      <div style={{ color: "var(--pannello-testo)" }}>
        <Scala metri={metri} grande />
        <EtichetteScala />
      </div>
      <p style={{ fontSize: 14, color: "var(--pannello-testo)" }}>
        {prossimo ? <>Mancano <b style={{ color: "#fff" }}>{mancano} m</b> a {prossimo.nome}. </> : null}
        Sali facendo check-in agli eventi: in arrivo.
      </p>
      <span className="cime"><Cime width={170} /></span>
    </section>
  );
}

/** Pagina profilo: accesso per gli ospiti, Card SMR ID e impostazioni per chi è connesso. */
export default function Profilo({ castelli }: { castelli: Castello[] }) {
  const { stato, utente, profilo, recupero, impostaRecupero, aggiornaProfilo } = useSessione();
  const [nome, setNome] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState<"fermo" | "in-corso" | "fatto" | "errore">("fermo");
  const [rating, setRating] = useState<number | null>(null);
  // Dalle azioni rapide: /profile?qr=1 apre subito il QR
  const [apriQr, setApriQr] = useState(false);
  useEffect(() => setApriQr(new URLSearchParams(window.location.search).get("qr") === "1"), []);
  const idUtente = utente?.id;
  useEffect(() => {
    if (idUtente) mioRating(idUtente).then(setRating);
  }, [idUtente]);

  if (stato === "caricamento") {
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-label="Caricamento">
        <div className="h-4 w-24 animate-pulse rounded bg-superficie" />
        <div className="aspect-[1.586] w-full animate-pulse rounded-3xl bg-superficie" />
      </div>
    );
  }

  if (stato === "ospite" || !utente) {
    return (
      <div className="flex flex-col gap-7">
        <Intestazione titolo="Entra in 739" testo="Un account, la tua tessera digitale: QR personale, castello e rating sportivo in un posto solo." />
        <Accesso castelli={castelli} />
      </div>
    );
  }

  if (!profilo) {
    return (
      <div className="flex flex-col gap-5">
        <Intestazione titolo="Quasi pronto" testo="Il tuo profilo non è ancora disponibile. Riprova tra qualche secondo." />
        <PrimaryButton variante="secondario" onClick={() => esci()}>Esci</PrimaryButton>
      </div>
    );
  }

  const castello = castelli.find((c) => c.id === profilo.castello_id) ?? null;
  const ordinati = [...castelli].sort((a, b) => a.id - b.id);
  const nomeCorrente = nome ?? profilo.nome ?? "";

  const salvaNome = async () => {
    const pulito = nomeCorrente.trim().slice(0, 60) || null;
    setSalvataggio("in-corso");
    const r = await salvaProfilo(profilo.id, { nome: pulito });
    if (r.errore) return setSalvataggio("errore");
    aggiornaProfilo({ nome: pulito });
    setNome(null);
    setSalvataggio("fatto");
  };

  return (
    <div className="flex flex-col gap-7">
      <Intestazione titolo={profilo.nome ? `Ciao, ${profilo.nome}` : "Il tuo SMR ID"} testo="Mostra il QR agli eventi e nei luoghi 739: tocca il codice per ingrandirlo." />

      {recupero ? <NuovaPassword fatto={() => impostaRecupero(false)} /> : null}

      <SmrCard nome={profilo.nome} tessera={profilo.tessera} castello={castello} rating={rating} apriQr={apriQr} key={apriQr ? "qr" : "card"} />

      <Quota />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Profilo</h2>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Campo etichetta="Nome sulla card" maxLength={60} value={nomeCorrente} onChange={(e) => { setNome(e.target.value); setSalvataggio("fermo"); }} />
          </div>
          <PrimaryButton variante="secondario" disabled={nome === null || salvataggio === "in-corso"} onClick={salvaNome}>
            {salvataggio === "in-corso" ? "…" : "Salva"}
          </PrimaryButton>
        </div>
        {salvataggio === "fatto" ? <p role="status" className="text-sm text-accento">Nome aggiornato.</p> : null}
        {salvataggio === "errore" ? <p role="alert" className="text-sm text-segnale">Non sono riuscito a salvare. Riprova.</p> : null}

        <span className="mt-2 text-[13px] font-medium text-testo-2">Castello</span>
        <div className="flex flex-wrap gap-1.5">
          {ordinati.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={profilo.castello_id === c.id}
              onClick={() => impostaCastello(c.slug)}
              className="flex items-center gap-1.5 rounded-xl border border-linea bg-superficie px-3 py-2 text-left text-[13px] font-medium aria-pressed:border-accento aria-pressed:bg-accento-tenue"
            >
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: c.colore }} />
              <span>{c.nome}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Account</h2>
        <ActionCard icona={<Icona nome="persona" />} tono="neutro" titolo={utente.email ?? "Email"} descrizione="Email di accesso" />
        <PrimaryButton variante="secondario" pieno onClick={() => esci()}>Esci</PrimaryButton>
        <p className="text-center text-xs text-testo-2">SMR ID è la tessera digitale di 739: non è un documento d&apos;identità.</p>
      </section>
    </div>
  );
}
