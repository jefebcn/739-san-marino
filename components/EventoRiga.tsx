import Link from "next/link";
import { giornoNumero, meseBreve, ora, type Evento } from "@/lib/data";
import { meseBreveEn, type Lingua } from "@/lib/lingua";

export function DataBadge({ iso, lingua = "it" }: { iso: string; lingua?: Lingua }) {
  return (
    <div className="data" aria-hidden="true">
      <b>{giornoNumero(iso)}</b>
      <span>{lingua === "en" ? meseBreveEn(iso) : meseBreve(iso)}</span>
    </div>
  );
}

export default function EventoRiga({ e, lingua = "it" }: { e: Evento; lingua?: Lingua }) {
  const en = lingua === "en";
  return (
    <Link prefetch={false} href={en ? `/en/events/${e.id}` : `/eventi/${e.id}`} className="evento premibile">
      <DataBadge iso={e.inizio} lingua={lingua} />
      <div style={{ minWidth: 0 }}>
        <h3>{e.titolo}</h3>
        <div className="meta">
          {ora(e.inizio)}
          {e.luogo ? `, ${e.luogo.nome}` : e.castello ? `, ${e.castello.nome}` : ""}
        </div>
      </div>
      {/* I metri sono il gioco dei residenti: in inglese non compaiono */}
      {en ? null : <span className="metri">+{e.metri} m</span>}
    </Link>
  );
}
