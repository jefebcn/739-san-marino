import type { NomeIcona } from "@/components/Icona";

// Meteo da Open-Meteo (https://open-meteo.com): nessuna chiave, licenza CC BY 4.0 (va citata la fonte).
// Gratis per uso non commerciale: se 739 diventa commerciale serve il piano a pagamento.
const URL_METEO =
  "https://api.open-meteo.com/v1/forecast?latitude=43.9355&longitude=12.4473" +
  "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m" +
  "&hourly=temperature_2m,weather_code,precipitation_probability,is_day" +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
  "&timezone=Europe%2FRome&forecast_days=7";

export const FONTE_METEO = "https://open-meteo.com";

export type Ora = { ora: string; temperatura: number; codice: number; pioggia: number; giorno: boolean };
export type Giorno = { data: string; codice: number; max: number; min: number; pioggia: number; alba: string; tramonto: string };
export type Meteo = {
  temperatura: number;
  percepita: number;
  codice: number;
  giorno: boolean;
  vento: number;
  ore: Ora[];
  giorni: Giorno[];
};

type Risposta = {
  current: { time: string; temperature_2m: number; apparent_temperature: number; weather_code: number; is_day: number; wind_speed_10m: number };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: number[]; is_day: number[] };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

/** Meteo attuale, prossime 12 ore e 7 giorni. Si aggiorna ogni 15 minuti; se Open-Meteo non risponde restituisce null. */
export async function getMeteo(): Promise<Meteo | null> {
  try {
    const r = await fetch(URL_METEO, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = (await r.json()) as Risposta;
    const c = d.current;
    // Le ore sono in ora locale senza fuso: si confrontano come testo con l'ora attuale di Open-Meteo
    const da = d.hourly.time.findIndex((t) => t >= c.time.slice(0, 13));
    const ore: Ora[] = d.hourly.time.slice(Math.max(da, 0), Math.max(da, 0) + 12).map((t, i) => {
      const j = Math.max(da, 0) + i;
      return {
        ora: t.slice(11, 16),
        temperatura: d.hourly.temperature_2m[j],
        codice: d.hourly.weather_code[j],
        pioggia: d.hourly.precipitation_probability[j] ?? 0,
        giorno: d.hourly.is_day[j] === 1,
      };
    });
    const giorni: Giorno[] = d.daily.time.map((t, i) => ({
      data: t,
      codice: d.daily.weather_code[i],
      max: d.daily.temperature_2m_max[i],
      min: d.daily.temperature_2m_min[i],
      pioggia: d.daily.precipitation_probability_max[i] ?? 0,
      alba: d.daily.sunrise[i].slice(11, 16),
      tramonto: d.daily.sunset[i].slice(11, 16),
    }));
    return {
      temperatura: c.temperature_2m,
      percepita: c.apparent_temperature,
      codice: c.weather_code,
      giorno: c.is_day === 1,
      vento: c.wind_speed_10m,
      ore,
      giorni,
    };
  } catch (e) {
    console.error("meteo", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Descrizione e icona dal codice meteo WMO usato da Open-Meteo. */
export function cielo(codice: number, giorno = true): { testo: string; icona: NomeIcona } {
  if (codice === 0) return { testo: "Sereno", icona: giorno ? "sole" : "luna" };
  if (codice === 1) return { testo: "Quasi sereno", icona: giorno ? "sole" : "luna" };
  if (codice === 2) return { testo: "Poco nuvoloso", icona: giorno ? "sole-nuvole" : "luna-nuvole" };
  if (codice === 3) return { testo: "Nuvoloso", icona: "nuvole" };
  if (codice === 45 || codice === 48) return { testo: "Nebbia", icona: "nebbia" };
  if (codice >= 51 && codice <= 57) return { testo: "Pioviggine", icona: "pioggia" };
  if (codice === 61 || codice === 80) return { testo: "Pioggia debole", icona: "pioggia" };
  if (codice === 63 || codice === 81) return { testo: "Pioggia", icona: "pioggia" };
  if (codice === 65 || codice === 82) return { testo: "Pioggia forte", icona: "pioggia" };
  if (codice === 66 || codice === 67) return { testo: "Pioggia gelata", icona: "pioggia" };
  if ((codice >= 71 && codice <= 77) || codice === 85 || codice === 86) return { testo: "Neve", icona: "neve" };
  if (codice >= 95) return { testo: "Temporale", icona: "temporale" };
  return { testo: "Variabile", icona: "sole-nuvole" };
}

export const gradi = (t: number) => `${Math.round(t)}°`;
