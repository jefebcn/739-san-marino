"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import { Icona } from "@/components/Icona";
import {
  FE_STATI, TIPI, data, documenti as leggi, nuovoDocumento, oggiSM, puoVendere, soldi, termineTrasmissione, titoloDocumento,
  type TipoDocumento, type VoceDocumento,
} from "../api";
import { ERRORE, useAzienda } from "./Guscio";

const FILTRI: { chiave: string; nome: string; tipi: TipoDocumento[] | null }[] = [
  { chiave: "tutti", nome: "Tutti", tipi: null },
  { chiave: "fatture", nome: "Fatture", tipi: ["fattura", "acconto"] },
  { chiave: "note", nome: "Note", tipi: ["nota_credito", "nota_debito"] },
  { chiave: "preventivi", nome: "Preventivi", tipi: ["preventivo"] },
  { chiave: "ordini", nome: "Ordini", tipi: ["ordine"] },
  { chiave: "ddt", nome: "DDT", tipi: ["ddt"] },
];
const NUOVI: TipoDocumento[] = ["fattura", "preventivo", "ordine", "ddt", "nota_credito", "acconto", "nota_debito"];

const intero = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
/** Il segno di una voce nei totali: le note di credito tolgono */
const segno = (d: VoceDocumento) => (d.tipo === "nota_credito" ? -1 : 1);
const fiscale = (d: VoceDocumento) => TIPI[d.tipo].fiscale;
const feDaFare = (d: VoceDocumento) => d.stato === "emesso" && d.elettronica && ["", "da_inviare", "scartata"].includes(d.fe_stato);
const daIncassare = (d: VoceDocumento) => d.stato === "emesso" && (d.tipo === "fattura" || d.tipo === "acconto" || d.tipo === "nota_debito") && !d.incassato_il;

/** Come sta un documento, in una riga */
function statoDi(d: VoceDocumento) {
  if (d.stato === "bozza") return { testo: "Bozza", forte: false };
  if (d.stato === "annullato") return { testo: "Annullato", forte: false };
  if (d.elettronica && d.fe_stato !== "consegnata") return { testo: FE_STATI[d.fe_stato], forte: d.fe_stato === "scartata" || d.fe_stato === "" || d.fe_stato === "da_inviare" };
  if (daIncassare(d)) {
    const scade = d.pagamento?.scadenza;
    const scaduta = scade && scade < oggiSM();
    return { testo: scaduta ? `Scaduta il ${data(scade)}` : scade ? `Da incassare entro il ${data(scade)}` : "Da incassare", forte: !!scaduta };
  }
  if (d.incassato_il) return { testo: `Incassata il ${data(d.incassato_il)}`, forte: false };
  return { testo: d.elettronica ? "Consegnata" : fiscale(d) ? "Emessa su carta" : "Emesso", forte: false };
}

