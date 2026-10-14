"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import {
  approvaBozza,
  chiudiSegnalazione,
  codaBozze,
  conteggioBozze,
  ripristinaBozza,
  scartaBozza,
  type Bozza,
  type Conteggio,
  type DatiEvento,
  type StatoBozza,
} from "../api";
import { suggerisciData } from "../date";
import { mieiRuoli } from "@/modules/core/ruoli";
import { TIPI, type TipoContenuto } from "@/lib/rubriche";

export type LuogoScelta = { id: string; nome: string; castello_id: number | null };
export type CastelloScelta = { id: number; nome: string };

const SCHEDE: { stato: StatoBozza; nome: string }[] = [
  { stato: "nuovo", nome: "Da vedere" },
  { stato: "segnalazioni", nome: "Segnalazioni" },
  { stato: "approvato", nome: "Pubblicate" },
  { stato: "scartato", nome: "Scartate" },
];

const CANALI: Record<string, string> = {
  rss: "feed",
  api: "dati aperti",
  email: "email",
  contributo: "proposta",
  pagina: "sito",
  accordo: "accordo",
  redazione: "importazione",
};

const CATEGORIA: Record<string, string> = {
  luogo: "Luogo", parcheggio: "Parcheggio", farmacia: "Farmacia", impianto: "Impianto sportivo", trasporti: "Trasporti", locale: "Locale",
  servizio: "Servizio", cultura: "Museo o monumento", panorama: "Panorama", bagni: "Bagni", acqua: "Fontanella", ricarica: "Ricarica auto",
  ufficio: "Ufficio pubblico", salute: "Salute",
};
const TIPO_AVVISO: Record<string, string> = { strada: "Strade", servizio: "Servizi", meteo: "Meteo", evento: "Eventi", altro: "Altro" };
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** «2026-10-20T07:00» (ora di San Marino) → «20 ottobre, 07:00» */
function dataOra(v: unknown) {
  const m = typeof v === "string" ? v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/) : null;
  return m ? `${Number(m[3])} ${MESI[Number(m[2]) - 1]}, ${m[4]}` : v;
}

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/San_Marino" });
const giornoOra = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });

const STILE_CAMPO =
  "w-full rounded-xl border border-linea bg-fondo px-4 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento";

function Etichetta({ testo, children }: { testo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{testo}</span>
      {children}
    </label>
  );
}

