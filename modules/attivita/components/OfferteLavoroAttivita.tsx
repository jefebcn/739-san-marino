"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icona } from "@/components/Icona";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { CONTRATTI, leggiGiorno, type Contratto, type Orario } from "@/modules/lavorare/offerte";
import { luogoDaModificare } from "../api";
import { chiudiOffertaLavoro, mieOfferteLavoro, salvaOffertaLavoro, type DatiOfferta, type MiaOffertaLavoro } from "../lavoro-api";
import { CAMPO } from "./stile";

const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());
const traGiorni = (n: number) => {
  const d = new Date(`${oggi()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const VUOTA = (email = "", telefono = ""): DatiOfferta => ({
  titolo: "", contratto: "indeterminato", orario: "tempo pieno", descrizione: "", sede: "", email, link: "", telefono, scadenza: traGiorni(30),
});

function Campo({ testo, nota, children }: { testo: string; nota?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{testo}</span>
      {children}
      {nota ? <span className="text-xs text-testo-2">{nota}</span> : null}
    </label>
  );
}

function stato(o: MiaOffertaLavoro) {
  if (o.stato === "ritirata") return { testo: `Ritirata dalla redazione${o.nota_redazione ? `: ${o.nota_redazione}` : ""}`, aperta: false, classe: "text-segnale" };
  if (o.stato === "chiusa") return { testo: "Chiusa da te", aperta: false, classe: "text-testo-2" };
  if (o.scadenza < oggi()) return { testo: `Scaduta il ${leggiGiorno(o.scadenza)}`, aperta: false, classe: "text-testo-2" };
  return { testo: `Online fino al ${leggiGiorno(o.scadenza)}`, aperta: true, classe: "text-ok" };
}

/** Il titolare pubblica, modifica e chiude le offerte di lavoro della sua attività. I permessi li controlla il database. */
export default function OfferteLavoroAttivita({ id }: { id: string }) {
  const { stato: sessione } = useSessione();
  const [nome, setNome] = useState<string | null>(null);
  const [offerte, setOfferte] = useState<MiaOffertaLavoro[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [modulo, setModulo] = useState<{ id: string | null; dati: DatiOfferta } | null>(null);
  const [predefiniti, setPredefiniti] = useState({ email: "", telefono: "" });
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState<string | null>(null);

  const carica = useCallback(() => {
    mieOfferteLavoro(id).then((r) => {
      setOfferte(r.offerte);
      setErrore(r.errore);
    });
  }, [id]);

  useEffect(() => {
    if (sessione !== "connesso") return;
    luogoDaModificare(id).then((r) => {
      setNome(r.luogo?.nome ?? null);
      setPredefiniti({ email: r.luogo?.email ?? "", telefono: r.luogo?.telefono ?? "" });
    });
    carica();
  }, [sessione, id, carica]);

  if (sessione === "caricamento" || (sessione === "connesso" && !offerte && !errore)) {
    return <div className="h-48 animate-pulse rounded-2xl bg-superficie" aria-busy="true" aria-label="Caricamento" />;
  }
  if (sessione !== "connesso") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-testo-2">Per pubblicare un&apos;offerta entra con il tuo SMR ID.</p>
        <PrimaryButton href={`/profile?torna=${encodeURIComponent(`/profile/attivita/${id}/lavoro`)}`} className="w-fit">Entra</PrimaryButton>
      </div>
    );
  }
  if (errore && !offerte?.length && !modulo) return <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p>;

  const cambia = <K extends keyof DatiOfferta>(k: K, v: DatiOfferta[K]) => modulo && setModulo({ ...modulo, dati: { ...modulo.dati, [k]: v } });

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modulo) return;
    setInvio(true);
    setErrore(null);
    const r = await salvaOffertaLavoro(id, modulo.id, modulo.dati);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setFatto(modulo.id ? "Offerta aggiornata." : "Offerta pubblicata: è già online.");
    setModulo(null);
    carica();
  };

  const chiudi = async (o: MiaOffertaLavoro, chiusa: boolean) => {
    setInvio(true);
    const r = await chiudiOffertaLavoro(o.id, id, chiusa);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    setFatto(chiusa ? "Offerta chiusa: non compare più tra le offerte." : "Offerta di nuovo online.");
    carica();
  };

  if (modulo) {
    const d = modulo.dati;
    return (
      <form onSubmit={salva} className="flex flex-col gap-5">
        <h2 className="text-[19px] font-semibold tracking-tight">{modulo.id ? "Modifica l'offerta" : "Nuova offerta"}{nome ? ` di ${nome}` : ""}</h2>
        <Campo testo="Chi cercate">
          <input required minLength={3} maxLength={100} value={d.titolo} onChange={(e) => cambia("titolo", e.target.value)} placeholder="Es. Cameriere di sala, Commessa, Elettricista" className={`h-12 ${CAMPO}`} />
        </Campo>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo testo="Contratto">
            <select value={d.contratto} onChange={(e) => cambia("contratto", e.target.value as Contratto)} className={`h-12 ${CAMPO}`}>
              {(Object.keys(CONTRATTI) as Contratto[]).map((c) => <option key={c} value={c}>{CONTRATTI[c]}</option>)}
            </select>
          </Campo>
          <Campo testo="Orario">
            <select value={d.orario} onChange={(e) => cambia("orario", e.target.value as Orario)} className={`h-12 ${CAMPO}`}>
              <option value="tempo pieno">Tempo pieno</option>
              <option value="part-time">Part-time</option>
            </select>
          </Campo>
        </div>
        <Campo testo="Il lavoro" nota="Cosa si fa, orari e turni, cosa serve (esperienza, lingue, patente). Non chiedere età, sesso, stato civile o provenienza. Da 30 a 3000 caratteri.">
          <textarea required minLength={30} maxLength={3000} rows={7} value={d.descrizione} onChange={(e) => cambia("descrizione", e.target.value)} placeholder="Es. Cerchiamo una persona per il servizio ai tavoli, da marzo a ottobre, turni serali e due giorni liberi a settimana. Serve un po' di esperienza e l'inglese di base." className={`${CAMPO} py-3 leading-relaxed`} />
        </Campo>
        <Campo testo="Dove si lavora (facoltativo)" nota="Solo se non è l'indirizzo della scheda.">
          <input maxLength={200} value={d.sede} onChange={(e) => cambia("sede", e.target.value)} placeholder="Es. Cantieri in tutto il territorio" className={`h-12 ${CAMPO}`} />
        </Campo>
        <fieldset className="flex flex-col gap-3">
          <legend className="pb-1 text-[15px] font-semibold">Come candidarsi</legend>
          <p className="-mt-1 text-xs text-testo-2">Almeno uno. Le candidature arrivano a voi: 739 non le vede.</p>
          <Campo testo="Email">
            <input type="email" maxLength={160} value={d.email} onChange={(e) => cambia("email", e.target.value)} placeholder="lavoro@tuaattivita.sm" className={`h-12 ${CAMPO}`} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo testo="Link per candidarsi">
              <input type="url" maxLength={500} value={d.link} onChange={(e) => cambia("link", e.target.value)} placeholder="https://" className={`h-12 ${CAMPO}`} />
            </Campo>
            <Campo testo="Telefono">
              <input type="tel" inputMode="tel" maxLength={30} value={d.telefono} onChange={(e) => cambia("telefono", e.target.value)} placeholder="0549 123456" className={`h-12 ${CAMPO}`} />
            </Campo>
          </div>
        </fieldset>
        <Campo testo="Online fino al" nota="Al massimo 60 giorni. Quando trovate la persona potete chiuderla prima.">
          <input type="date" required min={oggi()} max={traGiorni(60)} value={d.scadenza} onChange={(e) => cambia("scadenza", e.target.value)} className={`h-12 ${CAMPO}`} />
        </Campo>
        {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="submit" disabled={invio}>{invio ? "Pubblico…" : modulo.id ? "Salva" : "Pubblica l'offerta"}</PrimaryButton>
          <PrimaryButton variante="secondario" onClick={() => { setModulo(null); setErrore(null); }}>Annulla</PrimaryButton>
        </div>
        <p className="-mt-2 text-[13px] text-testo-2">L&apos;offerta va online subito in Lavorare, con il nome della tua attività. La redazione può ritirarla se non rispetta i Termini.</p>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {fatto ? <p role="status" className="rounded-xl bg-superficie px-4 py-3 text-sm font-medium">{fatto}</p> : null}
      {errore ? <p role="alert" className="rounded-xl bg-segnale/12 px-4 py-3 text-sm text-segnale">{errore}</p> : null}
      {offerte?.length ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
          {offerte.map((o) => {
            const s = stato(o);
            return (
              <li key={o.id} className="flex flex-col gap-2 px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{o.titolo}</span>
                  <span className="text-[13px] text-testo-2">{CONTRATTI[o.contratto]}, {o.orario}</span>
                  <span className={`text-[13px] font-medium ${s.classe}`}>{s.testo}</span>
                </div>
                {o.stato !== "ritirata" ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {s.aperta ? <Link href={`/lavorare/lavoro/${o.id}`} className="py-1 text-sm font-semibold text-accento">Apri</Link> : null}
                    <button type="button" className="py-1 text-sm font-semibold text-accento" onClick={() => { setFatto(null); setModulo({ id: o.id, dati: { titolo: o.titolo, contratto: o.contratto, orario: o.orario, descrizione: o.descrizione, sede: o.sede ?? "", email: o.email ?? "", link: o.link ?? "", telefono: o.telefono ?? "", scadenza: o.scadenza < oggi() ? traGiorni(30) : o.scadenza } }); }}>
                      {s.aperta ? "Modifica" : "Rimetti online"}
                    </button>
                    {s.aperta ? <button type="button" disabled={invio} className="py-1 text-sm font-medium text-testo-2 hover:text-testo" onClick={() => chiudi(o, true)}>Chiudi, posto trovato</button> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl bg-superficie p-5 text-[15px] leading-relaxed text-testo-2">Non hai ancora pubblicato offerte. Compaiono in Lavorare, nella scheda della tua attività e su Google.</p>
      )}
      <PrimaryButton className="w-fit" icona={<Icona nome="piu" />} onClick={() => { setFatto(null); setErrore(null); setModulo({ id: null, dati: VUOTA(predefiniti.email, predefiniti.telefono) }); }}>Nuova offerta</PrimaryButton>
    </div>
  );
}
