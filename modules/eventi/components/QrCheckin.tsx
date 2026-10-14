"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icona } from "@/components/Icona";
import { useSessione } from "@/modules/core/store";
import { mieiRuoli } from "@/modules/core/ruoli";
import { codiceCheckin } from "../api";

/**
 * Il QR del check-in, solo per la redazione e per chi ha pubblicato l'evento:
 * si scarica in PNG da stampare e appendere all'ingresso. Agli altri non compare nulla.
 */
export default function QrCheckin({ evento, titolo }: { evento: string; titolo: string }) {
  const { stato } = useSessione();
  const [link, setLink] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (stato !== "connesso") return;
    let annullato = false;
    mieiRuoli().then(async (r) => {
      if (!r.organizzatore) return;
      // Il database decide se puoi vederlo: un organizzatore vede solo i QR dei propri eventi
      const { codice } = await codiceCheckin(evento);
      if (!codice || annullato) return;
      const url = `${window.location.origin}/eventi/${evento}/checkin?c=${codice}`;
      setLink(url);
      setSvg(await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#09090B", light: "#FFFFFF" } }));
    });
    return () => {
      annullato = true;
    };
  }, [stato, evento]);

  if (!link || !svg) return null;

  const scarica = async () => {
    const png = await QRCode.toDataURL(link, { width: 1200, margin: 2, errorCorrectionLevel: "M", color: { dark: "#09090B", light: "#FFFFFF" } });
    const a = document.createElement("a");
    a.href = png;
    a.download = `739-checkin-${titolo.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png`;
    a.click();
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-superficie p-4" aria-labelledby="titolo-qr">
      <div className="flex flex-col gap-1">
        <h2 id="titolo-qr" className="text-[17px] font-semibold tracking-tight">QR del check-in</h2>
        <p className="text-sm leading-relaxed text-testo-2">Lo vedi perché organizzi l&apos;evento. Stampalo e mettilo all&apos;ingresso: chi lo inquadra col telefono guadagna i metri, da un&apos;ora prima dell&apos;inizio a un&apos;ora dopo la fine.</p>
      </div>
      {/* L'SVG è generato qui da `qrcode` a partire dal link: nessun contenuto esterno */}
      <div className="w-44 self-center overflow-hidden rounded-xl bg-white p-2 [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="QR del check-in" dangerouslySetInnerHTML={{ __html: svg }} />
      <button type="button" onClick={scarica} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-fondo text-[15px] font-semibold transition-colors hover:bg-superficie-2">
        <Icona nome="scarica" size={20} /> Scarica il QR da stampare
      </button>
      <p className="text-xs text-testo-2">Non condividere il QR online: serve solo a chi è presente.</p>
    </section>
  );
}