export function ElencoDocumenti({ voci }: { voci: VoceDocumento[] }) {
  const az = useAzienda();
  return (
    <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
      {voci.map((d) => {
        const s = statoDi(d);
        return (
          <li key={d.id}>
            <Link href={`/neonup/${az.id}/documenti/${d.id}`} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-2 ${d.stato === "annullato" ? "opacity-50" : ""}`}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold">{titoloDocumento(d)}</span>
                <span className="truncate text-[13px] text-testo-2">
                  {d.cessionario?.denominazione ?? "Cliente da scegliere"}{d.data ? `, ${data(d.data)}` : ""}
                </span>
                <span className={`text-[13px] ${s.forte ? "font-medium text-segnale" : "text-testo-2"}`}>{s.testo}</span>
              </span>
              <span className="shrink-0 font-mono text-[15px] font-medium">{d.totale != null ? soldi(segno(d) * Number(d.totale)) : ""}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Nuovo documento: sceglie il tipo, crea la bozza e apre l'editor */
export function NuovoDocumento({ tipi = NUOVI }: { tipi?: TipoDocumento[] }) {
  const az = useAzienda();
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  if (!puoVendere(az.ruolo)) return null;
  async function crea(tipo: TipoDocumento) {
    const r = await nuovoDocumento(az.id, { tipo });
    if (r.errore || !r.id) return setErrore(r.errore ?? "Non è stato possibile creare il documento.");
    router.push(`/neonup/${az.id}/documenti/${r.id}`);
  }
  return (
    <div className="relative flex flex-col gap-2">
      <button type="button" onClick={() => setAperto(!aperto)} aria-expanded={aperto} className="taglio-piccolo flex h-11 w-fit items-center gap-1.5 bg-metallo px-4 text-[14px] font-semibold text-su-accento">
        <Icona nome="piu" size={16} /> Nuovo documento
      </button>
      {aperto ? (
        <div className="flex flex-wrap gap-2">
          {tipi.map((t) => (
            <button key={t} type="button" onClick={() => crea(t)} className="h-10 rounded-xl bg-superficie px-4 text-[14px] font-medium hover:bg-superficie-2">{TIPI[t].nome}</button>
          ))}
        </div>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
    </div>
  );
}

/** /neonup/[azienda]/documenti: tutti i documenti con i filtri */
export default function Documenti() {
  const az = useAzienda();
  const cerca = useSearchParams();
  const [filtro, setFiltro] = useState(cerca.get("tipo") ?? "tutti");
  const [voci, setVoci] = useState<VoceDocumento[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  useEffect(() => { leggi(az.id).then((r) => { setVoci(r.documenti); setErrore(r.errore); }); }, [az.id]);
  const f = FILTRI.find((x) => x.chiave === filtro) ?? FILTRI[0];
  const visti = useMemo(() => (voci ?? []).filter((d) => !f.tipi || f.tipi.includes(d.tipo)), [voci, f]);

  return (
    <div className="flex flex-col gap-4">
      <NuovoDocumento />
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtra per tipo">
        {FILTRI.map((x) => (
          <button key={x.chiave} type="button" aria-pressed={x.chiave === filtro} onClick={() => setFiltro(x.chiave)}
            className={`h-9 shrink-0 rounded-xl px-3.5 text-[14px] font-medium ${x.chiave === filtro ? "bg-[#09090B] text-white" : "bg-superficie hover:bg-superficie-2"}`}>{x.nome}</button>
        ))}
      </div>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {!voci && !errore ? <div className="h-60 animate-pulse rounded-2xl bg-superficie" /> : visti.length ? <ElencoDocumenti voci={visti} /> : (
        <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Nessun documento qui.</p>
      )}
    </div>
  );
}

/** /neonup/[azienda]: i numeri dell'anno e cosa c'è da fare */
export function CruscottoAzienda() {
  const az = useAzienda();
  const [voci, setVoci] = useState<VoceDocumento[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const anno = Number(oggiSM().slice(0, 4));
  useEffect(() => { leggi(az.id).then((r) => { setVoci(r.documenti); setErrore(r.errore); }); }, [az.id]);

  if (!voci && !errore) return <div className="h-72 animate-pulse rounded-2xl bg-[#09090B]" />;
  const tutte = voci ?? [];
  const emessi = tutte.filter((d) => d.stato === "emesso");
  const fatturato = emessi.filter((d) => fiscale(d) && d.anno === anno).reduce((t, d) => t + segno(d) * Number(d.totale ?? 0), 0);
  const aperti = emessi.filter(daIncassare);
  const scadute = aperti.filter((d) => d.pagamento?.scadenza && d.pagamento.scadenza < oggiSM());
  const fe = emessi.filter(feDaFare);
  const termini = fe.map((d) => termineTrasmissione(d)).filter(Boolean).sort() as string[];
  const bozze = tutte.filter((d) => d.stato === "bozza");
  const daFare = [...fe, ...scadute.filter((d) => !fe.includes(d)), ...bozze].slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      <Cruscotto etichetta="I numeri dell'azienda">
        <Cella titolo={`Fatturato ${anno}`} valore={intero.format(fatturato)} unita="€" nota="Fatture meno note di credito, senza bozze" />
        <Cella href={`/neonup/${az.id}/documenti?tipo=fatture`} titolo="Da incassare" valore={intero.format(aperti.reduce((t, d) => t + Number(d.totale ?? 0), 0))} unita="€"
          nota={scadute.length ? `${scadute.length} ${scadute.length === 1 ? "scaduta" : "scadute"}` : `${aperti.length} ${aperti.length === 1 ? "fattura" : "fatture"}`} avviso={scadute.length > 0} />
        <Cella titolo="Fatture elettroniche da inviare" valore={fe.length} nota={termini[0] ? `Termine più vicino: ${data(termini[0])} (indicativo)` : "Nessuna in attesa"} avviso={fe.length > 0} />
        <Cella href={`/neonup/${az.id}/documenti`} titolo="Bozze" valore={bozze.length} nota="Documenti non ancora emessi" />
      </Cruscotto>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3" aria-labelledby="t-fare">
          <h2 id="t-fare" className="text-[19px] font-semibold tracking-tight">Da fare</h2>
          {daFare.length ? <ElencoDocumenti voci={daFare} /> : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Niente in sospeso.</p>}
        </section>
        <section className="flex flex-col gap-3" aria-labelledby="t-ultimi">
          <div className="flex items-center justify-between gap-3">
            <h2 id="t-ultimi" className="text-[19px] font-semibold tracking-tight">Ultimi documenti</h2>
            <Link href={`/neonup/${az.id}/documenti`} className="text-[14px] font-semibold text-accento">Tutti</Link>
          </div>
          <NuovoDocumento tipi={["fattura", "preventivo", "ddt"]} />
          {emessi.length ? <ElencoDocumenti voci={emessi.slice(0, 6)} /> : <p className="rounded-2xl bg-superficie px-4 py-5 text-[15px] text-testo-2">Ancora nessun documento emesso.</p>}
        </section>
      </div>
    </div>
  );
}
