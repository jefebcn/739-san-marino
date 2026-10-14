"use client";

import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { leggiCastello } from "@/components/Castello";
import type { Castello } from "@/lib/data";
import { accedi, nuovaPassword, recuperaPassword, registrati } from "../auth";

type Modo = "accedi" | "registrati" | "recupero";

export function Campo({ etichetta, ...props }: { etichetta: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-testo-2">{etichetta}</span>
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-linea bg-superficie px-4 text-[15px] text-testo outline-none transition-colors placeholder:text-testo-2/60 focus:border-accento"
      />
    </label>
  );
}

function Avviso({ tono, children }: { tono: "errore" | "ok"; children: React.ReactNode }) {
  return (
    <p role={tono === "errore" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${tono === "errore" ? "bg-segnale/12 text-segnale" : "bg-accento-tenue text-accento"}`}>
      {children}
    </p>
  );
}

/** Accesso, registrazione e recupero password con email e password (Supabase Auth). */
export default function Accesso({ castelli }: { castelli: Castello[] }) {
  const [modo, setModo] = useState<Modo>("accedi");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [castello, setCastello] = useState<number | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Parte dal castello già scelto sul telefono
  useEffect(() => {
    const slug = leggiCastello();
    setCastello(castelli.find((c) => c.slug === slug)?.id ?? null);
  }, [castelli]);

  const cambia = (m: Modo) => {
    setModo(m);
    setErrore(null);
    setOk(null);
  };

  const invia = async (e: FormEvent) => {
    e.preventDefault();
    setInCorso(true);
    setErrore(null);
    setOk(null);
    if (modo === "accedi") {
      const r = await accedi(email, password);
      setErrore(r.errore);
    } else if (modo === "registrati") {
      const r = await registrati({ email, password, nome, castello_id: castello });
      setErrore(r.errore);
      if (r.daConfermare) setOk(`Ti abbiamo scritto a ${email.trim()}: apri il link per attivare il tuo SMR ID.`);
    } else {
      const r = await recuperaPassword(email);
      setErrore(r.errore);
      if (!r.errore) setOk("Se l'indirizzo è registrato, riceverai un link per scegliere una nuova password.");
    }
    setInCorso(false);
  };

  const ordinati = [...castelli].sort((a, b) => a.id - b.id);

  return (
    <div className="flex flex-col gap-5">
      {modo !== "recupero" ? (
        <div role="tablist" aria-label="Accesso" className="grid grid-cols-2 gap-1 rounded-xl bg-superficie p-1">
          {(["accedi", "registrati"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => cambia(m)}
              className="h-10 rounded-lg text-sm font-semibold text-testo-2 transition-colors aria-selected:bg-superficie-2 aria-selected:text-testo"
            >
              {m === "accedi" ? "Accedi" : "Crea account"}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={invia} className="flex flex-col gap-4">
        {modo === "registrati" ? (
          <Campo etichetta="Nome" name="nome" autoComplete="given-name" required maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Come ti chiamano" />
        ) : null}
        <Campo etichetta="Email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.sm" />
        {modo !== "recupero" ? (
          <Campo
            etichetta="Password"
            name="password"
            type="password"
            autoComplete={modo === "accedi" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={modo === "registrati" ? "Almeno 8 caratteri" : ""}
          />
        ) : null}

        {modo === "registrati" ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[13px] font-medium text-testo-2">Il tuo castello</legend>
            <div className="flex flex-wrap gap-1.5">
              {ordinati.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={castello === c.id}
                  onClick={() => setCastello(c.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-linea bg-superficie px-3 py-2 text-left text-[13px] font-medium aria-pressed:border-accento aria-pressed:bg-accento-tenue"
                >
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: c.colore }} />
                  <span>{c.nome}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {errore ? <Avviso tono="errore">{errore}</Avviso> : null}
        {ok ? <Avviso tono="ok">{ok}</Avviso> : null}

        <PrimaryButton type="submit" pieno disabled={inCorso}>
          {inCorso ? "Un attimo…" : modo === "accedi" ? "Accedi" : modo === "registrati" ? "Crea il mio SMR ID" : "Invia il link"}
        </PrimaryButton>
      </form>

      {modo === "accedi" ? (
        <PrimaryButton variante="fantasma" dimensione="sm" onClick={() => cambia("recupero")}>Password dimenticata?</PrimaryButton>
      ) : modo === "recupero" ? (
        <PrimaryButton variante="fantasma" dimensione="sm" onClick={() => cambia("accedi")}>Torna all&apos;accesso</PrimaryButton>
      ) : (
        <p className="text-center text-xs text-testo-2">Creando l&apos;account accetti che 739 salvi nome, email e castello per farti usare l&apos;app.</p>
      )}
    </div>
  );
}

/** Dopo il link "password dimenticata": scelta della nuova password. */
export function NuovaPassword({ fatto }: { fatto: () => void }) {
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl bg-superficie p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setInCorso(true);
        const r = await nuovaPassword(password);
        setInCorso(false);
        if (r.errore) setErrore(r.errore);
        else fatto();
      }}
    >
      <h2 className="text-lg font-semibold">Scegli una nuova password</h2>
      <Campo etichetta="Nuova password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      {errore ? <Avviso tono="errore">{errore}</Avviso> : null}
      <PrimaryButton type="submit" pieno disabled={inCorso}>{inCorso ? "Un attimo…" : "Salva la password"}</PrimaryButton>
    </form>
  );
}
