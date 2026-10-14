import ReactMarkdown, { type Components } from "react-markdown";

// Il corpo dei contenuti, scritto in markdown dalla redazione. Niente HTML grezzo: react-markdown lo ignora.
const STILI: Components = {
  h2: ({ children }) => <h2 className="mt-4 text-[21px] font-semibold leading-tight tracking-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2 text-[17px] font-semibold leading-snug">{children}</h3>,
  p: ({ children }) => <p className="text-[16px] leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[16px] leading-relaxed">{children}</ul>,
  ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[16px] leading-relaxed">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-accento pl-4 text-testo-2">{children}</blockquote>,
  a: ({ href, children }) => {
    const esterno = href?.startsWith("http");
    return (
      <a href={href} className="text-accento underline underline-offset-2" {...(esterno ? { target: "_blank", rel: "noopener" } : {})}>
        {children}
      </a>
    );
  },
  hr: () => <hr className="border-linea" />,
  // Le immagini nel testo non si usano: la foto del contenuto ha il suo posto, con il credito
  img: () => null,
};

export default function Testo({ children }: { children: string }) {
  return (
    <div className="flex max-w-[65ch] flex-col gap-4">
      <ReactMarkdown components={STILI}>{children}</ReactMarkdown>
    </div>
  );
}
