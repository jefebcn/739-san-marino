"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import Testo from "@/components/Testo";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { AREE } from "@/lib/aree";
import { TIPI, TIPI_ORDINE, slugDa, type Contenuto, type TipoContenuto } from "@/lib/contenuti";
import { dataOraSM } from "@/lib/orario";
import { eliminaContenuto, elencoContenuti, salvaContenuto, type ContenutoModifica } from "../contenuti";

export type Opzione = { id: string; nome: string };

const BASE = "w-full rounded-xl border border-linea px-4 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento";
const CAMPO = `${BASE} bg-superficie`;
const giornoOra = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });

/** Data e ora di San Marino di un istante, per i campi «giorno» e «ora» del modulo. */
function inSM(iso: string) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/San_Marino", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { data: `${v("year")}-${v("month")}-${v("day")}`, ora: `${v("hour")}:${v("minute")}` };
}

function statoDi(c: Contenuto) {
  if (c.stato === "bozza") return { testo: "Bozza", tono: "text-testo-2" };
  if (c.pubblicato_il && new Date(c.pubblicato_il) > new Date()) return { testo: `Programmato per il ${giornoOra.format(new Date(c.pubblicato_il))}`, tono: "text-accento" };
  return { testo: c.pubblicato_il ? `Pubblicato il ${giornoOra.format(new Date(c.pubblicato_il))}` : "Pubblicato", tono: "text-ok" };
}

function Campo({ etichetta, children, nota }: { etichetta: string; children: React.ReactNode; nota?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{etichetta}</span>
      {children}
      {nota ? <span className="text-xs text-testo-2">{nota}</span> : null}
    </label>
  );
}

