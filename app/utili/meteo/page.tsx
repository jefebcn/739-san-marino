import TestaPagina from "@/components/Indietro";
import { Icona } from "@/components/Icona";
import { FONTE_METEO, cielo, getMeteo, gradi } from "@/lib/meteo";

export const revalidate = 900;

export const metadata = { title: "Meteo · 739 San Marino" };

const giornoSettimana = new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: "UTC" });

function nomeGiorno(data: string, i: number) {
  if (i === 0) return "Oggi";
  if (i === 1) return "Domani";
  const s = giornoSettimana.format(new Date(`${data}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function Meteo() {
  const m = await getMeteo();

  if (!m) {
    return (
      <>
        <TestaPagina href="/vivere" verso="Vivere" titolo="Meteo" />
        <p className="vuoto">Il meteo non è disponibile in questo momento. Riprova tra qualche minuto.</p>
      </>
    );
  }

  const ora = cielo(m.codice, m.giorno);
  const oggi = m.giorni[0];
  // Scala comune per le barre delle temperature della settimana
  const minimo = Math.min(...m.giorni.map((g) => g.min));
  const massimo = Math.max(...m.giorni.map((g) => g.max));
  const scala = Math.max(massimo - minimo, 1);

  return (
    <>
      <TestaPagina href="/vivere" verso="Vivere" titolo="Meteo sul Titano" />

      <section className="flex items-center gap-5 rounded-2xl bg-superficie p-5">
        <span className="text-testo"><Icona nome={ora.icona} size={64} /></span>
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[56px] font-medium leading-none tracking-[-0.06em]">{gradi(m.temperatura)}</span>
          <span className="mt-1 text-[17px] font-semibold">{ora.testo}</span>
          <span className="text-sm text-testo-2">
            Percepita {gradi(m.percepita)}, vento {Math.round(m.vento)} km/h
          </span>
        </div>
      </section>

      {oggi ? (
        <p className="-mt-2 text-sm text-testo-2">
          Oggi minima <b className="font-mono font-medium text-testo">{gradi(oggi.min)}</b>, massima <b className="font-mono font-medium text-testo">{gradi(oggi.max)}</b>. Alba alle {oggi.alba}, tramonto alle {oggi.tramonto}.
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight">Prossime ore</h2>
        <div className="-mx-[var(--lato)] flex gap-2 overflow-x-auto px-[var(--lato)] pb-1 [scrollbar-width:none]">
          {m.ore.map((o) => {
            const c = cielo(o.codice, o.giorno);
            return (
              <div key={o.ora} className="flex w-[64px] shrink-0 flex-col items-center gap-2 rounded-2xl bg-superficie py-3">
                <span className="font-mono text-xs text-testo-2">{o.ora}</span>
                <span aria-label={c.testo}><Icona nome={c.icona} size={24} /></span>
                <span className="font-mono text-[15px] font-medium">{gradi(o.temperatura)}</span>
                <span className={`font-mono text-[11px] ${o.pioggia >= 30 ? "text-azzurro" : "text-testo-2"}`}>{o.pioggia}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight">Questa settimana</h2>
        <div className="divide-y divide-linea rounded-2xl bg-superficie px-4">
          {m.giorni.map((g, i) => {
            const c = cielo(g.codice);
            const sinistra = ((g.min - minimo) / scala) * 100;
            const larghezza = ((g.max - g.min) / scala) * 100;
            return (
              <div key={g.data} className="grid grid-cols-[84px_28px_44px_1fr] items-center gap-2 py-3">
                <span className="text-[15px] font-medium">{nomeGiorno(g.data, i)}</span>
                <span aria-label={c.testo}><Icona nome={c.icona} size={22} /></span>
                <span className={`font-mono text-xs ${g.pioggia >= 30 ? "text-azzurro" : "text-testo-2"}`}>{g.pioggia}%</span>
                <span className="flex items-center gap-2 font-mono text-sm">
                  <span className="w-8 text-right text-testo-2">{gradi(g.min)}</span>
                  <span className="relative h-1.5 flex-1 rounded-full bg-fondo">
                    <span className="absolute inset-y-0 rounded-full bg-accento" style={{ left: `${sinistra}%`, width: `${Math.max(larghezza, 4)}%` }} />
                  </span>
                  <span className="w-8 font-medium">{gradi(g.max)}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[13px] text-testo-2">La percentuale è la probabilità di pioggia.</p>
      </section>

      <p className="fonte">Fonte: <a href={FONTE_METEO} target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0), aggiornato ogni 15 minuti.</p>
    </>
  );
}
