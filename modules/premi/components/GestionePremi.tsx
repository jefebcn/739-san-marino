"use client";

import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { CAMPO } from "@/modules/attivita/components/stile";
import { useSessione } from "@/modules/core/store";
import LettoreQr from "./LettoreQr";
import { OGNI, SOGLIE, controllaPremio, nomeSoglia, premiLuogo, riscattaPremio, salvaPremio, tesseraDa, type Controllo, type Ogni, type PremioLuogo } from "../api";

const ERRORE = "rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale";
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());
const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "UTC" });
const leggi = (d: string) => giorno.format(new Date(`${d}T12:00:00Z`));

const ESITI: Record<Controllo["esito"], string> = {
  ok: "Può ritirare il premio.",
  consegnato: "Premio consegnato. Gli arriva un avviso sul telefono, se li ha accesi.",
  pochi_metri: "Non ha ancora i metri per questo premio.",
  gia_ritirato: "L'ha già ritirato in questo periodo.",
  chiuso: "Il premio è spento, scaduto o finito.",
  tessera: "Questa tessera non c'è: controlla il numero o rileggi il QR.",
};

/** Il titolare: consegna un premio leggendo il QR dell'SMR ID, e crea o modifica i premi della sua scheda */
export default function GestionePremi({ luogo }: { luogo: string }) {
  const { stato } = useSessione();
  const [premi, setPremi] = useState<PremioLuogo[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [modifica, setModifica] = useState<PremioLuogo | "nuovo" | null>(null);

  const carica = useCallback(() => premiLuogo(luogo).then((r) => { setPremi(r.premi); setErrore(r.errore); }), [luogo]);
  useEffect(() => {
    if (stato === "connesso") carica();
  }, [stato, carica]);

  if (stato === "caricamento" || (stato === "connesso" && premi === null && !errore)) return <div className="h-60 animate-pulse rounded-2xl bg-superficie" />;
  if (stato === "ospite") return <p className={ERRORE}>Entra con l&apos;SMR ID per gestire i premi della tua attività.</p>;
  if (errore && !premi?.length) return <p role="alert" className={ERRORE}>{errore}</p>;

  const aperti = (premi ?? []).filter((p) => p.aperto);
  return (
    <div className="flex flex-col gap-8">
      {aperti.length ? <Consegna premi={aperti} onFatto={carica} /> : null}

      <section className="flex flex-col gap-3" aria-labelledby="t-premi">
        <div className="flex items-center justify-between gap-3">
          <h2 id="t-premi" className="text-[19px] font-semibold tracking-tight">I tuoi premi</h2>
          {modifica === null ? (
            <button type="button" onClick={() => setModifica("nuovo")} className="taglio-piccolo flex h-9 items-center gap-1.5 bg-metallo px-4 text-[14px] font-semibold text-su-accento">
              <Icona nome="piu" size={16} /> Nuovo premio
            </button>
          ) : null}
        </div>
        {modifica !== null ? (
          <ModuloPremio luogo={luogo} premio={modifica === "nuovo" ? null : modifica} onFine={() => { setModifica(null); carica(); }} />
        ) : null}
        {premi?.length ? (
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {premi.map((p) => (
              <li key={p.id} className={`flex items-start gap-3 p-4 ${p.aperto ? "" : "opacity-60"}`}>
                <span className="taglio-piccolo shrink-0 bg-metallo py-0.5 text-[12px] font-semibold text-su-accento">{nomeSoglia(p.metri_min)}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{p.titolo}</span>
                  <span className="text-[13px] text-testo-2">
                    {OGNI[p.ogni].riga}{p.quanti ? `, ${p.quanti - p.ritirati} rimasti su ${p.quanti}` : ""}{p.al ? `, fino al ${leggi(p.al)}` : ""}
                  </span>
                  <span className="text-[13px]">
                    <b className="font-mono font-medium">{p.ritirati}</b> ritirati in tutto, <b className="font-mono font-medium">{p.ritirati_30}</b> negli ultimi 30 giorni
                    {!p.aperto ? <span className="text-testo-2">, {p.attivo ? "scaduto o finito" : "spento"}</span> : null}
                  </span>
                </span>
                <button type="button" onClick={() => setModifica(p)} className="shrink-0 text-[14px] font-semibold text-accento">Modifica</button>
              </li>
            ))}
          </ul>
        ) : modifica === null ? (
          <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] leading-relaxed text-testo-2">
            Nessun premio ancora. Un caffè, uno sconto, un ingresso: chi sale con i metri lo vede nella scheda e nella pagina dei premi, e viene da te.
          </p>
        ) : null}
      </section>

      <p className="text-[13px] leading-relaxed text-testo-2">
        I premi li offri tu e li consegni tu: 739 controlla solo i metri e quante volte sono stati ritirati. Al massimo 5 premi attivi per scheda. Per ora è gratis, come prova.
      </p>
    </div>
  );
}

