import { anteprima, anteprimaMarchio, DIMENSIONI } from "@/lib/anteprima";
import { CATEGORIE, getClassifica, getLuogo } from "@/lib/data";

export const alt = "Luogo su 739 San Marino";
export const size = DIMENSIONI;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Anteprima({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [l, castelli] = await Promise.all([getLuogo(id), getClassifica()]);
  if (!l) return anteprimaMarchio();
  const castello = castelli.find((c) => c.id === l.castello_id);
  return anteprima({
    etichetta: CATEGORIE[l.categoria] ?? "Luogo",
    titolo: l.nome,
    sotto: [l.indirizzo, castello?.nome].filter(Boolean).join(", ") || null,
    colore: castello?.colore ?? null,
    foto: (l as { foto_url?: string | null }).foto_url ?? null,
  });
}
