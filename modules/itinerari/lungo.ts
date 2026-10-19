import { supabase } from "@/lib/supabase";
import type { Sentiero } from "./sentieri";

// I luoghi lungo un sentiero: fontanelle, bagni, panorami, monumenti, chiese, locali e parcheggi a meno di 120 m
// dalla linea, nell'ordine in cui si incontrano. Si leggono con luoghi_mappa (migrazione 0037) nel riquadro del sentiero.

export type LuogoLungo = { id: string; nome: string; categoria: string; sottocategoria: string | null; lat: number; lng: number; a_m: number; distanza_m: number };

const CATEGORIE = ["acqua", "bagni", "panorama", "cultura", "luogo", "chiesa", "locale", "parcheggio"];
const MASSIMO = 120;

const metri = (a: [number, number], b: [number, number]) =>
  Math.hypot((b[0] - a[0]) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180) * 111320, (b[1] - a[1]) * 110540);

/** Distanza di un punto dalla linea e a quanti metri dalla partenza cade */
function proietta(p: [number, number], linee: [number, number][][]) {
  let migliore = { d: Infinity, a: 0 };
  let fatto = 0;
  for (const linea of linee) {
    for (let i = 1; i < linea.length; i++) {
      const [a, b] = [linea[i - 1], linea[i]];
      const k = Math.cos((a[1] * Math.PI) / 180) * 111320;
      const [ax, ay, bx, by, px, py] = [a[0] * k, a[1] * 110540, b[0] * k, b[1] * 110540, p[0] * k, p[1] * 110540];
      const dx = bx - ax, dy = by - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      const seg = metri(a, b);
      if (d < migliore.d) migliore = { d, a: fatto + t * seg };
      fatto += seg;
    }
  }
  return migliore;
}

export async function luoghiLungo(s: Sentiero): Promise<LuogoLungo[]> {
  const db = supabase();
  if (!db) return [];
  const m = 0.002;
  const [o, su, e, n] = s.bbox;
  const { data, error } = await db.rpc("luoghi_mappa", { p_ovest: o - m, p_sud: su - m, p_est: e + m, p_nord: n + m, p_categorie: CATEGORIE, p_limite: 500 });
  if (error) {
    console.error("luoghi lungo il sentiero", error.message);
    return [];
  }
  return ((data ?? []) as Omit<LuogoLungo, "a_m" | "distanza_m">[])
    .map((l) => {
      const { d, a } = proietta([l.lng, l.lat], s.linee);
      return { ...l, a_m: Math.round(a), distanza_m: Math.round(d) };
    })
    .filter((l) => l.distanza_m <= MASSIMO)
    .sort((x, y) => x.a_m - y.a_m)
    .slice(0, 12);
}
