import Link from "next/link";
import { giornoNumero, meseBreve, ora, type Evento } from "@/lib/data";

export function DataBadge({ iso }: { iso: string }) {
  return (
    <div className="data" aria-hidden="true">
      <b>{giornoNumero(iso)}</b>
      <span>{meseBreve(iso)}</span>
    </div>
  );
}

export default function EventoRiga({ e }: { e: Evento }) {
  return (
    <Link prefetch={false} href={`/eventi/${e.id}`} className="evento premibile">
      <DataBadge iso={e.inizio} />
      <div style={{ minWidth: 0 }}>
        <h3>{e.titolo}</h3>
        <div className="meta">
          {ora(e.inizio)}
          {e.luogo ? `, ${e.luogo.nome}` : e.castello ? `, ${e.castello.nome}` : ""}
        </div>
      </div>
      <span className="metri">+{e.metri} m</span>
    </Link>
  );
}
