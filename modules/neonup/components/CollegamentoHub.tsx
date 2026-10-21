"use client";

import { useCallback, useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { CAMPO } from "@/modules/attivita/components/stile";
import { hubCollega, hubScollega, hubStato, type HubStato } from "../api";
import { Campo } from "./DatiAzienda";
import { ERRORE, useAzienda } from "./Guscio";

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/San_Marino" });
const STATI: Record<HubStato["stato"], string> = {
  scollegato: "Non collegata",
  da_verificare: "Token in verifica: entro un minuto",
  ok: "Collegata",
  errore: "Il token non funziona",
};

/** Collegamento dell'azienda all'HUB-SM con il TokenFE: lo mette il titolare, gli altri vedono lo stato */
export default function CollegamentoHub() {
  const az = useAzienda();
  const [hub, setHub] = useState<HubStato | null>(null);
  const [attivo, setAttivo] = useState(true);
  const [token, setToken] = useState("");
  const [ambiente, setAmbiente] = useState<"test" | "produzione">("test");
  const [modifica, setModifica] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const titolare = az.ruolo === "titolare";

  const carica = useCallback(() => hubStato(az.id).then((r) => { setHub(r.hub); setAttivo(r.attivo); setErrore(r.errore); }), [az.id]);
  useEffect(() => { carica(); }, [carica]);
  useEffect(() => {
    if (hub?.stato !== "da_verificare") return;
    const t = setInterval(carica, 10_000);
    return () => clearInterval(t);
  }, [hub?.stato, carica]);

  async function collega(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    const r = await hubCollega(az.id, token, ambiente);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setToken("");
    setModifica(false);
    carica();
  }

  async function scollega() {
    if (!confirm("Scollegare l'azienda dall'HUB-SM? Il token viene cancellato da NeonUp.")) return;
    const r = await hubScollega(az.id);
    if (r.errore) return setErrore(r.errore);
    carica();
  }

  if (!attivo) return null;
  const stato = hub?.stato ?? "scollegato";
  const mostraModulo = titolare && (modifica || stato === "scollegato");
  return (
    <section id="hub" className="flex flex-col gap-3 scroll-mt-24" aria-labelledby="t-hub">
      <h2 id="t-hub" className="text-[19px] font-semibold tracking-tight">Collegamento con l&apos;HUB-SM</h2>
      <div className={`flex flex-col gap-1.5 rounded-2xl p-5 ${stato === "ok" ? "bg-[#09090B] text-white" : "bg-superficie"}`}>
        <span className="text-[16px] font-semibold">{STATI[stato]}{hub?.ambiente && stato !== "scollegato" ? (hub.ambiente === "test" ? ", ambiente di test" : ", ambiente reale") : ""}</span>
        {stato === "ok" ? (
          <span className="text-[14px] text-zinc-300">
            Le fatture elettroniche partono da NeonUp e l&apos;esito arriva da solo. {hub?.scade ? `Il token scade il ${giorno.format(new Date(hub.scade))}.` : ""}
          </span>
        ) : null}
        {stato === "errore" && hub?.messaggio ? <span className="text-[14px] text-segnale">{hub.messaggio}</span> : null}
        {stato !== "scollegato" && titolare && !modifica ? (
          <span className="mt-1 flex flex-wrap gap-4 text-[14px] font-semibold">
            <button type="button" onClick={() => { setModifica(true); setAmbiente(hub?.ambiente ?? "test"); }} className={stato === "ok" ? "text-white underline underline-offset-2" : "text-accento"}>Cambia il token</button>
            <button type="button" onClick={scollega} className={stato === "ok" ? "text-[#F28B74]" : "text-segnale"}>Scollega</button>
          </span>
        ) : null}
      </div>

      {mostraModulo ? (
        <form onSubmit={collega} className="flex flex-col gap-4 rounded-2xl border border-linea p-5">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-testo-2">
            <li>Entra nel Portale PA (gov.sm, «Servizi Online») con il profilo dell&apos;azienda.</li>
            <li>Apri TribWEB, menu TribFE, «Richiesta Token», «Genera Nuovo Token». Vale un anno.</li>
            <li>Copialo qui. Per provare prima, usa un token generato su TribWEB di TEST e scegli «Test».</li>
          </ol>
          <Campo etichetta="Ambiente" aiuto="I token di test non valgono nell'ambiente reale, e viceversa. In test le fatture non hanno valore fiscale.">
            <select value={ambiente} onChange={(e) => setAmbiente(e.target.value as "test" | "produzione")} className={`${CAMPO} h-12`}>
              <option value="test">Test (TribWEB di TEST)</option>
              <option value="produzione">Reale</option>
            </select>
          </Campo>
          <Campo etichetta="TokenFE" aiuto="Resta cifrato nel database di 739 e non si vede più: lo usa solo NeonUp per parlare con l'HUB-SM.">
            <input type="password" required autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className={`${CAMPO} h-12 font-mono`} />
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton type="submit" disabled={invio}>Collega</PrimaryButton>
            {modifica ? <button type="button" onClick={() => setModifica(false)} className="text-[14px] font-semibold text-testo-2">Annulla</button> : null}
          </div>
        </form>
      ) : !titolare && stato === "scollegato" ? (
        <p className="text-[14px] text-testo-2">Il collegamento lo fa il titolare dell&apos;azienda con il suo TokenFE.</p>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
    </section>
  );
}
