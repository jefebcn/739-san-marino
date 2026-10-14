import { anteprima, anteprimaMarchio, DIMENSIONI } from "@/lib/anteprima";
import { getEvento, formatData } from "@/lib/data";

export const alt = "Evento su 739 San Marino";
export const size = DIMENSIONI;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Anteprima({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getEvento(id);
  if (!e) return anteprimaMarchio();
  const dove = e.luogo?.nome ?? e.indirizzo ?? null;
  return anteprima({
    etichetta: formatData(e.inizio).replace(" · ", " alle ").replace(/^./, (x) => x.toUpperCase()),
    titolo: e.titolo,
    sotto: [dove, e.castello?.nome].filter(Boolean).join(", ") || null,
    colore: e.castello?.colore ?? null,
    foto: e.foto_url ?? null,
  });
}
