"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import { PuntoCategoria } from "@/components/Segnaposto";
import { CATEGORIA_SINGOLA, CATEGORIE, TIPI_LEGGIBILI } from "@/lib/data";
import { carica, elenco, pubblica, riepilogo, rimetti, scarta, type Candidato, type FileFonte, type Riepilogo, type StatoCandidato } from "../api";

const SCHEDE: { stato: StatoCandidato; nome: string }[] = [
  { stato: "nuovo", nome: "Nuovi" },
  { stato: "doppione", nome: "Doppioni" },
  { stato: "pubblicato", nome: "Pubblicati" },
  { stato: "scartato", nome: "Scartati" },
];
const SOGLIE = [
  { qualita: 85, nome: "Molto affidabili (85+)" },
  { qualita: 75, nome: "Affidabili (75+)" },
  { qualita: 60, nome: "Discreti (60+)" },
];
const quando = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/San_Marino" });
const tipo = (c: Candidato) =>
  c.sottocategoria && c.sottocategoria !== "altro" && c.sottocategoria !== "negozio"
    ? TIPI_LEGGIBILI[c.sottocategoria] ?? c.sottocategoria[0].toUpperCase() + c.sottocategoria.slice(1)
    : CATEGORIA_SINGOLA[c.categoria] ?? CATEGORIE[c.categoria] ?? c.categoria;

