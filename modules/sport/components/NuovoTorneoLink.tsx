"use client";

import { useEffect, useState } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useSessione } from "@/modules/core/store";
import { mieiRuoli } from "@/modules/core/ruoli";

/** «Nuovo torneo», solo per la redazione (i permessi veri li controlla crea_torneo nel database). */
export default function NuovoTorneoLink() {
  const stato = useSessione((s) => s.stato);
  const [redazione, setRedazione] = useState(false);
  useEffect(() => {
    if (stato === "connesso") mieiRuoli().then((r) => setRedazione(r.redattore));
  }, [stato]);
  if (!redazione) return null;
  return <PrimaryButton href="/sport/tornei/nuovo" variante="secondario" className="w-fit">Nuovo torneo</PrimaryButton>;
}