/** Consegna: QR o numero della tessera, poi il controllo e il pulsante «Consegna» */
function Consegna({ premi, onFatto }: { premi: PremioLuogo[]; onFatto: () => void }) {
  const [premio, setPremio] = useState(premi[0].id);
  const [lettore, setLettore] = useState(false);
  const [tessera, setTessera] = useState("");
  const [controllo, setControllo] = useState<Controllo | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const scelto = premi.find((p) => p.id === premio) ?? premi[0];

  async function controlla(testo: string) {
    setErrore(null);
    setControllo(null);
    const t = tesseraDa(testo);
    if (!t) return setControllo({ esito: "tessera" });
    setTessera(t);
    setInvio(true);
    const r = await controllaPremio(scelto.id, t);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setControllo(r.controllo);
  }

  async function consegna() {
    setInvio(true);
    const r = await riscattaPremio(scelto.id, tessera);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setControllo(r.controllo);
    if (r.controllo?.esito === "consegnato") onFatto();
  }

  const nuovo = () => { setControllo(null); setTessera(""); setErrore(null); };
  const buono = controllo?.esito === "ok" || controllo?.esito === "consegnato";

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-[#09090B] p-5 text-white" aria-labelledby="t-consegna">
      <h2 id="t-consegna" className="text-[19px] font-semibold tracking-tight">Consegna un premio</h2>
      {premi.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {premi.map((p) => (
            <button key={p.id} type="button" aria-pressed={p.id === premio} onClick={() => { setPremio(p.id); nuovo(); }}
              className={`h-10 rounded-xl px-4 text-[14px] font-medium ${p.id === premio ? "bg-white text-[#09090B]" : "bg-white/10 text-white hover:bg-white/15"}`}>{p.titolo}</button>
          ))}
        </div>
      ) : (
        <p className="text-[15px] text-zinc-300">{scelto.titolo}, da {nomeSoglia(scelto.metri_min)}</p>
      )}

      {controllo ? (
        <div className={`flex flex-col gap-3 rounded-xl p-4 ${buono ? "bg-white text-[#09090B]" : "bg-white/10"}`} role="status">
          {controllo.nome || controllo.metri !== undefined ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[19px] font-semibold">{controllo.nome ?? "SMR ID"}</span>
              {controllo.metri !== undefined ? <span className="font-mono text-[14px]">{controllo.metri} m</span> : null}
            </p>
          ) : null}
          <p className="text-[15px]">{ESITI[controllo.esito]}</p>
          <div className="flex flex-wrap gap-2">
            {controllo.esito === "ok" ? (
              <button type="button" disabled={invio} onClick={consegna} className="taglio h-11 bg-[#09090B] px-6 text-[15px] font-semibold text-white disabled:opacity-50">{invio ? "Registro…" : "Consegna"}</button>
            ) : null}
            <button type="button" onClick={nuovo} className={`h-11 rounded-xl px-4 text-[14px] font-semibold ${buono ? "bg-zinc-100" : "bg-white/10"}`}>
              {controllo.esito === "consegnato" ? "Un altro cliente" : "Riprova"}
            </button>
          </div>
        </div>
      ) : lettore ? (
        <LettoreQr onLetto={(t) => { setLettore(false); controlla(t); }} onChiudi={() => setLettore(false)} />
      ) : (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setLettore(true)} className="taglio flex h-12 w-fit items-center gap-2 bg-white px-6 text-[15px] font-semibold text-[#09090B]">
            <Icona nome="qr" size={20} piatta /> Leggi il QR dell&apos;SMR ID
          </button>
          <form onSubmit={(e) => { e.preventDefault(); controlla(tessera); }} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="tessera">Numero della tessera</label>
            <input id="tessera" value={tessera} onChange={(e) => setTessera(e.target.value)} placeholder="739-XXXX-XX" autoCapitalize="characters" autoComplete="off"
              className="h-11 w-44 rounded-xl border border-white/20 bg-white/10 px-3 font-mono text-[16px] text-white placeholder:text-zinc-500" />
            <button type="submit" disabled={invio || !tessera.trim()} className="h-11 rounded-xl bg-white/10 px-4 text-[14px] font-semibold disabled:opacity-50">Controlla</button>
          </form>
          <p className="text-[13px] text-zinc-400">Il cliente apre il suo SMR ID e ti mostra il QR, o ti legge il numero sotto la carta.</p>
        </div>
      )}
      {errore ? <p role="alert" className="text-sm text-[#F28B74]">{errore}</p> : null}
    </section>
  );
}

