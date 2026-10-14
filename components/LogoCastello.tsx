// Loghi dei castelli forniti da Alex (ottobre 2026, non sono gli stemmi ufficiali): file in public/castelli,
// generati da docs/castelli con scripts/castelli.mjs. Il fondo nero è reso trasparente: nel tema chiaro stanno su una tessera grigio scuro (--tessera).
const CON_LOGO = new Set(["acquaviva", "borgo-maggiore", "chiesanuova", "citta", "domagnano", "faetano", "fiorentino", "montegiardino", "serravalle"]);

export const haLogo = (slug: string) => CON_LOGO.has(slug);

type Castello = { slug: string; nome: string; colore: string };

/** Il logo (intero, con il nome) in un quadrato nero; se il castello non ha logo, il suo punto colore. */
export function EmblemaCastello({ c, className = "size-9" }: { c: Castello; className?: string }) {
  if (!CON_LOGO.has(c.slug)) {
    return <span aria-hidden="true" className={`grid shrink-0 place-items-center ${className}`}><span className="size-2.5 rounded-full" style={{ background: c.colore }} /></span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/castelli/${c.slug}-emblema.webp`} alt="" aria-hidden="true" width={192} height={192} loading="lazy" className={`shrink-0 rounded-xl bg-[var(--tessera)] object-contain ${className}`} />
  );
}

/** Il logo intero con il nome, per la pagina del castello. */
export function LogoCastello({ c, className = "" }: { c: Castello; className?: string }) {
  if (!CON_LOGO.has(c.slug)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/castelli/${c.slug}.webp`} alt={`Logo di ${c.nome}`} width={640} height={480} className={`aspect-[4/3] rounded-2xl object-contain ${className}`} />
  );
}
