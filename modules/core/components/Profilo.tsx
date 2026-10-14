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
import { livello } from "@/lib/quota";
import { conteggioBozze } from "@/modules/coda/api";
import { mieiRuoli, NESSUN_RUOLO, type Ruoli } from "../ruoli";
import { mieiMetri, type Movimento } from "@/modules/eventi/api";

function Intestazione({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">{titolo}</h1>
      <p className="text-[15px] text-testo-2">{testo}</p>
    </header>
  );
}

const giornoBreve = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "Europe/San_Marino" });

/** La quota personale in metri: sale con i check-in agli eventi (miei_metri, migrazione 0023). */
function Quota() {
  const [dati, setDati] = useState<{ totale: number; movimenti: Movimento[] } | null>(null);
  useEffect(() => {
    mieiMetri().then((r) => setDati({ totale: r.totale, movimenti: r.movimenti }));
  }, []);
  const metri = dati?.totale ?? 0;
  const { attuale, prossimo, mancano } = livello(metri);
  return (
    <>
      <section className="pannello quota topo" aria-label="La tua quota" aria-busy={!dati}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <span className="etichetta">La tua quota, {attuale.nome}</span>
          <span className="etichetta">Vetta 739 m</span>
        </div>
        <span className="quota-num">{dati ? metri : "–"}<small>m</small></span>
        <div style={{ color: "var(--pannello-testo)" }}>
          <Scala metri={metri} grande />
          <EtichetteScala />
        </div>
        <p style={{ fontSize: 14, color: "var(--pannello-testo)" }}>
          {prossimo ? <>Mancano <b style={{ color: "#fff" }}>{mancano} m</b> a {prossimo.nome}. </> : <>Sei in vetta. </>}
          Sali facendo check-in agli eventi: inquadra il QR di 739 che trovi sul posto.
        </p>
      </section>
      {dati?.movimenti.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="titolo-movimenti">
          <h2 id="titolo-movimenti" className="text-xl font-semibold tracking-tight">Ultimi metri</h2>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {dati.movimenti.map((m, i) => (
              <li key={`${m.creato_il}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">{m.titolo ?? (m.motivo === "checkin" ? "Check-in" : m.motivo)}</span>
                  <span className="text-[13px] text-testo-2">{giornoBreve.format(new Date(m.creato_il))}</span>
                </span>
                <span className="font-mono text-[15px] font-medium text-accento">{m.metri > 0 ? "+" : ""}{m.metri} m</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
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
  // Dal QR di un evento: /profile?torna=/eventi/<id>/checkin?c=… riporta lì appena l'accesso è fatto
  // (ricordato anche nella scheda del browser, per chi conferma la registrazione dal link nell'email)
  useEffect(() => {
    const valido = (t: string | null) => (t && t.startsWith("/") && !t.startsWith("//") ? t : null);
    let torna = valido(new URLSearchParams(window.location.search).get("torna"));
    try {
      if (torna) sessionStorage.setItem("739-torna", torna);
      else torna = valido(sessionStorage.getItem("739-torna"));
    } catch {}
    if (stato !== "connesso" || !torna) return;
    try {
      sessionStorage.removeItem("739-torna");
    } catch {}
    window.location.replace(torna);
  }, [stato]);
  const idUtente = utente?.id;
  useEffect(() => {
    if (idUtente) mioRating(idUtente).then(setRating);
  }, [idUtente]);
  // Redazione e amministratori vedono i loro pannelli; la coda dice quante bozze aspettano
  const [ruoli, setRuoli] = useState<Ruoli>(NESSUN_RUOLO);
  const [daVedere, setDaVedere] = useState<number | null>(null);
  useEffect(() => {
    if (!idUtente) return;
    mieiRuoli().then(async (r) => {
      setRuoli(r);
      if (!r.redattore) return;
      const { conteggio } = await conteggioBozze();
      if (conteggio) setDaVedere((conteggio?.nuovo ?? 0) + (conteggio?.segnalazioni ?? 0));
    });
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
      </section>

      {ruoli.redattore || ruoli.organizzatore ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{ruoli.amministratore ? "Amministrazione" : ruoli.redattore ? "Redazione" : "Organizzatore"}</h2>
          {ruoli.redattore ? (
            <ActionCard
              href="/admin/coda"
              icona={<Icona nome="stampa" />}
              tono="neutro"
              titolo="Coda delle bozze"
              descrizione={daVedere === null ? "Bozze e segnalazioni" : daVedere === 1 ? "1 da vedere" : `${daVedere} da vedere`}
            />
          ) : null}
          {ruoli.redattore ? (
            <ActionCard href="/admin/contenuti" icona={<Icona nome="storie" />} tono="neutro" titolo="Contenuti" descrizione="Bollettino, rubriche e storie" />
          ) : null}
          {ruoli.amministratore ? (
            <ActionCard href="/admin/numeri" icona={<Icona nome="numeri" />} tono="neutro" titolo="Numeri" descrizione="SMR ID, chi torna, eventi e schede verificate" />
          ) : null}
          {ruoli.redattore ? (
            <ActionCard href="/admin/importa" icona={<Icona nome="importa" />} tono="neutro" titolo="Importa" descrizione="Luoghi, eventi, avvisi e contenuti da un file JSON" />
          ) : null}
          <ActionCard href="/profile/eventi" icona={<Icona nome="eventi" />} tono="neutro" titolo="I miei eventi" descrizione="Pubblica e modifica i tuoi eventi" />
          <p className="text-[13px] text-testo-2">{ruoli.amministratore ? "Sei amministratore: vedi anche i pannelli della redazione." : ruoli.redattore ? "Sei nella redazione di 739." : "Sei organizzatore di eventi su 739."}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <PrimaryButton variante="secondario" pieno onClick={() => esci()}>Esci</PrimaryButton>
        <p className="text-center text-xs text-testo-2">SMR ID è la tessera digitale di 739: non è un documento d&apos;identità.</p>
      </section>
    </div>
  );
}