/** Modulo per completare una bozza di evento: titolo, data, ora, luogo, castello, organizzatore, metri. */
function Completa({
  bozza,
  luoghi,
  castelli,
  chiudi,
  fatto,
}: {
  bozza: Bozza;
  luoghi: LuogoScelta[];
  castelli: CastelloScelta[];
  chiudi: () => void;
  fatto: (testo: string) => void;
}) {
  const proposta = suggerisciData(`${bozza.dati.titolo ?? ""} ${bozza.dati.descrizione ?? ""}`, bozza.dati.pubblicato_il);
  const [titolo, setTitolo] = useState(bozza.dati.titolo ?? "");
  // Un evento importato dalla redazione ha già data, ora e luogo: si parte da quelli
  const [data, setData] = useState(bozza.dati.inizio?.slice(0, 10) ?? proposta.data ?? "");
  const [ora, setOra] = useState(bozza.dati.inizio?.slice(11, 16) ?? proposta.ora ?? "");
  const [oraFine, setOraFine] = useState(bozza.dati.fine?.slice(11, 16) ?? "");
  const [luogo, setLuogo] = useState(luoghi.find((l) => l.id === bozza.dati.luogo_id)?.nome ?? "");
  const [castello, setCastello] = useState(bozza.dati.castello_id ? String(bozza.dati.castello_id) : "");
  const [organizzatore, setOrganizzatore] = useState(bozza.dati.organizzatore ?? "");
  const [descrizione, setDescrizione] = useState(bozza.dati.descrizione ?? "");
  const [metri, setMetri] = useState(bozza.dati.metri ? String(bozza.dati.metri) : "20");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const luogoScelto = luoghi.find((l) => l.nome.toLowerCase() === luogo.trim().toLowerCase()) ?? null;

  const pubblica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (luogo.trim() && !luogoScelto) {
      setErrore("Scegli il luogo dall'elenco, oppure lascia il campo vuoto e scrivilo nella descrizione.");
      return;
    }
    setInvio(true);
    setErrore(null);
    const dati: DatiEvento = {
      titolo: titolo.trim(),
      descrizione: descrizione.trim() || null,
      inizio: data && ora ? `${data}T${ora}` : data ? `${data}T00:00` : "",
      fine: data && oraFine ? `${data}T${oraFine}` : "",
      luogo_id: luogoScelto?.id ?? "",
      castello_id: castello,
      organizzatore: organizzatore.trim(),
      metri,
    };
    const r = await approvaBozza(bozza.id, dati);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    fatto(`«${dati.titolo}» è online nel calendario.`);
  };

  return (
    <form onSubmit={pubblica} className="flex flex-col gap-3.5 border-t border-linea pt-4">
      <Etichetta testo="Titolo dell'evento">
        <input required maxLength={140} value={titolo} onChange={(e) => setTitolo(e.target.value)} className={`h-12 ${STILE_CAMPO}`} />
      </Etichetta>
      <Etichetta testo="Giorno">
        <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className={`h-12 ${STILE_CAMPO}`} />
      </Etichetta>
      <div className="grid grid-cols-2 gap-2">
        <Etichetta testo="Inizio">
          <input type="time" required value={ora} onChange={(e) => setOra(e.target.value)} className={`h-12 ${STILE_CAMPO} px-3`} />
        </Etichetta>
        <Etichetta testo="Fine (se c'è)">
          <input type="time" value={oraFine} onChange={(e) => setOraFine(e.target.value)} className={`h-12 ${STILE_CAMPO} px-3`} />
        </Etichetta>
      </div>
      {proposta.data && !bozza.dati.inizio ? <p className="-mt-1.5 text-[13px] text-testo-2">Data e ora lette dal testo: controllale prima di pubblicare.</p> : null}
      <Etichetta testo="Luogo">
        <input
          list={`luoghi-${bozza.id}`}
          value={luogo}
          onChange={(e) => setLuogo(e.target.value)}
          placeholder="Inizia a scrivere: Teatro, Piazza…"
          className={`h-12 ${STILE_CAMPO}`}
        />
        <datalist id={`luoghi-${bozza.id}`}>
          {luoghi.map((l) => (
            <option key={l.id} value={l.nome} />
          ))}
        </datalist>
      </Etichetta>
      <div className="grid grid-cols-2 gap-2">
        <Etichetta testo="Castello">
          <select value={castello} onChange={(e) => setCastello(e.target.value)} className={`h-12 ${STILE_CAMPO} px-3`}>
            <option value="">{luogoScelto ? "Quello del luogo" : "Nessuno"}</option>
            {castelli.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </Etichetta>
        <Etichetta testo="Metri al check-in">
          <input type="number" min={0} max={500} step={5} value={metri} onChange={(e) => setMetri(e.target.value)} className={`h-12 ${STILE_CAMPO} font-mono`} />
        </Etichetta>
      </div>
      <Etichetta testo="Organizza">
        <input maxLength={120} placeholder="Associazione, Giunta di Castello…" value={organizzatore} onChange={(e) => setOrganizzatore(e.target.value)} className={`h-12 ${STILE_CAMPO}`} />
      </Etichetta>
      <Etichetta testo="Descrizione">
        <textarea rows={4} maxLength={1200} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className={`${STILE_CAMPO} py-3 leading-snug`} />
      </Etichetta>
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <PrimaryButton variante="interno" onClick={chiudi}>Annulla</PrimaryButton>
        <PrimaryButton type="submit" disabled={invio}>{invio ? "Pubblico…" : "Pubblica"}</PrimaryButton>
      </div>
    </form>
  );
}

const MOTIVI: Record<string, string> = {
  orario: "Orario sbagliato",
  posizione: "Posizione sbagliata",
  chiuso: "Non esiste più o è chiuso",
  altro: "Altro",
};

