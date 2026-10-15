"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import Tano from "@/components/Tano";
import { PER_LAVORO } from "@/lib/eventi-lavoro";
import { mieiRuoli } from "@/modules/core/ruoli";
import { caricaFoto, mieiEventi, proponiEvento, salvaMioEvento, type DatiProposta } from "../api";

export type LuogoScelta = { id: string; nome: string };
export type CastelloScelta = { id: number; nome: string };

const CAMPO =
  "w-full rounded-xl border border-linea bg-superficie px-4 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento";
const PER_CHI = ["Tutti", "Famiglie e bambini", "Ragazzi", "Adulti", PER_LAVORO];

/** Ora di San Marino di un istante ISO: «2026-10-17» e «21:00» */
function giornoOra(iso: string | null) {
  if (!iso) return { giorno: "", ora: "" };
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/San_Marino", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { giorno: `${v("year")}-${v("month")}-${v("day")}`, ora: `${v("hour")}:${v("minute")}` };
}

function Campo({ testo, nota, children }: { testo: string; nota?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{testo}</span>
      {children}
      {nota ? <span className="text-xs text-testo-2">{nota}</span> : null}
    </label>
  );
}

/**
 * Proponi un evento (passo 1.1). Chiunque propone: la proposta va nella coda della redazione.
 * Gli organizzatori pubblicano subito e, con ?id=, modificano i propri eventi.
 */
