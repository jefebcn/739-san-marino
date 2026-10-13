const PATH = {
  home: "M4 11l8-7 8 7v9h-5v-6h-6v6H4z",
  mappa: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  eventi: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  castelli: "M3 20h18M5 20V10l3-2 3 2v10M13 20V6l3-3 3 3v14",
  utili: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v5M12 16.5v.5",
  orologio: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
  pin: "M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  freccia: "M15 18l-6-6 6-6",
  calendario: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15h6",
  indicazioni: "M12 3l9 9-9 9-9-9zM9 13v-2h5l-2-2M14 11l-2 2",
  telefono: "M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z",
  persona: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  scudo: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
} as const;

export type NomeIcona = keyof typeof PATH;

export function Icona({ nome, size = 24 }: { nome: NomeIcona; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATH[nome]} />
    </svg>
  );
}
