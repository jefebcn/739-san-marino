import { anteprima, anteprimaMarchio, DIMENSIONI } from "@/lib/anteprima";
import { getContenuto, TIPI } from "@/lib/contenuti";
import { riassunto } from "@/lib/condivisione";

export const alt = "Contenuto di 739 San Marino";
export const size = DIMENSIONI;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Anteprima({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getContenuto(slug);
  if (!c) return anteprimaMarchio();
  return anteprima({ etichetta: TIPI[c.tipo].nome, titolo: c.titolo, sotto: riassunto(c.sommario, 90) || null, foto: c.foto_url });
}
