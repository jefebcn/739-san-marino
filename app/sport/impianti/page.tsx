import PaginaSezione from "@/components/aree/PaginaSezione";

export const revalidate = 300;

export const metadata = { title: "Impianti sportivi · 739 San Marino" };

export default function Impianti() {
  return <PaginaSezione area="sport" sezione="impianti" />;
}
