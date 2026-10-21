"use client";

import { useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { CAMPO } from "@/modules/attivita/components/stile";
import { RUOLI, aggiungiPersona, azienda as leggiAzienda, persone as leggiPersone, puoGestire, salvaAzienda, type Azienda, type Persona, type Ruolo } from "../api";
import { ERRORE } from "./Guscio";

const VUOTA: Partial<Azienda> = { denominazione: "", cod_oe: "", indirizzo: "", numero_civico: "", cap: "", comune: "", telefono: "", email: "", domicilio_digitale: "", iban: "", fe_dal: "" };

export function Campo({ etichetta, aiuto, children }: { etichetta: string; aiuto?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium">{etichetta}</span>
      {children}
      {aiuto ? <span className="text-[13px] leading-snug text-testo-2">{aiuto}</span> : null}
    </label>
  );
}

/** I dati dell'azienda come vanno in fattura: per crearla (id null) o modificarla */
export function ModuloAzienda({ id, onSalvata }: { id: string | null; onSalvata: (id: string) => void }) {
  const [a, setA] = useState<Partial<Azienda> | null>(id ? null : VUOTA);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState(false);

  useEffect(() => {
    if (id) leggiAzienda(id).then((r) => { setErrore(r.errore); setA(r.azienda ?? VUOTA); });
  }, [id]);

  if (!a) return <div className="h-96 animate-pulse rounded-2xl bg-superficie" />;
  const cambia = (k: keyof Azienda) => (e: React.ChangeEvent<HTMLInputElement>) => { setFatto(false); setA({ ...a, [k]: e.target.value }); };

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    const r = await salvaAzienda(id, a!);
    setInvio(false);
    if (r.errore || !r.id) return setErrore(r.errore ?? "Non è stato possibile salvare.");
    setFatto(true);
    onSalvata(r.id);
  }

  return (
    <form onSubmit={salva} className="flex flex-col gap-4">
      <Campo etichetta="Ragione sociale"><input required maxLength={80} value={a.denominazione ?? ""} onChange={cambia("denominazione")} className={`${CAMPO} h-12`} /></Campo>
      <Campo etichetta="Codice operatore economico" aiuto="Le 5 cifre del COE (es. 01234). Serve per la fattura elettronica.">
        <input inputMode="numeric" pattern="\d{5}" maxLength={5} value={a.cod_oe ?? ""} onChange={cambia("cod_oe")} className={`${CAMPO} h-12 font-mono`} />
      </Campo>
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Campo etichetta="Indirizzo della sede"><input maxLength={60} value={a.indirizzo ?? ""} onChange={cambia("indirizzo")} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Civico"><input maxLength={8} value={a.numero_civico ?? ""} onChange={cambia("numero_civico")} className={`${CAMPO} h-12`} /></Campo>
      </div>
      <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
        <Campo etichetta="CAP"><input inputMode="numeric" pattern="\d{5}" maxLength={5} value={a.cap ?? ""} onChange={cambia("cap")} placeholder="47890" className={`${CAMPO} h-12 font-mono`} /></Campo>
        <Campo etichetta="Località"><input maxLength={60} value={a.comune ?? ""} onChange={cambia("comune")} placeholder="Borgo Maggiore" className={`${CAMPO} h-12`} /></Campo>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="Telefono"><input type="tel" maxLength={16} value={a.telefono ?? ""} onChange={cambia("telefono")} className={`${CAMPO} h-12`} /></Campo>
        <Campo etichetta="Email"><input type="email" maxLength={120} value={a.email ?? ""} onChange={cambia("email")} className={`${CAMPO} h-12`} /></Campo>
      </div>
      <Campo etichetta="Domicilio digitale" aiuto="Quello registrato all'Ufficio Tributario: l'HUB-SM lo controlla.">
        <input maxLength={120} value={a.domicilio_digitale ?? ""} onChange={cambia("domicilio_digitale")} className={`${CAMPO} h-12`} />
      </Campo>
      <Campo etichetta="IBAN" aiuto="Compare in fattura quando il pagamento è con bonifico.">
        <input maxLength={40} value={a.iban ?? ""} onChange={cambia("iban")} className={`${CAMPO} h-12 font-mono uppercase`} />
      </Campo>
      <Campo etichetta="Fattura elettronica dal" aiuto="La «Data di inizio fatturazione elettronica RSM» che hai fissato su TribWEB. Da quel giorno le fatture ad aziende sammarinesi escono come file XML. Lasciala vuota se non hai ancora aderito.">
        <input type="date" value={a.fe_dal ?? ""} onChange={cambia("fe_dal")} className={`${CAMPO} h-12`} />
      </Campo>
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {fatto && id ? <p role="status" className="text-[14px] text-testo-2">Salvato.</p> : null}
      <PrimaryButton type="submit" disabled={invio} className="w-fit">{id ? "Salva i dati" : "Crea l'azienda"}</PrimaryButton>
    </form>
  );
}

