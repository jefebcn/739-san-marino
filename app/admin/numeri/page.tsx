import Numeri from "@/modules/redazione/components/Numeri";
import Riservato from "@/modules/redazione/components/Riservato";

export const metadata = { title: "Numeri · 739 San Marino", robots: { index: false, follow: false } };

export default function PaginaNumeri() {
  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Numeri</h1>
        <p className="text-[15px] text-testo-2">Come sta andando 739, rispetto agli obiettivi delle fasi.</p>
      </section>
      <Riservato ruolo="amministratore">
        <Numeri />
      </Riservato>
    </>
  );
}
