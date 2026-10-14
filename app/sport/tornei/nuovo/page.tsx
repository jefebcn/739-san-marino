import TestaPagina from "@/components/Indietro";
import Riservato from "@/modules/redazione/components/Riservato";
import NuovoTorneo from "@/modules/sport/components/NuovoTorneo";
import { getLuoghi } from "@/lib/data";
import { getSport } from "@/modules/sport/dati";

export const revalidate = 300;

export const metadata = { title: "Nuovo torneo · 739 San Marino", robots: { index: false, follow: false } };

export default async function PaginaNuovoTorneo() {
  const [sport, luoghi] = await Promise.all([getSport(), getLuoghi()]);
  return (
    <>
      <TestaPagina href="/sport/tornei" verso="Tornei" titolo="Nuovo torneo" />
      <Riservato ruolo="redattore">
        <NuovoTorneo
          sport={sport.map((s) => ({ id: s.id, nome: s.nome, giocatori: s.giocatori_per_squadra }))}
          impianti={luoghi.filter((l) => l.categoria === "impianto").map((l) => ({ id: l.id, nome: l.nome }))}
        />
      </Riservato>
    </>
  );
}
