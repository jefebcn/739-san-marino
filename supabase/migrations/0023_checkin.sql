-- 0023: check-in con QR e metri veri (passo 1.2). Crea solo oggetti nuovi.
--
-- Ogni evento ha un codice segreto (eventi_codici, mai leggibile dal pubblico). Il QR stampato all'evento apre
-- /eventi/<id>/checkin?c=<codice>; fai_checkin() controlla codice e orario e registra il check-in
-- (uno per persona ed evento, indice della 0022). Il trigger dopo_checkin (0001) aggiunge i metri.
-- La regola che permetteva check-in diretti l'ha tolta la 0022.

create table if not exists public.eventi_codici (
  evento_id uuid primary key references public.eventi (id) on delete cascade,
  codice text not null unique,
  creato_il timestamptz not null default now()
);
-- Nessuna regola: si legge solo con codice_checkin() (redazione e organizzatore dell'evento)
alter table public.eventi_codici enable row level security;

-- Il codice del QR: lo vedono la redazione e chi ha pubblicato l'evento; si crea la prima volta che serve
create or replace function public.codice_checkin(p_evento uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_codice text;
  v_autore uuid;
begin
  select autore into v_autore from public.eventi where id = p_evento;
  if not found then raise exception 'Evento non trovato.'; end if;
  if not (public.e_redattore() or (public.e_organizzatore() and v_autore = auth.uid())) then
    raise exception 'Il QR del check-in lo vedono solo la redazione e chi organizza l''evento.';
  end if;
  select codice into v_codice from public.eventi_codici where evento_id = p_evento;
  if v_codice is null then
    -- 12 caratteri casuali: impossibili da indovinare
    v_codice := substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 12);
    insert into public.eventi_codici (evento_id, codice) values (p_evento, v_codice)
    on conflict (evento_id) do nothing;
    select codice into v_codice from public.eventi_codici where evento_id = p_evento;
  end if;
  return v_codice;
end $$;
revoke execute on function public.codice_checkin(uuid) from public, anon;
grant execute on function public.codice_checkin(uuid) to authenticated;

-- Il check-in: con SMR ID, col codice giusto, da un'ora prima dell'inizio a un'ora dopo la fine
-- (senza fine: due ore dopo l'inizio, più l'ora di margine)
create or replace function public.fai_checkin(p_evento uuid, p_codice text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  e public.eventi;
  v_nuovo boolean := false;
  v_totale bigint;
begin
  if io is null then raise exception 'Per il check-in entra con il tuo SMR ID.'; end if;
  select * into e from public.eventi where id = p_evento and pubblicato;
  if e.id is null then raise exception 'Evento non trovato.'; end if;
  if not exists (select 1 from public.eventi_codici where evento_id = p_evento and codice = trim(coalesce(p_codice, ''))) then
    raise exception 'Questo QR non è valido per l''evento: inquadra quello che trovi sul posto.';
  end if;
  if now() < e.inizio - interval '1 hour' then
    raise exception 'Il check-in apre un''ora prima dell''inizio.';
  end if;
  if now() > coalesce(e.fine, e.inizio + interval '2 hours') + interval '1 hour' then
    raise exception 'Il check-in per questo evento è chiuso.';
  end if;
  insert into public.checkin (utente_id, evento_id) values (io, p_evento)
  on conflict (utente_id, evento_id) do nothing;
  v_nuovo := found;
  select coalesce(sum(metri), 0) into v_totale from public.metri_movimenti where utente_id = io;
  return jsonb_build_object('nuovo', v_nuovo, 'metri', e.metri, 'totale', v_totale, 'titolo', e.titolo);
end $$;
revoke execute on function public.fai_checkin(uuid, text) from public, anon;
grant execute on function public.fai_checkin(uuid, text) to authenticated;

-- La quota personale: metri totali e ultimi movimenti, con il titolo dell'evento quando c'è
create or replace function public.miei_metri()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'totale', coalesce((select sum(metri) from public.metri_movimenti where utente_id = auth.uid()), 0),
    'movimenti', coalesce((
      select jsonb_agg(m order by m.creato_il desc)
      from (
        select mm.metri, mm.motivo, mm.creato_il, ev.id as evento_id, ev.titolo
        from public.metri_movimenti mm
        left join public.eventi ev on ev.id = mm.riferimento
        where mm.utente_id = auth.uid()
        order by mm.creato_il desc
        limit 20
      ) m
    ), '[]'::jsonb)
  )
  where auth.uid() is not null;
$$;
revoke execute on function public.miei_metri() from public, anon;
grant execute on function public.miei_metri() to authenticated;