/** Scelta di luoghi o eventi collegati: si scrive il nome, si sceglie dall'elenco, si toglie con la x. */
function Collega({ etichetta, opzioni, scelti, cambia, id }: { etichetta: string; opzioni: Opzione[]; scelti: string[]; cambia: (v: string[]) => void; id: string }) {
  const [testo, setTesto] = useState("");
  const aggiungi = (nome: string) => {
    const o = opzioni.find((x) => x.nome.toLowerCase() === nome.trim().toLowerCase());
    if (o && !scelti.includes(o.id)) cambia([...scelti, o.id]);
    if (o) setTesto("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{etichetta}</span>
      {scelti.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {scelti.map((s) => (
            <li key={s} className="flex items-center gap-1 rounded-lg bg-superficie py-1 pr-1 pl-3 text-sm">
              {opzioni.find((o) => o.id === s)?.nome ?? "Elemento non più disponibile"}
              <button type="button" aria-label="Togli" onClick={() => cambia(scelti.filter((x) => x !== s))} className="grid size-7 place-items-center rounded-md text-testo-2 hover:bg-superficie-2">
                <Icona nome="chiudi" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        list={id}
        value={testo}
        onChange={(e) => {
          setTesto(e.target.value);
          aggiungi(e.target.value);
        }}
        placeholder="Scrivi il nome e scegli dall'elenco"
        className={`h-11 ${CAMPO}`}
      />
      <datalist id={id}>
        {opzioni.map((o) => <option key={o.id} value={o.nome} />)}
      </datalist>
    </div>
  );
}

type Modo = "bozza" | "adesso" | "programma" | "resta";

function Editor({
  iniziale,
  luoghi,
  eventi,
  castelli,
  chiudi,
}: {
  iniziale: Contenuto | null;
  luoghi: Opzione[];
  eventi: Opzione[];
  castelli: Opzione[];
  chiudi: (testo?: string) => void;
}) {
  const giaPubblicato = iniziale?.stato === "pubblicato" && iniziale.pubblicato_il;
  const [c, setC] = useState<ContenutoModifica>(() => ({
    tipo: iniziale?.tipo ?? "storia",
    titolo: iniziale?.titolo ?? "",
    slug: iniziale?.slug ?? "",
    sommario: iniziale?.sommario ?? "",
    corpo: iniziale?.corpo ?? "",
    area: iniziale?.area ?? null,
    castello_id: iniziale?.castello_id ?? null,
    foto_url: iniziale?.foto_url ?? "",
    foto_credito: iniziale?.foto_credito ?? "",
    luoghi: iniziale?.luoghi ?? [],
    eventi: iniziale?.eventi ?? [],
    pubblicato_il: iniziale?.pubblicato_il ?? null,
    stato: iniziale?.stato ?? "bozza",
    fonte_nome: iniziale?.fonte_nome ?? "",
    fonte_link: iniziale?.fonte_link ?? "",
  }));
  const [slugToccato, setSlugToccato] = useState(Boolean(iniziale));
  const [anteprima, setAnteprima] = useState(false);
  const [modo, setModo] = useState<Modo>(giaPubblicato ? "resta" : "bozza");
  const programmata = iniziale?.pubblicato_il ? inSM(iniziale.pubblicato_il) : { data: "", ora: "07:39" };
  const [giorno, setGiorno] = useState(programmata.data);
  const [ora, setOra] = useState(programmata.ora);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const metti = <K extends keyof ContenutoModifica>(k: K, v: ContenutoModifica[K]) => setC((x) => ({ ...x, [k]: v }));
  const vuotoANull = (v: string | null) => (v && v.trim() ? v.trim() : null);

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    let stato: ContenutoModifica["stato"] = "bozza";
    let pubblicato_il: string | null = c.pubblicato_il;
    if (modo === "adesso") {
      stato = "pubblicato";
      pubblicato_il = new Date().toISOString();
    } else if (modo === "programma") {
      if (!giorno || !ora) return setErrore("Scegli giorno e ora della pubblicazione.");
      stato = "pubblicato";
      pubblicato_il = dataOraSM(giorno, ora);
      if (new Date(pubblicato_il) <= new Date()) return setErrore("La data scelta è già passata: usa «Pubblica adesso».");
    } else if (modo === "resta") {
      stato = "pubblicato";
    }
    setInvio(true);
    const r = await salvaContenuto(iniziale?.id ?? null, {
      ...c,
      titolo: c.titolo.trim(),
      slug: c.slug || slugDa(c.titolo),
      sommario: vuotoANull(c.sommario),
      foto_url: vuotoANull(c.foto_url),
      foto_credito: vuotoANull(c.foto_credito),
      fonte_nome: vuotoANull(c.fonte_nome),
      fonte_link: vuotoANull(c.fonte_link),
      stato,
      pubblicato_il,
    });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    chiudi(stato === "bozza" ? "Bozza salvata." : modo === "programma" ? "Contenuto programmato." : "Contenuto pubblicato.");
  };

  const elimina = async () => {
    if (!iniziale || !window.confirm("Eliminare questo contenuto? Non si può annullare.")) return;
    const r = await eliminaContenuto(iniziale.id);
    if (r.errore) return setErrore(r.errore);
    chiudi("Contenuto eliminato.");
  };

  return (
    <form onSubmit={salva} className="flex flex-col gap-4">
      <button type="button" onClick={() => chiudi()} className="flex w-fit items-center gap-1 text-sm font-medium text-accento">
        <Icona nome="freccia" size={16} /> Tutti i contenuti
      </button>
      <h2 className="text-[22px] font-semibold tracking-tight">{iniziale ? "Modifica contenuto" : "Nuovo contenuto"}</h2>

      <Campo etichetta="Rubrica">
        <select value={c.tipo} onChange={(e) => metti("tipo", e.target.value as TipoContenuto)} className={`h-12 ${CAMPO}`}>
          {TIPI_ORDINE.map((t) => <option key={t} value={t}>{TIPI[t].nome}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Titolo">
        <input
          required
          minLength={3}
          maxLength={160}
          value={c.titolo}
          onChange={(e) => {
            metti("titolo", e.target.value);
            if (!slugToccato) metti("slug", slugDa(e.target.value));
          }}
          className={`h-12 ${CAMPO}`}
        />
      </Campo>
      <Campo etichetta="Indirizzo della pagina" nota={c.slug ? `739-san-marino.vercel.app/storie/${c.slug}` : "Si crea dal titolo"}>
        <input
          value={c.slug}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          onChange={(e) => {
            setSlugToccato(true);
            metti("slug", e.target.value.toLowerCase());
          }}
          className={`h-12 font-mono text-sm ${CAMPO}`}
        />
      </Campo>
      <Campo etichetta="Sommario" nota="Una o due frasi: compaiono sotto il titolo e negli elenchi.">
        <textarea rows={2} maxLength={300} value={c.sommario ?? ""} onChange={(e) => metti("sommario", e.target.value)} className={`py-3 leading-snug ${CAMPO}`} />
      </Campo>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-testo-2">Testo</span>
          <div role="tablist" className="flex gap-1 rounded-lg bg-superficie p-0.5 text-[13px]">
            <button type="button" role="tab" aria-selected={!anteprima} onClick={() => setAnteprima(false)} className="rounded-md px-2.5 py-1 aria-selected:bg-fondo">Scrivi</button>
            <button type="button" role="tab" aria-selected={anteprima} onClick={() => setAnteprima(true)} className="rounded-md px-2.5 py-1 aria-selected:bg-fondo">Anteprima</button>
          </div>
        </div>
        {anteprima ? (
          <div className="min-h-48 rounded-xl border border-linea p-4">{c.corpo.trim() ? <Testo>{c.corpo}</Testo> : <p className="text-sm text-testo-2">Niente da mostrare.</p>}</div>
        ) : (
          <textarea rows={14} value={c.corpo} onChange={(e) => metti("corpo", e.target.value)} className={`py-3 font-mono text-[13px] leading-relaxed ${CAMPO}`} />
        )}
        <span className="text-xs text-testo-2">Markdown: ## per i titoletti, **grassetto**, - per gli elenchi, [testo](link) per i link.</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Campo etichetta="Area">
          <select value={c.area ?? ""} onChange={(e) => metti("area", e.target.value || null)} className={`h-12 ${CAMPO} px-3`}>
            <option value="">Nessuna</option>
            {AREE.map((a) => <option key={a.slug} value={a.slug}>{a.nome}</option>)}
          </select>
        </Campo>
        <Campo etichetta="Castello">
          <select value={c.castello_id ?? ""} onChange={(e) => metti("castello_id", e.target.value ? Number(e.target.value) : null)} className={`h-12 ${CAMPO} px-3`}>
            <option value="">Nessuno</option>
            {castelli.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </Campo>
      </div>
      <Campo etichetta="Foto (indirizzo dell'immagine)">
        <input type="url" value={c.foto_url ?? ""} onChange={(e) => metti("foto_url", e.target.value)} placeholder="https://…" className={`h-12 ${CAMPO}`} />
      </Campo>
      <Campo etichetta="Credito della foto" nota="Obbligatorio se c'è una foto: autore e licenza.">
        <input value={c.foto_credito ?? ""} onChange={(e) => metti("foto_credito", e.target.value)} className={`h-12 ${CAMPO}`} />
      </Campo>
      <Collega id="collega-eventi" etichetta="Eventi collegati" opzioni={eventi} scelti={c.eventi} cambia={(v) => metti("eventi", v)} />
      <Collega id="collega-luoghi" etichetta="Luoghi collegati" opzioni={luoghi} scelti={c.luoghi} cambia={(v) => metti("luoghi", v)} />
      <div className="grid grid-cols-2 gap-2">
        <Campo etichetta="Fonte">
          <input value={c.fonte_nome ?? ""} onChange={(e) => metti("fonte_nome", e.target.value)} className={`h-12 ${CAMPO}`} />
        </Campo>
        <Campo etichetta="Link della fonte">
          <input type="url" value={c.fonte_link ?? ""} onChange={(e) => metti("fonte_link", e.target.value)} placeholder="https://…" className={`h-12 ${CAMPO}`} />
        </Campo>
      </div>

      <fieldset className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
        <legend className="sr-only">Pubblicazione</legend>
        <span className="text-[15px] font-semibold">Pubblicazione</span>
        {(
          [
            ...(giaPubblicato ? [["resta", `Resta pubblicato (${statoDi(iniziale!).testo.toLowerCase()})`]] : []),
            ["bozza", giaPubblicato ? "Torna in bozza (sparisce dall'app)" : "Salva come bozza"],
            ["adesso", "Pubblica adesso"],
            ["programma", "Programma per giorno e ora"],
          ] as [Modo, string][]
        ).map(([v, testo]) => (
          <label key={v} className="flex items-center gap-2.5 text-[15px]">
            <input type="radio" name="modo" checked={modo === v} onChange={() => setModo(v)} className="size-4 accent-[var(--accento)]" />
            {testo}
          </label>
        ))}
        {modo === "programma" ? (
          <div className="mt-1 grid grid-cols-[1.4fr_1fr] gap-2">
            <input type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} className={`h-12 ${BASE} bg-fondo`} aria-label="Giorno di pubblicazione" />
            <input type="time" value={ora} onChange={(e) => setOra(e.target.value)} className={`h-12 ${BASE} bg-fondo`} aria-label="Ora di San Marino" />
          </div>
        ) : null}
      </fieldset>

      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      <PrimaryButton type="submit" pieno disabled={invio}>{invio ? "Salvo…" : modo === "bozza" ? "Salva la bozza" : modo === "programma" ? "Programma" : modo === "resta" ? "Salva le modifiche" : "Pubblica"}</PrimaryButton>
      {iniziale ? (
        <button type="button" onClick={elimina} className="w-fit self-center py-2 text-sm font-medium text-segnale">Elimina il contenuto</button>
      ) : null}
    </form>
  );
}

/** Pannello dei contenuti della redazione: elenco, nuovo, modifica, pubblica o programma. */
export default function Contenuti({ luoghi, eventi, castelli }: { luoghi: Opzione[]; eventi: Opzione[]; castelli: Opzione[] }) {
  const [contenuti, setContenuti] = useState<Contenuto[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [aperto, setAperto] = useState<Contenuto | "nuovo" | null>(null);

  const carica = useCallback(async () => {
    const r = await elencoContenuti();
    setContenuti(r.contenuti);
    setErrore(r.errore);
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  if (aperto) {
    return (
      <Editor
        key={aperto === "nuovo" ? "nuovo" : aperto.id}
        iniziale={aperto === "nuovo" ? null : aperto}
        luoghi={luoghi}
        eventi={eventi}
        castelli={castelli}
        chiudi={(testo) => {
          setAperto(null);
          setAvviso(testo ?? null);
          if (testo) carica();
          document.querySelector(".main")?.scrollTo(0, 0);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PrimaryButton onClick={() => setAperto("nuovo")} icona={<Icona nome="piu" />} className="w-fit">Nuovo contenuto</PrimaryButton>
      {avviso ? <p role="status" className="rounded-xl bg-accento-tenue px-4 py-3 text-sm text-accento">{avviso}</p> : null}
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {contenuti === null ? (
        <div className="h-36 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />
      ) : contenuti.length === 0 ? (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Nessun contenuto ancora. Scrivi il primo, o incollali dall&apos;importazione.</p>
      ) : (
        <ul className="divide-y divide-linea rounded-2xl bg-superficie">
          {contenuti.map((c) => {
            const s = statoDi(c);
            return (
              <li key={c.id} className="flex items-center gap-2">
                <button type="button" onClick={() => setAperto(c)} className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3.5 text-left hover:bg-superficie-2">
                  <span className="text-[13px] text-testo-2">{TIPI[c.tipo].nome}</span>
                  <span className="text-[15px] font-semibold leading-snug">{c.titolo}</span>
                  <span className={`text-[13px] ${s.tono}`}>{s.testo}</span>
                </button>
                {c.stato === "pubblicato" && c.pubblicato_il && new Date(c.pubblicato_il) <= new Date() ? (
                  <Link href={`/storie/${c.slug}`} aria-label="Apri la pagina" className="mr-2 grid size-10 place-items-center rounded-xl text-testo-2 hover:bg-superficie-2">
                    <Icona nome="avanti" size={18} />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