/** Chi lavora nell'azienda: il titolare aggiunge con il numero della tessera SMR ID */
export function Persone({ azienda, ruolo }: { azienda: string; ruolo: Ruolo }) {
  const [elenco, setElenco] = useState<Persona[] | null>(null);
  const [tessera, setTessera] = useState("");
  const [nuovo, setNuovo] = useState<Ruolo>("vendite");
  const [errore, setErrore] = useState<string | null>(null);
  const carica = () => leggiPersone(azienda).then((r) => { setElenco(r.persone); setErrore(r.errore); });
  useEffect(() => { carica(); }, [azienda]); // eslint-disable-line react-hooks/exhaustive-deps

  async function aggiungi(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    const r = await aggiungiPersona(azienda, tessera, nuovo);
    if (r.errore) return setErrore(r.errore);
    setTessera("");
    carica();
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="t-persone">
      <h2 id="t-persone" className="text-[19px] font-semibold tracking-tight">Chi ci lavora</h2>
      <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
        {(elenco ?? []).map((p) => (
          <li key={p.utente_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-medium">{p.nome ?? "Senza nome"}</span>
              {p.email ? <span className="truncate text-[13px] text-testo-2">{p.email}</span> : null}
            </span>
            <span className="shrink-0 text-[13px] text-testo-2">{RUOLI[p.ruolo]}</span>
          </li>
        ))}
      </ul>
      {ruolo === "titolare" ? (
        <form onSubmit={aggiungi} className="flex flex-col gap-3 rounded-2xl bg-superficie p-4">
          <p className="text-[14px] leading-relaxed text-testo-2">Aggiungi una persona con il numero della sua tessera SMR ID (lo trova nel profilo). Vendite prepara ed emette i documenti, Amministrazione anche i dati dell&apos;azienda, Solo lettura guarda.</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <input required value={tessera} onChange={(e) => setTessera(e.target.value)} placeholder="739-XXXX-XX" aria-label="Tessera SMR ID" className={`${CAMPO} h-11 bg-fondo font-mono uppercase`} />
            <select value={nuovo} onChange={(e) => setNuovo(e.target.value as Ruolo)} aria-label="Ruolo" className={`${CAMPO} h-11 bg-fondo`}>
              {(["amministrazione", "vendite", "lettura"] as Ruolo[]).map((r) => <option key={r} value={r}>{RUOLI[r]}</option>)}
            </select>
            <PrimaryButton type="submit" dimensione="sm" variante="interno" className="h-11">Aggiungi</PrimaryButton>
          </div>
        </form>
      ) : null}
      {errore ? <p role="alert" className={ERRORE}>{errore}</p> : null}
      {!puoGestire(ruolo) ? <p className="text-[13px] text-testo-2">Solo il titolare aggiunge le persone.</p> : null}
    </section>
  );
}
