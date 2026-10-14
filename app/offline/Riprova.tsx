"use client";

import PrimaryButton from "@/components/ui/PrimaryButton";

/** Torna alla pagina di prima appena c'è di nuovo la rete. */
export default function Riprova() {
  return (
    <div className="flex flex-col gap-2">
      <PrimaryButton pieno onClick={() => location.reload()}>Riprova</PrimaryButton>
      <PrimaryButton variante="secondario" pieno href="/">Vai a Oggi</PrimaryButton>
    </div>
  );
}