/** Una segnalazione «Segnala un errore»: si apre la scheda, si corregge, poi «Corretto» o «Ignora». */
function SchedaSegnalazione({ bozza, aggiorna }: { bozza: Bozza; aggiorna: (testo: string) => void }) {
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const link = bozza.luogo_id ? `/luoghi/${bozza.luogo_id}` : bozza.evento_id ? `/eventi/${bozza.evento_id}` : null;

  const chiudi = async (corretta: boolean) => {
    setOccupato(true);
    setErrore(null);
    const r = await chiudiSegnalazione(bozza.id, corretta);
    setOccupato(false);
    if (r.errore) return setErrore(r.errore);
    aggiorna(corretta ? "Segnalazione chiusa: la scheda risulta controllata oggi." : "Segnalazione ignorata.");
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
      <div className="flex items-center justify-between gap-3 text-[13px] text-testo-2">
        <span>{bozza.segnalato_da ? `Da ${bozza.segnalato_da}` : "Senza accesso"}, {giornoOra.format(new Date(bozza.creato_il))}</span>
        {bozza.stato !== "nuovo" ? <span className="font-medium text-testo">{bozza.stato === "approvato" ? "Corretta" : "Ignorata"}</span> : null}
      </div>
      <h2 className="text-[17px] font-semibold leading-snug tracking-tight">{bozza.dati.titolo ?? "Scheda"}</h2>
      <p className="text-sm">
        <b className="font-semibold">{MOTIVI[bozza.dati.motivo ?? ""] ?? "Segnalazione"}</b>
        {bozza.dati.testo ? <span className="text-testo-2">: {bozza.dati.testo}</span> : null}
      </p>
      {link ? (
        <Link href={link} className="flex w-fit items-center gap-1 text-sm font-medium text-accento">
          Apri la scheda <Icona nome="avanti" size={14} />
        </Link>
      ) : null}
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {bozza.stato === "nuovo" ? (
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton variante="interno" disabled={occupato} onClick={() => chiudi(false)}>Ignora</PrimaryButton>
          <PrimaryButton disabled={occupato} onClick={() => chiudi(true)}>Corretto</PrimaryButton>
        </div>
      ) : null}
    </article>
  );
}

const NOMI_TIPO: Record<Bozza["tipo"], string> = { evento: "Evento", luogo: "Luogo", avviso: "Avviso", contenuto: "Contenuto", segnalazione: "Segnalazione" };

/** Dove si vede quello che è stato approvato */
function LinkPubblicato({ bozza }: { bozza: Bozza }) {
  const [href, testo] =
    bozza.tipo === "luogo" ? [`/luoghi/${bozza.elemento_id}`, "Vedi la scheda"]
    : bozza.tipo === "avviso" ? ["/vivere/avvisi", "Vedi gli avvisi"]
    : bozza.tipo === "contenuto" ? ["/admin/contenuti", "Rileggilo e pubblicalo in Contenuti"]
    : [`/eventi/${bozza.elemento_id}`, "Vedi l'evento pubblicato"];
  return (
    <Link href={href} className="flex w-fit items-center gap-1 text-sm font-medium text-accento">
      {testo} <Icona nome="avanti" size={14} />
    </Link>
  );
}

/** Le righe di riepilogo di un elemento importato, per decidere senza aprire il file */
function Riepilogo({ bozza }: { bozza: Bozza }) {
  const d = bozza.dati as Record<string, unknown>;
  const righe: [string, unknown][] =
    bozza.tipo === "luogo"
      ? [["Categoria", CATEGORIA[String(d.categoria)] ?? d.categoria], ["Indirizzo", d.indirizzo], ["Telefono", d.telefono], ["Sito", d.sito], ["Pratiche", Array.isArray(d.cosa_fare) ? `${d.cosa_fare.length} in «Cosa posso fare qui»` : null], ["Fonte", d.fonte_nome]]
      : bozza.tipo === "avviso"
        ? [["Tipo", TIPO_AVVISO[String(d.tipo_avviso)] ?? d.tipo_avviso], ["Gravità", d.gravita === "attenzione" ? "Attenzione" : "Informazione"], ["Dal", dataOra(d.dal)], ["Al", dataOra(d.al)], ["Testo", d.testo]]
        : [["Rubrica", TIPI[d.tipo_contenuto as TipoContenuto]?.nome ?? d.tipo_contenuto], ["Sommario", d.sommario], ["Testo", typeof d.corpo === "string" && d.corpo ? `${d.corpo.length} caratteri` : null]];
  const piene = righe.filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!piene.length) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {piene.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-testo-2">{k}</dt>
          <dd className="line-clamp-2 break-words">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Luoghi, avvisi e contenuti arrivati dall'importazione: si approvano come sono o si scartano. */
function SchedaImportazione({ bozza, aggiorna }: { bozza: Bozza; aggiorna: (testo: string) => void }) {
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const esegui = async (azione: () => Promise<{ errore: string | null }>, testo: string) => {
    setOccupato(true);
    setErrore(null);
    const r = await azione();
    setOccupato(false);
    if (r.errore) return setErrore(r.errore);
    aggiorna(testo);
  };
  const approvato = bozza.tipo === "luogo" ? (bozza.simile_id ? "Scheda aggiornata." : "Luogo pubblicato sulla mappa.") : bozza.tipo === "avviso" ? "Avviso pubblicato." : "Contenuto creato come bozza in Contenuti.";

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
      <div className="flex items-center justify-between gap-3 text-[13px] text-testo-2">
        <span>{NOMI_TIPO[bozza.tipo]}, {bozza.fonte}, {giorno.format(new Date(bozza.creato_il))}</span>
        {bozza.stato === "duplicato" ? <span className="font-medium text-testo">Doppione</span> : null}
      </div>
      <h2 className="text-[17px] font-semibold leading-snug tracking-tight">{bozza.dati.titolo ?? (bozza.dati as { nome?: string }).nome ?? "Senza titolo"}</h2>
      <Riepilogo bozza={bozza} />
      {bozza.tipo === "luogo" && bozza.simile_id && bozza.stato === "nuovo" ? (
        <p className="rounded-xl bg-fondo p-3 text-sm">
          <b className="font-semibold">Esiste già: </b>
          <Link href={`/luoghi/${bozza.simile_id}`} className="text-accento">{bozza.simile_titolo}</Link>. Approvando aggiorni quella scheda con i dati nuovi, senza crearne un doppione.
        </p>
      ) : null}
      {bozza.nota ? <p className="text-sm text-testo-2">Nota: {bozza.nota}</p> : null}
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {bozza.stato === "nuovo" ? (
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton variante="interno" disabled={occupato} onClick={() => esegui(() => scartaBozza(bozza.id, null), "Bozza scartata.")}>Scarta</PrimaryButton>
          <PrimaryButton disabled={occupato} onClick={() => esegui(() => approvaBozza(bozza.id, {}), approvato)}>
            {bozza.tipo === "luogo" && bozza.simile_id ? "Aggiorna" : "Approva"}
          </PrimaryButton>
        </div>
      ) : null}
      {bozza.stato === "approvato" && bozza.elemento_id ? <LinkPubblicato bozza={bozza} /> : null}
      {bozza.stato === "scartato" || bozza.stato === "duplicato" ? (
        <PrimaryButton variante="interno" dimensione="sm" className="w-fit" disabled={occupato} onClick={() => esegui(() => ripristinaBozza(bozza.id), "Bozza rimessa in coda.")}>
          Rimetti in coda
        </PrimaryButton>
      ) : null}
    </article>
  );
}

