import Tano from "@/components/Tano";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function NonTrovato() {
  return (
    <section className="flex flex-col items-center gap-4 pt-6 text-center">
      <Tano posa="tranquillo" priority className="h-56 w-auto lg:h-64" />
      <h1 className="titolo [text-wrap:balance]">Qui non c&apos;è niente, torniamo a Oggi</h1>
      <p className="sottotitolo">La pagina che cerchi non esiste o è stata spostata.</p>
      <PrimaryButton href="/" pieno className="max-w-sm">Torna a Oggi</PrimaryButton>
    </section>
  );
}
