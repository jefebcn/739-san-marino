import Link from "next/link";
import TestaPagina from "@/components/Indietro";
import NumeriEmergenza from "@/components/NumeriEmergenza";
import { Icona } from "@/components/Icona";
import { metaEn } from "@/lib/lingua";

export const metadata = metaEn("Emergency numbers", "Emergency numbers in San Marino and the pharmacy that is always open.", null, "/en/emergency");

export default function Emergency() {
  return (
    <>
      <TestaPagina href="/en" verso="Today" titolo="Emergency">
        <p className="sottotitolo">San Marino uses the same emergency numbers as Italy. 112 works from any phone, also without credit.</p>
      </TestaPagina>
      <NumeriEmergenza lingua="en" />
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[19px] font-semibold tracking-tight">Health</h2>
        <Link href="/en/pharmacies" className="flex items-center gap-4 rounded-2xl bg-superficie p-4 transition-colors hover:bg-superficie-2">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fondo text-testo"><Icona nome="farmacia" size={24} /></span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold">Pharmacies open now</span>
            <span className="text-[13px] text-testo-2">The one at the State Hospital, in Cailungo, is open day and night</span>
          </span>
          <span className="ml-auto text-testo-2"><Icona nome="avanti" size={18} /></span>
        </Link>
      </section>
    </>
  );
}
