import { anteprima, anteprimaMarchio, DIMENSIONI } from "@/lib/anteprima";
import { getSpeciale, testoPeriodo } from "@/lib/speciali";
import { riassunto } from "@/lib/condivisione";

export const alt = "Speciale di 739 San Marino";
export const size = DIMENSIONI;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Anteprima({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSpeciale(slug);
  if (!s) return anteprimaMarchio();
  const quando = s.periodo ? testoPeriodo(s.periodo) : null;
  return anteprima({
    etichetta: quando ? `Speciale, ${quando}` : "Speciale",
    titolo: s.contenuto.titolo,
    sotto: s.eventi.length ? `${s.eventi.length} ${s.eventi.length === 1 ? "evento" : "eventi"} in programma, con mappa e parcheggi` : riassunto(s.contenuto.sommario, 90) || null,
    foto: s.contenuto.foto_url,
  });
}