function Scheda({
  bozza,
  luoghi,
  castelli,
  aggiorna,
}: {
  bozza: Bozza;
  luoghi: LuogoScelta[];
  castelli: CastelloScelta[];
  aggiorna: (testo: string) => void;
}) {
  const [aperta, setAperta] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const quando = bozza.dati.pubblicato_il ?? bozza.creato_il;
  if (bozza.tipo === "segnalazione") return <SchedaSegnalazione bozza={bozza} aggiorna={aggiorna} />;
  if (bozza.tipo !== "evento") return <SchedaImportazione bozza={bozza} aggiorna={aggiorna} />;

  const esegui = async (azione: () => Promise<{ errore: string | null }>, testo: string) => {
    setOccupato(true);
    setErrore(null);
    const r = await azione();
    setOccupato(false);
    if (r.errore) return setErrore(r.errore);
    aggiorna(testo);
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
      <div className="flex items-center justify-between gap-3 text-[13px] text-testo-2">
        <span>
          {bozza.fonte}, {CANALI[bozza.canale] ?? bozza.canale}, {giorno.format(new Date(quando))}
        </span>
        {bozza.stato === "duplicato" ? <span className="font-medium text-testo">Doppione</span> : null}
      </div>
      <h2 className="text-[17px] font-semibold leading-snug tracking-tight">{bozza.dati.titolo ?? "Senza titolo"}</h2>
      {bozza.dati.descrizione && !aperta ? <p className="line-clamp-4 text-sm leading-relaxed text-testo-2">{bozza.dati.descrizione}</p> : null}
      {bozza.link_fonte ? (
        <a href={bozza.link_fonte} target="_blank" rel="noopener" className="flex w-fit items-center gap-1 text-sm font-medium text-accento">
          Leggi l&apos;originale <Icona nome="avanti" size={14} />
        </a>
      ) : null}

      {bozza.simile_id && bozza.stato === "nuovo" ? (
        <div className="flex flex-col gap-2 rounded-xl bg-fondo p-3 text-sm">
          <span>
            <b className="font-semibold">Forse è già online:</b> {bozza.simile_titolo}
            {bozza.simile_inizio ? `, ${giornoOra.format(new Date(bozza.simile_inizio))}` : ""}
          </span>
          <button
            type="button"
            disabled={occupato}
            onClick={() => esegui(() => scartaBozza(bozza.id, null, bozza.simile_id), "Segnata come doppione.")}
            className="w-fit text-sm font-medium text-accento disabled:opacity-50"
          >
            È lo stesso evento, scartala
          </button>
        </div>
      ) : null}

      {bozza.nota ? <p className="text-sm text-testo-2">Nota: {bozza.nota}</p> : null}
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}

      {bozza.stato === "nuovo" ? (
        aperta ? (
          <Completa bozza={bozza} luoghi={luoghi} castelli={castelli} chiudi={() => setAperta(false)} fatto={aggiorna} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <PrimaryButton variante="interno" disabled={occupato} onClick={() => esegui(() => scartaBozza(bozza.id, null), "Bozza scartata.")}>
              Scarta
            </PrimaryButton>
            <PrimaryButton onClick={() => setAperta(true)}>Completa</PrimaryButton>
          </div>
        )
      ) : null}

      {bozza.stato === "approvato" && bozza.elemento_id ? <LinkPubblicato bozza={bozza} /> : null}

      {bozza.stato === "scartato" || bozza.stato === "duplicato" ? (
        <PrimaryButton variante="interno" dimensione="sm" className="w-fit" disabled={occupato} onClick={() => esegui(() => ripristinaBozza(bozza.id), "Bozza rimessa in coda.")}>
          Rimetti in coda
        </PrimaryButton>
      ) : null}
    </article>
  );
}