/** Amministratori: i luoghi da Overture Maps (migrazione 0038). Si carica il file, si controlla, si pubblica. */
export default function Fonti() {
  const [rie, setRie] = useState<Riepilogo | null>(null);
  const [scheda, setScheda] = useState<StatoCandidato>("nuovo");
  const [categoria, setCategoria] = useState<string>("");
  const [lista, setLista] = useState<Candidato[] | null>(null);
  const [fine, setFine] = useState(false);
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const [lavoro, setLavoro] = useState<string | null>(null);
  const [soglia, setSoglia] = useState(85);

  const aggiorna = useCallback(() => {
    riepilogo().then((r) => {
      setRie(r.riepilogo);
      if (r.errore) setErrore(r.errore);
    });
    setLista(null);
    setScelti(new Set());
    elenco(scheda, categoria || null).then((r) => {
      setLista(r.candidati);
      setFine(r.candidati.length < 100);
      if (r.errore) setErrore(r.errore);
    });
  }, [scheda, categoria]);
  useEffect(aggiorna, [aggiorna]);

  const altri = async () => {
    const r = await elenco(scheda, categoria || null, lista?.length ?? 0);
    setLista([...(lista ?? []), ...r.candidati]);
    setFine(r.candidati.length < 100);
  };

  const fai = async (testo: string, azione: () => Promise<{ errore: string | null; messaggio: string }>) => {
    setLavoro(testo);
    setErrore(null);
    setEsito(null);
    const r = await azione();
    setLavoro(null);
    if (r.errore) setErrore(r.errore);
    else setEsito(r.messaggio);
    aggiorna();
  };

  const leggiFile = async (f: File | undefined) => {
    if (!f) return;
    let dati: FileFonte;
    try {
      dati = JSON.parse(await f.text());
    } catch {
      return setErrore("Il file non è un JSON valido.");
    }
    if (dati.fonte !== "overture" || !Array.isArray(dati.candidati)) return setErrore("Non è un file di scripts/overture.py (manca «fonte»: «overture» o l'elenco «candidati»).");
    if (!confirm(`Caricare ${dati.candidati.length} luoghi della release ${dati.release}? Finiscono tra i candidati, non sulla mappa.`)) return;
    fai(`Carico ${dati.candidati.length} luoghi…`, async () => {
      const r = await carica(dati, (n) => setLavoro(`Carico… ${n} di ${dati.candidati.length}`));
      const t = r.totali;
      return { errore: r.errore, messaggio: `Caricati ${t.validi} luoghi validi su ${t.letti}: ${t.nuovi} nuovi, ${t.aggiornati} aggiornati${t.luoghi_aggiornati ? `, ${t.luoghi_aggiornati} schede già pubblicate aggiornate` : ""}.` };
    });
  };

  const nuoviSopraSoglia = rie
    ? Object.entries(rie.nuovi_per_qualita).reduce((n, [fascia, v]) => n + ((fascia === "85+" && soglia <= 85) || (fascia === "75-84" && soglia <= 75) || (fascia === "60-74" && soglia <= 60) ? v : 0), 0)
    : 0;
  const ids = [...scelti];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl bg-superficie p-5" aria-labelledby="titolo-riepilogo">
        <h2 id="titolo-riepilogo" className="text-[17px] font-semibold tracking-tight">Overture Maps</h2>
        {rie ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              {SCHEDE.map((s) => (
                <div key={s.stato} className="flex flex-col gap-0.5 rounded-xl bg-fondo px-2 py-3">
                  <span className="font-mono text-[21px] font-medium">{rie.per_stato[s.stato] ?? 0}</span>
                  <span className="text-[12px] text-testo-2">{s.nome.toLowerCase()}</span>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-testo-2">
              {rie.release ? `Release ${rie.release}` : "Nessun caricamento ancora"}
              {rie.ultimo_caricamento ? `, caricata il ${quando.format(new Date(rie.ultimo_caricamento))}` : ""}. Licenza CDLA Permissive 2.0, attribuzione «© Overture Maps Foundation».
            </p>
          </>
        ) : (
          <div className="h-20 animate-pulse rounded-xl bg-fondo" aria-busy="true" aria-label="Caricamento" />
        )}
        <label className="flex h-11 w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-linea px-4 text-sm font-medium transition-colors hover:bg-fondo">
          <Icona nome="importa" size={18} /> Carica il file di scripts/overture.py
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { leggiFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </section>

      {rie && (rie.per_stato.nuovo ?? 0) > 0 ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-linea p-4" aria-labelledby="titolo-blocco">
          <h2 id="titolo-blocco" className="text-[17px] font-semibold tracking-tight">Pubblica in blocco</h2>
          <p className="text-sm text-testo-2">
            La qualità va da 0 a 100: affidabilità di Overture più telefono, sito, indirizzo e più fonti. I doppioni sono già esclusi. I luoghi pubblicati restano «Da verificare» e si possono ritirare.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={soglia} onChange={(e) => setSoglia(Number(e.target.value))} aria-label="Qualità minima" className="h-11 rounded-xl border border-linea bg-superficie px-3 text-[15px]">
              {SOGLIE.map((s) => <option key={s.qualita} value={s.qualita}>{s.nome}</option>)}
            </select>
            <button
              type="button"
              disabled={!!lavoro || !nuoviSopraSoglia}
              onClick={() => {
                if (!confirm(`Pubblicare sulla mappa ${nuoviSopraSoglia} luoghi con qualità ${soglia} o più?`)) return;
                fai("Pubblico…", async () => {
                  const r = await pubblica(null, soglia, null);
                  return { errore: r.errore, messaggio: `Pubblicati ${r.pubblicati} luoghi.` };
                });
              }}
              className="h-11 rounded-xl bg-metallo px-4 text-sm font-semibold text-su-accento disabled:opacity-50"
            >
              Pubblica {nuoviSopraSoglia} luoghi
            </button>
          </div>
        </section>
      ) : null}

      {lavoro ? <p role="status" className="rounded-xl bg-accento-tenue px-4 py-3 text-sm text-accento">{lavoro}</p> : null}
      {esito ? <p role="status" className="rounded-xl bg-accento-tenue px-4 py-3 text-sm text-accento">{esito}</p> : null}
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}

      <section className="flex flex-col gap-3" aria-label="Candidati">
        <div className="chips" role="tablist" aria-label="Stato">
          {SCHEDE.map((s) => (
            <button key={s.stato} type="button" role="tab" className="chip" aria-selected={scheda === s.stato} onClick={() => setScheda(s.stato)}>
              {s.nome} <span className="font-mono text-[12px]">{rie?.per_stato[s.stato] ?? ""}</span>
            </button>
          ))}
        </div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria" className="h-11 w-fit rounded-xl border border-linea bg-superficie px-3 text-[15px]">
          <option value="">Tutte le categorie</option>
          {["locale", "negozio", "azienda", "professionista", "artigiano", "impianto", "animali", "associazione", "dormire"].map((c) => (
            <option key={c} value={c}>{CATEGORIE[c] ?? c}{scheda === "nuovo" && rie?.nuovi_per_categoria[c] ? ` (${rie.nuovi_per_categoria[c]})` : ""}</option>
          ))}
        </select>

        {ids.length ? (
          <div className="sticky top-2 z-[2] flex flex-wrap items-center gap-2 rounded-xl bg-superficie p-2 shadow-sm">
            <span className="px-2 text-sm">{ids.length} scelti</span>
            {scheda === "nuovo" ? (
              <button type="button" disabled={!!lavoro} className="h-10 rounded-xl bg-metallo px-3 text-sm font-semibold text-su-accento" onClick={() => fai("Pubblico…", async () => { const r = await pubblica(ids, 0, null); return { errore: r.errore, messaggio: `Pubblicati ${r.pubblicati} luoghi.` }; })}>Pubblica</button>
            ) : null}
            {scheda === "doppione" || scheda === "scartato" ? (
              <button type="button" disabled={!!lavoro} className="h-10 rounded-xl bg-fondo px-3 text-sm font-medium" onClick={() => fai("Rimetto tra i nuovi…", async () => { const r = await rimetti(ids); return { errore: r.errore, messaggio: `${r.n} rimessi tra i nuovi.` }; })}>Rimetti tra i nuovi</button>
            ) : null}
            {scheda !== "scartato" ? (
              <button type="button" disabled={!!lavoro} className="h-10 rounded-xl px-3 text-sm font-medium text-segnale" onClick={() => {
                if (scheda === "pubblicato" && !confirm(`Ritirare dalla mappa ${ids.length} luoghi?`)) return;
                fai("Scarto…", async () => { const r = await scarta(ids, ""); return { errore: r.errore, messaggio: `${r.n} scartati${scheda === "pubblicato" ? " e ritirati dalla mappa" : ""}.` }; });
              }}>{scheda === "pubblicato" ? "Ritira dalla mappa" : "Scarta"}</button>
            ) : null}
            <button type="button" className="h-10 px-2 text-sm text-testo-2" onClick={() => setScelti(new Set())}>Annulla</button>
          </div>
        ) : null}

        {!lista ? (
          <div className="h-40 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />
        ) : lista.length === 0 ? (
          <p className="rounded-2xl bg-superficie p-5 text-[15px] text-testo-2">Niente qui.</p>
        ) : (
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {lista.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={`Scegli ${c.nome}`}
                  checked={scelti.has(c.id)}
                  onChange={(e) => {
                    const s = new Set(scelti);
                    if (e.target.checked) s.add(c.id);
                    else s.delete(c.id);
                    setScelti(s);
                  }}
                  className="mt-1.5 size-4 shrink-0 accent-[var(--accento)]"
                />
                <PuntoCategoria categoria={c.categoria} sottocategoria={c.sottocategoria} grande />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold">{c.nome}</span>
                    <span className="shrink-0 font-mono text-[13px] font-medium text-testo-2" title="Qualità">{c.qualita ?? "–"}</span>
                  </span>
                  <span className="text-[13px] text-testo-2">{[tipo(c), c.indirizzo].filter(Boolean).join(", ")}</span>
                  <span className="flex flex-wrap gap-x-3 text-[13px]">
                    {c.telefono ? <span className="font-mono text-testo-2">{c.telefono}</span> : null}
                    {c.sito ? <a href={c.sito} target="_blank" rel="noopener" className="text-accento">sito</a> : null}
                    <a href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=18/${c.lat}/${c.lng}`} target="_blank" rel="noopener" className="text-accento">punto</a>
                    {c.luogo_id ? <Link href={`/luoghi/${c.luogo_id}`} className="text-accento">scheda</Link> : null}
                    <span className="text-testo-2">{(c.fonti ?? []).join(", ")}, {c.tassonomia}</span>
                  </span>
                  {c.motivo ? (
                    <span className="text-[13px] text-testo-2">
                      {c.motivo}
                      {c.simile_a ? <>: <Link href={`/luoghi/${c.simile_a}`} className="text-accento">{c.simile_nome}</Link></> : null}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {lista && !fine ? <button type="button" className="self-center py-2 text-sm font-medium text-accento" onClick={altri}>Mostra altri</button> : null}
      </section>
    </div>
  );
}
