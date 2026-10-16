import { Icona } from "@/components/Icona";
import { TIPI_SCADENZA, type Scadenza } from "@/lib/scadenze";

const giorno = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", timeZone: "UTC" });
const mese = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
const data = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const d = (s: string) => new Date(`${s}T12:00:00Z`);

/** Le scadenze per mese: giorno a sinistra, cosa, per chi e la fonte ufficiale */
export default function Scadenze({ scadenze }: { scadenze: Scadenza[] }) {
  const mesi: { chiave: string; nome: string; voci: Scadenza[] }[] = [];
  for (const s of scadenze) {
    const k = s.giorno.slice(0, 7);
    const ultimo = mesi[mesi.length - 1];
    if (ultimo?.chiave === k) ultimo.voci.push(s);
    else mesi.push({ chiave: k, nome: mese.format(d(s.giorno)), voci: [s] });
  }
  return (
    <div className="flex flex-col gap-5">
      {mesi.map((m) => (
        <section key={m.chiave} className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold first-letter:uppercase">{m.nome}</h3>
          <ul className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {m.voci.map((s) => (
              <li key={s.id} className="flex gap-4 px-4 py-3.5">
                <span className="flex w-12 shrink-0 flex-col items-center pt-0.5 text-center">
                  <span className="voce-logo text-[24px] leading-none">{d(s.giorno).getUTCDate()}</span>
                  <span className="text-[12px] text-testo-2">{giorno.format(d(s.giorno)).split(" ")[0]}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[12px] font-medium text-testo-2">{TIPI_SCADENZA[s.tipo]}{s.tipo === "norme" ? ", da questo giorno" : s.tipo === "bando" && s.dal ? `, domande dal ${data.format(d(s.dal))}` : ""}</span>
                  <span className="text-[15px] font-semibold leading-snug">{s.titolo}</span>
                  {s.per_chi ? <span className="text-[13px] text-testo-2">Per chi: {s.per_chi}</span> : null}
                  {s.testo ? <span className="whitespace-pre-line text-sm leading-relaxed">{s.testo}</span> : null}
                  <a href={s.fonte_link} target="_blank" rel="noopener" className="flex w-fit items-center gap-1 pt-0.5 text-[13px] font-medium text-accento underline-offset-2 hover:underline">
                    Fonte: {s.fonte_nome} <Icona nome="sito" size={13} />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