/** Pannello della coda delle bozze: solo per gli amministratori di 739. */
export default function Coda({ luoghi, castelli }: { luoghi: LuogoScelta[]; castelli: CastelloScelta[] }) {
  const { stato: sessione } = useSessione();
  const [permesso, setPermesso] = useState<"controllo" | "si" | "no">("controllo");
  const [scheda, setScheda] = useState<StatoBozza>("nuovo");
  const [bozze, setBozze] = useState<Bozza[] | null>(null);
  const [conteggio, setConteggio] = useState<Conteggio | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  useEffect(() => {
    if (sessione !== "connesso") return;
    mieiRuoli().then((r) => setPermesso(r.redattore ? "si" : "no"));
  }, [sessione]);

  const carica = useCallback(async () => {
    const [lista, numeri] = await Promise.all([codaBozze(scheda), conteggioBozze()]);
    setBozze(lista.bozze);
    setErrore(lista.errore ?? numeri.errore);
    if (numeri.conteggio) setConteggio(numeri.conteggio);
  }, [scheda]);

  useEffect(() => {
    if (permesso !== "si") return;
    setBozze(null);
    carica();
  }, [permesso, carica]);

  const aggiorna = (testo: string) => {
    setAvviso(testo);
    carica();
  };

  if (sessione === "caricamento" || (sessione === "connesso" && permesso === "controllo")) {
    return <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  }
  if (sessione !== "connesso") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-testo-2">Per aprire la coda entra con il tuo SMR ID.</p>
        <PrimaryButton href="/profile" className="w-fit">Entra</PrimaryButton>
      </div>
    );
  }
  if (permesso === "no") {
    return <p className="text-[15px] text-testo-2">La coda è riservata alla redazione di 739. Se dovresti averla, chiedi ad Alex di aggiungerti.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Stato delle bozze" className="grid grid-cols-2 gap-1 rounded-xl bg-superficie p-1">
        {SCHEDE.map((s) => (
          <button
            key={s.stato}
            type="button"
            role="tab"
            aria-selected={scheda === s.stato}
            onClick={() => {
              setScheda(s.stato);
              setAvviso(null);
            }}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-testo-2 transition-colors aria-selected:bg-fondo aria-selected:text-testo"
          >
            {s.nome}
            {conteggio ? <span className="font-mono text-xs">{conteggio[s.stato]}</span> : null}
          </button>
        ))}
      </div>

      {avviso ? <p role="status" className="rounded-xl bg-accento-tenue px-4 py-3 text-sm text-accento">{avviso}</p> : null}
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}

      {bozze === null ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Caricamento">
          <div className="h-36 animate-pulse rounded-2xl bg-superficie" />
          <div className="h-36 animate-pulse rounded-2xl bg-superficie" />
        </div>
      ) : bozze.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">
          {scheda === "nuovo"
            ? "Niente da vedere. Gli articoli di Libertas su spettacoli, mostre e cultura arrivano qui da soli due volte al giorno."
            : scheda === "segnalazioni"
              ? "Nessuna segnalazione da vedere. Arrivano da «Segnala un errore» su schede ed eventi."
              : scheda === "approvato"
              ? "Nessuna bozza pubblicata finora."
              : "Nessuna bozza scartata."}
        </p>
      ) : (
        bozze.map((b) => <Scheda key={b.id} bozza={b} luoghi={luoghi} castelli={castelli} aggiorna={aggiorna} />)
      )}
    </div>
  );
}
