import Link from "next/link";
import PaginaSezione from "@/components/aree/PaginaSezione";
import CosaDevoFare from "@/components/CosaDevoFare";
import { ConteggioAperte } from "@/components/Farmacie";
import { Icona } from "@/components/Icona";
import { sezione as trovaSezione } from "@/lib/aree";
import { getPratiche } from "@/lib/data";
import { getFarmacie } from "@/lib/servizi";

export const revalidate = 300;

type Props = { params: Promise<{ sezione: string }> };

export async function generateMetadata({ params }: Props) {
  const { sezione } = await params;
  return { title: `${trovaSezione("vivere", sezione)?.nome ?? "Sezione"} · 739 San Marino` };
}

/** Uffici e salute: prima la ricerca tra le pratiche, poi i luoghi. Salute ha anche le farmacie aperte adesso. */
async function Prima({ sezione }: { sezione: string }) {
  const s = trovaSezione("vivere", sezione);
  if (!s?.categorie || (sezione !== "uffici" && sezione !== "salute")) return null;
  const [pratiche, farmacie] = await Promise.all([getPratiche(s.categorie), sezione === "salute" ? getFarmacie() : Promise.resolve([])]);
  const esempi = Array.from(new Set(pratiche.map((p) => p.titolo))).slice(0, 4);
  return (
    <>
      {sezione === "salute" ? (
        <Link href="/utili/farmacie" className="flex items-center gap-4 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fondo text-testo"><Icona nome="farmacia" size={24} /></span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold"><ConteggioAperte farmacie={farmacie} breve /></span>
            <span className="text-[13px] text-testo-2">Orari e indicazioni</span>
          </span>
          <span className="ml-auto text-testo-2"><Icona nome="avanti" size={18} /></span>
        </Link>
      ) : null}
      {pratiche.length ? <CosaDevoFare pratiche={pratiche} esempi={esempi} /> : null}
    </>
  );
}

export default async function Sezione({ params }: Props) {
  const { sezione } = await params;
  return (
    <PaginaSezione
      area="vivere"
      sezione={sezione}
      prima={<Prima sezione={sezione} />}
      vuoto={sezione === "uffici" ? "Le schede degli uffici sono in preparazione: arrivano una alla volta, controllate alla fonte." : undefined}
    />
  );
}
