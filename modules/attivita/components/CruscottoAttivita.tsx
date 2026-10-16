"use client";

import { useEffect, useState } from "react";
import { Cella, Cruscotto } from "@/components/Cruscotto";
import type { Luogo } from "@/lib/data";
import { mioPro, numeriScheda, type MioPro } from "../api";
import { mieOfferteLavoro } from "../lavoro-api";

const giorno = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
const breve = (d: string) => giorno.format(new Date(`${d.slice(0, 10)}T12:00:00Z`)).replace(".", "");
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/San_Marino" }).format(new Date());

/** Il cruscotto del titolare, in cima alla sua attività: la scheda, le offerte di lavoro aperte, il Pro e le visite */
export default function CruscottoAttivita({ luogo }: { luogo: Luogo }) {
  const id = luogo.id;
  const [pro, setPro] = useState<MioPro | null | undefined>(undefined);
  const [offerte, setOfferte] = useState<number | null>(null);
  const [visite, setVisite] = useState<number | null>(null);

  useEffect(() => {
    mioPro(id).then((r) => {
      setPro(r.pro);
      if (r.pro?.attivo) numeriScheda(id, 30).then((n) => setVisite(n.numeri.find((x) => x.tipo === "visita")?.totale ?? 0));
    });
    mieOfferteLavoro(id).then((r) => setOfferte(r.offerte.filter((o) => o.stato === "pubblicata" && o.scadenza >= oggi()).length));
  }, [id]);

  const attivo = !!pro?.attivo;
  return (
    <Cruscotto etichetta="La tua attività adesso">
      <Cella href={`/luoghi/${id}`} titolo="La scheda" valore={luogo.verificato_il ? breve(luogo.verificato_il) : "Da fare"} unita={luogo.verificato_il ? "ultimo aggiornamento" : "aggiornala qui sotto"} nota="Apri la scheda pubblica" />
      <Cella href={`/profile/attivita/${id}/lavoro`} titolo="Offerte di lavoro" valore={offerte ?? "…"} unita={offerte === 1 ? "aperta" : "aperte"} nota={offerte ? "Modifica o chiudi" : "Cerchi personale? Pubblicala"} />
      <Cella href="#pro" titolo="739 Pro" valore={pro === undefined ? "…" : attivo ? "Attivo" : "Base"} unita={attivo && pro?.fino ? `fino al ${breve(pro.fino)}` : "profilo gratis"} nota={attivo ? "Menu, prenota, offerte" : "Menu, prenota, offerte e numeri"} />
      <Cella href={attivo ? `/profile/attivita/${id}/numeri` : "#pro"} titolo="Visite" valore={attivo ? (visite ?? "…") : "–"} unita="in 30 giorni" nota={attivo ? "I numeri della scheda" : "Le vedi con il Pro"} />
    </Cruscotto>
  );
}
