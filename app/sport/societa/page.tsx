import PaginaSezione from "@/components/aree/PaginaSezione";

export const revalidate = 300;

export const metadata = { title: "Società sportive · 739 San Marino" };

export default function Societa() {
  return <PaginaSezione area="sport" sezione="societa" vuoto="Le società sportive arrivano da chi le gestisce: se ne fai parte, aggiungi la scheda." />;
}