function ModuloPremio({ luogo, premio, onFine }: { luogo: string; premio: PremioLuogo | null; onFine: () => void }) {
  const [titolo, setTitolo] = useState(premio?.titolo ?? "");
  const [descrizione, setDescrizione] = useState(premio?.descrizione ?? "");
  const [metri, setMetri] = useState(premio?.metri_min ?? 200);
  const [ogni, setOgni] = useState<Ogni>(premio?.ogni ?? "mese");
  const [quanti, setQuanti] = useState(premio?.quanti ? String(premio.quanti) : "");
  const [dal, setDal] = useState(premio?.dal ?? oggi());
  const [al, setAl] = useState(premio?.al ?? "");
  const [attivo, setAttivo] = useState(premio?.attivo ?? true);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    const r = await salvaPremio(luogo, premio?.id ?? null, { titolo: titolo.trim(), descrizione: descrizione.trim(), metri_min: metri, ogni, quanti: quanti ? Number(quanti) : null, dal, al: al || null, attivo });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onFine();
  }

  const scelta = (on: boolean) => `rounded-xl px-3 py-2.5 text-left transition-colors ${on ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`;
  return (
    <form onSubmit={salva} className="flex flex-col gap-4 rounded-2xl border border-linea p-4">
      <label className="flex flex-col gap-1.5 text-[14px] font-medium">Il premio
        <input required value={titolo} onChange={(e) => setTitolo(e.target.value)} minLength={3} maxLength={60} placeholder="Caffè offerto" className={`h-12 ${CAMPO}`} />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium"><span>Come funziona <span className="font-normal text-testo-2">(facoltativo)</span></span>
        <textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} maxLength={240} rows={2} placeholder="Al banco, con qualsiasi consumazione" className={`py-3 ${CAMPO}`} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium">Per chi è salito fino a</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SOGLIE.map((s) => (
            <button key={s.metri} type="button" aria-pressed={metri === s.metri} onClick={() => setMetri(s.metri)} className={scelta(metri === s.metri)}>
              <span className="block text-[15px] font-semibold">{s.nome}</span>
              <span className={`block text-[12px] first-letter:uppercase ${metri === s.metri ? "text-zinc-300" : "text-testo-2"}`}>{s.riga}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium">Quante volte per persona</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(OGNI) as Ogni[]).map((o) => (
            <button key={o} type="button" aria-pressed={ogni === o} onClick={() => setOgni(o)} className={`h-10 rounded-xl px-4 text-[14px] font-medium ${ogni === o ? "bg-metallo text-su-accento" : "bg-superficie hover:bg-superficie-2"}`}>{OGNI[o].nome}</button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Quanti in tutto
          <input type="number" min={1} max={10000} inputMode="numeric" value={quanti} onChange={(e) => setQuanti(e.target.value)} placeholder="Senza limite" className={`h-12 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">Dal
          <input type="date" required value={dal} onChange={(e) => setDal(e.target.value)} className={`h-12 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium"><span>Al <span className="font-normal text-testo-2">(facoltativo)</span></span>
          <input type="date" value={al} min={dal} onChange={(e) => setAl(e.target.value)} className={`h-12 ${CAMPO}`} />
        </label>
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" checked={attivo} onChange={(e) => setAttivo(e.target.checked)} className="size-5 accent-[#09090B]" />
        Attivo: si vede nella scheda e si può consegnare
      </label>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={invio} className="taglio h-11 bg-metallo px-6 text-[15px] font-semibold text-su-accento disabled:opacity-50">{invio ? "Salvo…" : "Salva il premio"}</button>
        <button type="button" onClick={onFine} className="h-11 rounded-xl px-4 text-[14px] font-semibold text-testo-2">Annulla</button>
      </div>
    </form>
  );
}