export default function ProponiEvento({ luoghi, castelli }: { luoghi: LuogoScelta[]; castelli: CastelloScelta[] }) {
  const { stato: sessione, utente, profilo } = useSessione();
  const [organizzatore, setOrganizzatore] = useState(false);
  const [modifica, setModifica] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  const [titolo, setTitolo] = useState("");
  const [giorno, setGiorno] = useState("");
  const [ora, setOra] = useState("");
  const [oraFine, setOraFine] = useState("");
  const [dove, setDove] = useState<"luogo" | "indirizzo">("luogo");
  const [luogo, setLuogo] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [castello, setCastello] = useState("");
  const [perChi, setPerChi] = useState("Tutti");
  const [gratis, setGratis] = useState(true);
  const [prezzo, setPrezzo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [chiOrganizza, setChiOrganizza] = useState("");
  const [contatto, setContatto] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [credito, setCredito] = useState("");
  const [visibile, setVisibile] = useState(true);

  const [invio, setInvio] = useState(false);
  const [caricaInCorso, setCaricaInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState<{ tipo: "proposta" } | { tipo: "pubblicato"; id: string } | null>(null);

  // Da «Fiere e convegni» (?per=lavoro) l'evento è già per professionisti e aziende
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("per") === "lavoro") setPerChi(PER_LAVORO);
  }, []);

  // Ruolo e, per gli organizzatori, l'evento da modificare (?id=)
  useEffect(() => {
    if (sessione !== "connesso") return;
    mieiRuoli().then((r) => setOrganizzatore(r.organizzatore));
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    setCaricamento(true);
    mieiEventi().then(({ eventi }) => {
      setCaricamento(false);
      const e = eventi.find((x) => x.id === id);
      if (!e) return setErrore("Questo evento non è tra i tuoi: puoi modificare solo quelli che hai pubblicato tu.");
      setModifica(e.id);
      setTitolo(e.titolo);
      const i = giornoOra(e.inizio);
      setGiorno(i.giorno);
      setOra(i.ora);
      setOraFine(giornoOra(e.fine).ora);
      if (e.luogo_id) setLuogo(luoghi.find((l) => l.id === e.luogo_id)?.nome ?? "");
      else if (e.indirizzo) {
        setDove("indirizzo");
        setIndirizzo(e.indirizzo);
      }
      setCastello(e.castello_id ? String(e.castello_id) : "");
      setPerChi(e.per_chi ?? "Tutti");
      setGratis(!e.prezzo || /^gratis/i.test(e.prezzo));
      setPrezzo(e.prezzo && !/^gratis/i.test(e.prezzo) ? e.prezzo : "");
      setDescrizione(e.descrizione ?? "");
      setChiOrganizza(e.organizzatore ?? "");
      setContatto(e.contatto ?? "");
      setFoto(e.foto_url);
      setCredito(e.foto_credito ?? "");
      setVisibile(e.pubblicato);
    });
  }, [sessione, luoghi]);

  // Il nome dell'organizzatore, di partenza, è quello del profilo
  useEffect(() => {
    if (profilo?.nome && !chiOrganizza && !modifica) setChiOrganizza(profilo.nome);
  }, [profilo, chiOrganizza, modifica]);

  const luogoScelto = luoghi.find((l) => l.nome.toLowerCase() === luogo.trim().toLowerCase()) ?? null;

  const scegliFoto = async (file: File | undefined) => {
    if (!file || !utente) return;
    setCaricaInCorso(true);
    setErrore(null);
    const r = await caricaFoto(utente.id, file);
    setCaricaInCorso(false);
    if (r.errore) return setErrore(r.errore);
    setFoto(r.url);
  };

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dove === "luogo" && !luogoScelto) {
      setErrore(luogo.trim() ? "Scegli il luogo dall'elenco, oppure passa a «Indirizzo» e scrivilo." : "Dicci dove: scegli un luogo o scrivi l'indirizzo.");
      return;
    }
    if (foto && !credito.trim()) {
      setErrore("Scrivi di chi è la foto: serve il credito.");
      return;
    }
    const dati: DatiProposta = {
      titolo: titolo.trim(),
      descrizione: descrizione.trim(),
      inizio: `${giorno}T${ora}`,
      fine: oraFine ? `${giorno}T${oraFine}` : "",
      luogo_id: dove === "luogo" ? luogoScelto?.id : "",
      indirizzo: dove === "indirizzo" ? indirizzo.trim() : "",
      castello_id: castello,
      per_chi: perChi,
      prezzo: gratis ? "Gratis" : prezzo.trim(),
      contatto: contatto.trim(),
      organizzatore: chiOrganizza.trim(),
      foto_url: foto ?? "",
      foto_credito: foto ? credito.trim() : "",
    };
    setInvio(true);
    setErrore(null);
    if (organizzatore) {
      const r = await salvaMioEvento(modifica, { ...dati, pubblicato: visibile });
      setInvio(false);
      if (r.errore || !r.id) return setErrore(r.errore ?? "Qualcosa non ha funzionato. Riprova tra poco.");
      return setFatto({ tipo: "pubblicato", id: r.id });
    }
    const r = await proponiEvento(dati);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setFatto({ tipo: "proposta" });
  };

  if (fatto) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-5" role="status">
        {/* Evento proposto o pubblicato: Tano col pollice in su */}
        <Tano posa="pollice" priority className="h-36 w-auto self-center" />
        {fatto.tipo === "proposta" ? (
          <>
            <h2 className="text-[21px] font-semibold tracking-tight">Grazie, la proposta è arrivata</h2>
            <p className="text-[15px] leading-relaxed text-testo-2">La redazione di 739 la controlla e, se è tutto a posto, la pubblica nel calendario. Se serve qualcosa ti scrive al contatto che hai lasciato.</p>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton href="/eventi">Vai al calendario</PrimaryButton>
              <PrimaryButton variante="interno" onClick={() => window.location.reload()}>Proponi un altro evento</PrimaryButton>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[21px] font-semibold tracking-tight">{modifica ? "Modifiche salvate" : "L'evento è online"}</h2>
            <p className="text-[15px] leading-relaxed text-testo-2">{visibile ? "Lo trovi nel calendario di 739." : "L'evento è nascosto: non compare nel calendario finché non lo rendi di nuovo visibile."}</p>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton href={`/eventi/${fatto.id}`}>Apri l&apos;evento</PrimaryButton>
              <PrimaryButton variante="interno" href="/profile/eventi">I miei eventi</PrimaryButton>
            </div>
          </>
        )}
      </section>
    );
  }

  if (caricamento) return <div className="h-96 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;

  return (
    <form onSubmit={invia} className="flex flex-col gap-5">
      {sessione === "connesso" ? (
        organizzatore ? (
          <p className="rounded-xl bg-accento-tenue px-4 py-3 text-sm text-accento">Sei organizzatore: l&apos;evento va online subito, e lo puoi modificare da «I miei eventi».</p>
        ) : null
      ) : sessione === "ospite" ? (
        <p className="text-sm text-testo-2">
          Puoi proporre anche senza account. Con il tuo <Link href="/profile" className="font-medium text-accento">SMR ID</Link> puoi aggiungere una foto.
        </p>
      ) : null}

      <Campo testo="Titolo">
        <input required minLength={3} maxLength={120} value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Concerto d'autunno in piazza" className={`h-12 ${CAMPO}`} />
      </Campo>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo testo="Giorno">
          <input type="date" required value={giorno} onChange={(e) => setGiorno(e.target.value)} className={`h-12 ${CAMPO}`} />
        </Campo>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <Campo testo="Inizio">
            <input type="time" required value={ora} onChange={(e) => setOra(e.target.value)} className={`h-12 ${CAMPO} px-3`} />
          </Campo>
          <Campo testo="Fine (se c'è)">
            <input type="time" value={oraFine} onChange={(e) => setOraFine(e.target.value)} className={`h-12 ${CAMPO} px-3`} />
          </Campo>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium text-testo-2">Dove</legend>
        <div className="flex gap-2" role="group" aria-label="Come indichi il posto">
          <button type="button" className="chip" aria-pressed={dove === "luogo"} onClick={() => setDove("luogo")}>Un luogo di 739</button>
          <button type="button" className="chip" aria-pressed={dove === "indirizzo"} onClick={() => setDove("indirizzo")}>Indirizzo</button>
        </div>
        {dove === "luogo" ? (
          <>
            <input aria-label="Luogo" list="luoghi-proposta" value={luogo} onChange={(e) => setLuogo(e.target.value)} placeholder="Inizia a scrivere: teatro, piazza, palazzetto…" className={`h-12 ${CAMPO}`} />
            <datalist id="luoghi-proposta">
              {luoghi.map((l) => (
                <option key={l.id} value={l.nome} />
              ))}
            </datalist>
          </>
        ) : (
          <input aria-label="Indirizzo" maxLength={160} value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} placeholder="Via, numero e castello" className={`h-12 ${CAMPO}`} />
        )}
      </fieldset>

      <Campo testo="Castello">
        <select value={castello} onChange={(e) => setCastello(e.target.value)} className={`h-12 ${CAMPO} px-3`}>
          <option value="">{dove === "luogo" && luogoScelto ? "Quello del luogo" : "Non lo so"}</option>
          {castelli.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </Campo>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium text-testo-2">Per chi</legend>
        <div className="flex flex-wrap gap-2">
          {PER_CHI.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={perChi === p} onClick={() => setPerChi(p)}>{p}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium text-testo-2">Prezzo</legend>
        <div className="flex gap-2">
          <button type="button" className="chip" aria-pressed={gratis} onClick={() => setGratis(true)}>Gratis</button>
          <button type="button" className="chip" aria-pressed={!gratis} onClick={() => setGratis(false)}>A pagamento</button>
        </div>
        {!gratis ? <input aria-label="Quanto costa" required maxLength={80} value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder="Es. 10 €, ridotto 5 €" className={`h-12 ${CAMPO}`} /> : null}
      </fieldset>

      <Campo testo="Descrizione">
        <textarea rows={5} maxLength={3000} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Cosa succede, il programma, se serve prenotare." className={`${CAMPO} py-3 leading-relaxed`} />
      </Campo>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-testo-2">Foto</span>
        {foto ? (
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt="Anteprima della foto" className="aspect-[16/10] w-full rounded-2xl bg-superficie object-cover" />
            <input aria-label="Di chi è la foto" required maxLength={120} value={credito} onChange={(e) => setCredito(e.target.value)} placeholder="Di chi è la foto (es. Foto di Mario Rossi)" className={`h-12 ${CAMPO}`} />
            <button type="button" onClick={() => setFoto(null)} className="w-fit text-sm font-medium text-testo-2 hover:text-testo">Togli la foto</button>
          </div>
        ) : utente ? (
          <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-linea text-[15px] font-medium text-testo-2 transition-colors hover:bg-superficie">
            <Icona nome="importa" size={20} /> {caricaInCorso ? "Carico la foto…" : "Aggiungi una foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={caricaInCorso} onChange={(e) => scegliFoto(e.target.files?.[0])} />
          </label>
        ) : (
          <p className="text-sm text-testo-2">Per aggiungere una foto entra con il tuo SMR ID.</p>
        )}
      </div>

      <Campo testo="Chi organizza">
        <input maxLength={120} value={chiOrganizza} onChange={(e) => setChiOrganizza(e.target.value)} placeholder="Associazione, Giunta di Castello, locale…" className={`h-12 ${CAMPO}`} />
      </Campo>
      <Campo testo="Contatto" nota="Telefono, email o sito: compare nella pagina dell'evento, per chi vuole informazioni.">
        <input required maxLength={160} value={contatto} onChange={(e) => setContatto(e.target.value)} placeholder="Es. 0549 123456 o info@associazione.sm" className={`h-12 ${CAMPO}`} />
      </Campo>

      {organizzatore && modifica ? (
        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" checked={visibile} onChange={(e) => setVisibile(e.target.checked)} className="size-5 accent-[var(--accento)]" />
          Visibile nel calendario
        </label>
      ) : null}

      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}

      <PrimaryButton type="submit" disabled={invio || caricaInCorso}>
        {invio ? "Invio…" : organizzatore ? (modifica ? "Salva le modifiche" : "Pubblica l'evento") : "Invia la proposta"}
      </PrimaryButton>
      {!organizzatore ? <p className="-mt-2 text-[13px] text-testo-2">La redazione controlla ogni proposta prima di pubblicarla.</p> : null}
    </form>
  );
}
