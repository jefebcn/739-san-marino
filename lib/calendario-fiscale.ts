import { FONTI, VOCI, type Categoria, type Destinatario, type Fonte, type SiglaFonte, type StatoVerifica, type Voce } from "./dati/calendario-fiscale";

// Dal file dei dati alle date: genera le ricorrenze (mensili e annuali) in un periodo, segna quelle che cadono
// nel weekend e mette prima la fonte più autorevole. Senza dipendenze: gira sul server e nel browser.

export const CATEGORIE_FISCALI: Categoria[] = ["IGR", "Ritenute", "Contributi ISS", "Dichiarazioni", "Monofase/Importazioni", "Bollo/Servizi", "Altro"];
export const DESTINATARI: Destinatario[] = ["persone fisiche", "persone giuridiche", "autonomi e professionisti", "datori di lavoro"];

/** Una scadenza con la sua data: quello che mostra la pagina e che va nel file .ics */
export type Scadenza = {
  chiave: string;
  voce: Voce;
  data: string;
  nota: string | null;
  stato: StatoVerifica;
  fonti: (Fonte & { sigla: SiglaFonte })[];
  weekend: boolean;
};

const ORDINE_FONTE = { ufficiale: 0, studio: 1, stampa: 2 } as const;
/** Le fonti dalla più autorevole: prima le ufficiali, poi studi e associazioni, poi la stampa */
export const fontiOrdinate = (sigle: SiglaFonte[]) =>
  sigle.map((sigla) => ({ sigla, ...(FONTI[sigla] as Fonte) })).sort((a, b) => ORDINE_FONTE[a.tipo] - ORDINE_FONTE[b.tipo]);

const iso = (anno: number, mese: number, giorno: number) => `${anno}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
const ultimoGiorno = (anno: number, mese: number) => new Date(Date.UTC(anno, mese, 0)).getUTCDate();
const giornoSettimana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();
/** Oggi a San Marino, AAAA-MM-GG */
export const oggiSM = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());
/** Una data spostata di n mesi (stesso giorno, o l'ultimo del mese se non c'è) */
export function piuMesi(data: string, mesi: number) {
  const [a, m, g] = data.split("-").map(Number);
  const t = a * 12 + (m - 1) + mesi;
  const anno = Math.floor(t / 12), mese = (t % 12) + 1;
  return iso(anno, mese, Math.min(g, ultimoGiorno(anno, mese)));
}

function scadenza(voce: Voce, data: string, nota: string | null = null, stato: StatoVerifica = voce.stato_verifica, sigle: SiglaFonte[] = voce.fonti): Scadenza {
  const g = giornoSettimana(data);
  return { chiave: `${voce.id}-${data}`, voce, data, nota, stato, fonti: fontiOrdinate(sigle), weekend: g === 0 || g === 6 };
}

/** Tutte le scadenze con una data tra `da` e `a` compresi (AAAA-MM-GG), in ordine di data */
export function scadenzeTra(da: string, a: string, voci: Voce[] = VOCI): Scadenza[] {
  const dentro = (d: string, v: Voce) => d >= da && d <= a && (!v.dal || d >= v.dal) && (!v.al || d <= v.al);
  const anni: number[] = [];
  for (let y = Number(da.slice(0, 4)); y <= Number(a.slice(0, 4)); y++) anni.push(y);
  const tutte: Scadenza[] = [];
  for (const v of voci) {
    if (v.data) {
      if (dentro(v.data, v)) tutte.push(scadenza(v, v.data));
      continue;
    }
    const r = v.ricorrenza;
    if (!r || r.tipo === "senza data") continue;
    for (const anno of anni) {
      if (r.tipo === "mensile") {
        for (let mese = 1; mese <= 12; mese++) {
          const d = iso(anno, mese, Math.min(r.giorno, ultimoGiorno(anno, mese)));
          if (dentro(d, v)) tutte.push(scadenza(v, d, r.noteMese?.[mese] ?? null));
        }
      } else {
        for (const g of r.date) {
          const d = iso(anno, g.mese, g.giorno === "ultimo" ? ultimoGiorno(anno, g.mese) : g.giorno);
          if (dentro(d, v)) tutte.push(scadenza(v, d, g.nota ?? null, g.stato ?? v.stato_verifica, g.fonti ?? v.fonti));
        }
      }
    }
  }
  return tutte.sort((x, y) => x.data.localeCompare(y.data) || x.voce.titolo.localeCompare(y.voce.titolo));
}

/** Le voci senza una data fissa (monofase): si mostrano a parte */
export const vociSenzaData = (voci: Voce[] = VOCI) => voci.filter((v) => v.ricorrenza?.tipo === "senza data");

/** Le scadenze dei prossimi `mesi` mesi da oggi (ora di San Marino) */
export function prossimeScadenze(mesi = 12) {
  const oggi = oggiSM();
  return scadenzeTra(oggi, piuMesi(oggi, mesi));
}

export const filtra = <T extends { voce: Voce }>(lista: T[], categoria: string | null, destinatario: string | null) =>
  lista.filter((s) => (!categoria || s.voce.categoria === categoria) && (!destinatario || s.voce.destinatari.includes(destinatario as Destinatario)));
