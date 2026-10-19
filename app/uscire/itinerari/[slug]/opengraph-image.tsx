import { anteprima, anteprimaMarchio, DIMENSIONI } from "@/lib/anteprima";
import { SENTIERI, dislivello, durata, km, percorso, sentiero, tempo } from "@/modules/itinerari/sentieri";

export const alt = "Sentiero di San Marino su 739";
export const size = DIMENSIONI;
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return SENTIERI.map((s) => ({ slug: s.slug }));
}

export default async function Anteprima({ params }: { params: Promise<{ slug: string }> }) {
  const s = sentiero((await params).slug);
  if (!s) return anteprimaMarchio();
  const d = dislivello(s);
  return anteprima({
    etichetta: s.numero ? `Sentiero ${s.numero}` : "Sentiero",
    titolo: s.nome,
    sotto: [percorso(s), `${km(s.lunghezza_m)}${d !== null ? `, ${d} m di dislivello` : ""}, circa ${durata(tempo(s).minuti)}`].filter(Boolean).join(". "),
  });
}
