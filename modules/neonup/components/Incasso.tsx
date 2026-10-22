"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { CAMPO } from "@/modules/attivita/components/stile";
import {
  conti as leggiConti, data, incasso, leggiNumero, movimentiCollegati, oggiSM, puoGestire, registraMovimento, scadenzario, soldi,
  type Conto, type Documento, type MovimentoPN,
} from "../api";
import { ERRORE, useAzienda } from "./Guscio";

/** L'incasso di una fattura: con i conti (titolare e amministrazione) si registra in prima nota, se no si segna a mano */
export default function Incasso({ doc, onCambio }: { doc: Documento; onCambio: () => void }) {
  const az = useAzienda();
  const gestisce = puoGestire(az.ruolo);
  const [conti, setConti] = useState<Conto[] | null>(null);
  const [incassi, setIncassi] = useState<MovimentoPN[]>([]);
  const [residuo, setResiduo] = useState<number | null>(null);
  const [conto, setConto] = useState("");
  const [giorno, setGiorno] = useState(oggiSM());
  const [importo, setImporto] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const carica = useCallback(async () => {
    if (!gestisce) return setConti([]);
    const [c, m, s] = await Promise.all([leggiConti(az.id), movimentiCollegati("documento_id", doc.id), scadenzario(az.id)]);
    const attivi = c.conti.filter((x) => x.attivo);
    setConti(attivi);
    setConto((x) => x || (attivi.find((k) => k.tipo === "banca") ?? attivi[0])?.id || "");
    setIncassi(m.filter((x) => !x.annullato_il));
    const r = s.scadenze.find((x) => x.documento_id === doc.id)?.residuo ?? 0;
    setResiduo(r);
    setImporto(r ? r.toFixed(2).replace(".", ",") : "");
  }, [az.id, doc.id, gestisce]);
  useEffect(() => { carica(); }, [carica, doc.incassato_il]);

  async function aMano(si: boolean) {
    const r = await incasso(doc.id, si ? oggiSM() : null);
    if (r.errore) return setErrore(r.errore);
    onCambio();
  }

  async function registra(e: React.FormEvent) {
    e.preventDefault();
    const n = leggiNumero(importo);
    if (!(n > 0)) return setErrore("Scrivi l'importo incassato.");
    setInvio(true); setErrore(null);
    const r = await registraMovimento(az.id, {
      conto_id: conto, data: giorno, importo: n, documento_id: doc.id, categoria: "Vendite e incassi",
      descrizione: `Incasso ${doc.tipo === "acconto" ? "acconto" : doc.tipo === "nota_debito" ? "nota di debito" : "fattura"} ${doc.numero}/${doc.anno}${doc.cessionario?.denominazione ? `, ${doc.cessionario.denominazione}` : ""}`.slice(0, 200),
    });
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    onCambio(); carica();
  }

  if (conti === null) return <div className="h-32 animate-pulse rounded-2xl bg-superficie" />;
  const conConti = gestisce && conti.length > 0;
  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-superficie p-4">
      <h3 className="text-[15px] font-semibold">Incasso</h3>
      {incassi.map((m) => <p key={m.id} className="text-[14px]">Incassati {soldi(m.importo)} il {data(m.data)}, {conti.find((c) => c.id === m.conto_id)?.nome ?? "conto"}</p>)}
      {doc.incassato_il ? (
        <p className="text-[14px]">
          Incassata il {data(doc.incassato_il)}.{" "}
          {!incassi.length ? <button type="button" onClick={() => aMano(false)} className="font-semibold text-accento">Togli</button> : null}
        </p>
      ) : conConti ? (
        <form onSubmit={registra} className="flex flex-col gap-2">
          <p className="text-[14px] text-testo-2">
            {residuo ? `Da incassare ${soldi(residuo)}` : "Da incassare"}{doc.pagamento?.scadenza ? `, scade il ${data(doc.pagamento.scadenza)}` : ""}.
          </p>
          <select value={conto} onChange={(e) => setConto(e.target.value)} aria-label="Conto" className={`${CAMPO} h-10 bg-fondo`}>
            {conti.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" max={oggiSM()} value={giorno} onChange={(e) => setGiorno(e.target.value)} aria-label="Data dell'incasso" className={`${CAMPO} h-10 bg-fondo`} />
            <input inputMode="decimal" value={importo} onChange={(e) => setImporto(e.target.value)} aria-label="Importo incassato" className={`${CAMPO} h-10 bg-fondo font-mono`} />
          </div>
          <PrimaryButton type="submit" dimensione="sm" variante="interno" disabled={invio}>Registra l&apos;incasso</PrimaryButton>
          <Link href={`/neonup/${az.id}/contabilita?vista=scadenzario`} className="text-[13px] font-semibold text-testo-2">Lo scadenzario</Link>
        </form>
      ) : (
        <>
          <p className="text-[14px] text-testo-2">{doc.pagamento?.scadenza ? `Scade il ${data(doc.pagamento.scadenza)}.` : "Senza scadenza."}</p>
          <PrimaryButton dimensione="sm" variante="interno" onClick={() => aMano(true)}>Segna come incassata oggi</PrimaryButton>
        </>
      )}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
    </section>
  );
}
