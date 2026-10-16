-- 0043: Offerte di lavoro (area Lavorare, richiesta di Alex del 16/10/2026).
-- Le pubblica chi gestisce la scheda di un'attività in 739 (titolare approvato dalla redazione, migrazione 0034):
-- così ogni annuncio ha dietro un'attività vera e verificata. Vanno online subito; la redazione le vede tutte
-- e può ritirarle. Ogni annuncio ha una scadenza (al massimo 60 giorni) e sparisce da solo dopo quel giorno.
-- Solo oggetti nuovi: una tabella e le sue funzioni. Nessun dato esistente cambia.

create table if not exists public.offerte_lavoro (
  id uuid primary key default gen_random_uuid(),
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  autore uuid references auth.users (id) on delete set null,
  titolo text not null check (char_length(titolo) between 3 and 100),
  contratto text not null check (contratto in ('indeterminato', 'determinato', 'stagionale', 'apprendistato', 'stage', 'collaborazione')),
  orario text not null check (orario in ('tempo pieno', 'part-time')),
  descrizione text not null check (char_length(descrizione) between 30 and 3000),
  sede text check (char_length(sede) <= 200), -- dove si lavora, se non è l'indirizzo della scheda
  email text check (char_length(email) <= 160),
  link text check (link ~ '^https://' and char_length(link) <= 500),
  telefono text check (char_length(telefono) <= 30),
  scadenza date not null,
  stato text not null default 'pubblicata' check (stato in ('pubblicata', 'chiusa', 'ritirata')),
  nota_redazione text check (char_length(nota_redazione) <= 500),
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  check (email is not null or link is not null or telefono is not null)
);
create index if not exists offerte_lavoro_in_corso on public.offerte_lavoro (stato, scadenza);
create index if not exists offerte_lavoro_per_luogo on public.offerte_lavoro (luogo_id);
-- Nessuna regola: si usa solo con le funzioni qui sotto
alter table public.offerte_lavoro enable row level security;

-- Pubblico: le offerte in corso (pubblicate e non scadute, ora di San Marino), dalla più recente
create or replace function public.offerte_lavoro_aperte(p_limite integer default 200)
returns table (id uuid, luogo_id uuid, attivita text, categoria text, sottocategoria text, castello_id smallint, indirizzo text,
               titolo text, contratto text, orario text, descrizione text, sede text, email text, link text, telefono text,
               scadenza date, creato_il timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.id, o.luogo_id, l.nome, l.categoria, l.sottocategoria, l.castello_id, l.indirizzo,
         o.titolo, o.contratto, o.orario, o.descrizione, o.sede, o.email, o.link, o.telefono, o.scadenza, o.creato_il
  from public.offerte_lavoro o
  join public.luoghi l on l.id = o.luogo_id
  where o.stato = 'pubblicata' and o.scadenza >= public.oggi_sm()
  order by o.creato_il desc
  limit least(greatest(coalesce(p_limite, 200), 1), 500)
$$;

-- Pubblico: una offerta (anche chiusa o scaduta, per non rompere i link condivisi; mai quelle ritirate)
create or replace function public.offerta_lavoro(p_id uuid)
returns table (id uuid, luogo_id uuid, attivita text, categoria text, sottocategoria text, castello_id smallint, indirizzo text,
               titolo text, contratto text, orario text, descrizione text, sede text, email text, link text, telefono text,
               scadenza date, creato_il timestamptz, aperta boolean)
language sql stable security definer set search_path = '' as $$
  select o.id, o.luogo_id, l.nome, l.categoria, l.sottocategoria, l.castello_id, l.indirizzo,
         o.titolo, o.contratto, o.orario, o.descrizione, o.sede, o.email, o.link, o.telefono, o.scadenza, o.creato_il,
         o.stato = 'pubblicata' and o.scadenza >= public.oggi_sm()
  from public.offerte_lavoro o
  join public.luoghi l on l.id = o.luogo_id
  where o.id = p_id and o.stato <> 'ritirata'
$$;

-- Il titolare: le offerte della sua scheda (tutte, anche chiuse e ritirate, con la nota della redazione)
create or replace function public.mie_offerte_lavoro(p_luogo uuid)
returns table (id uuid, titolo text, contratto text, orario text, descrizione text, sede text, email text, link text, telefono text,
               scadenza date, stato text, nota_redazione text, creato_il timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  return query
    select o.id, o.titolo, o.contratto, o.orario, o.descrizione, o.sede, o.email, o.link, o.telefono, o.scadenza, o.stato, o.nota_redazione, o.creato_il
    from public.offerte_lavoro o
    where o.luogo_id = p_luogo
    order by (o.stato = 'pubblicata' and o.scadenza >= public.oggi_sm()) desc, o.creato_il desc
    limit 50;
end $$;

-- Il titolare pubblica (p_id null) o modifica una sua offerta
create or replace function public.salva_offerta_lavoro(p_luogo uuid, p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := coalesce(p, '{}'::jsonb);
  v_id uuid;
  v_titolo text := trim(coalesce(d->>'titolo', ''));
  v_descrizione text := trim(coalesce(d->>'descrizione', ''));
  v_email text := nullif(trim(coalesce(d->>'email', '')), '');
  v_link text := nullif(trim(coalesce(d->>'link', '')), '');
  v_telefono text := nullif(trim(coalesce(d->>'telefono', '')), '');
  v_scadenza date;
begin
  if auth.uid() is null then raise exception 'Per pubblicare un''offerta entra con il tuo SMR ID.'; end if;
  if not public.e_mio_luogo(p_luogo) then raise exception 'Puoi pubblicare offerte solo per le schede che gestisci.'; end if;
  if char_length(v_titolo) < 3 or char_length(v_titolo) > 100 then raise exception 'Scrivi chi cercate, per esempio «Cameriere di sala».'; end if;
  if coalesce(d->>'contratto', '') not in ('indeterminato', 'determinato', 'stagionale', 'apprendistato', 'stage', 'collaborazione') then
    raise exception 'Scegli il tipo di contratto.';
  end if;
  if coalesce(d->>'orario', '') not in ('tempo pieno', 'part-time') then raise exception 'Scegli tempo pieno o part-time.'; end if;
  if char_length(v_descrizione) < 30 then raise exception 'Descrivi il lavoro in qualche riga (almeno 30 caratteri).'; end if;
  if char_length(v_descrizione) > 3000 then raise exception 'La descrizione è troppo lunga (massimo 3000 caratteri).'; end if;
  if char_length(coalesce(d->>'sede', '')) > 200 then raise exception 'Il luogo di lavoro è troppo lungo.'; end if;
  if v_email is null and v_link is null and v_telefono is null then
    raise exception 'Scrivi almeno un modo per candidarsi: email, link o telefono.';
  end if;
  if v_email is not null and (v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 160) then raise exception 'L''email per candidarsi non sembra valida.'; end if;
  if v_link is not null and (v_link !~ '^https://' or char_length(v_link) > 500) then raise exception 'Il link per candidarsi deve iniziare con https://'; end if;
  if v_telefono is not null and v_telefono !~ '^[+0-9 ./()-]{6,30}$' then raise exception 'Il telefono per candidarsi non sembra un numero.'; end if;
  begin
    v_scadenza := (d->>'scadenza')::date;
  exception when others then
    raise exception 'Scegli fino a quando resta online.';
  end;
  if v_scadenza is null or v_scadenza < public.oggi_sm() or v_scadenza > public.oggi_sm() + 60 then
    raise exception 'L''offerta resta online al massimo 60 giorni: scegli una data entro il %.', to_char(public.oggi_sm() + 60, 'DD/MM/YYYY');
  end if;

  if p_id is null then
    if (select count(*) from public.offerte_lavoro where luogo_id = p_luogo and stato = 'pubblicata' and scadenza >= public.oggi_sm()) >= 5 then
      raise exception 'Hai già 5 offerte aperte per questa attività: chiudine una prima di pubblicarne un''altra.';
    end if;
    if (select count(*) from public.offerte_lavoro where autore = auth.uid() and creato_il > now() - interval '1 day') >= 10 then
      raise exception 'Hai pubblicato troppe offerte oggi: riprova domani.';
    end if;
    insert into public.offerte_lavoro (luogo_id, autore, titolo, contratto, orario, descrizione, sede, email, link, telefono, scadenza)
    values (p_luogo, auth.uid(), v_titolo, d->>'contratto', d->>'orario', v_descrizione, nullif(trim(coalesce(d->>'sede', '')), ''),
            v_email, v_link, v_telefono, v_scadenza)
    returning id into v_id;
  else
    update public.offerte_lavoro set titolo = v_titolo, contratto = d->>'contratto', orario = d->>'orario', descrizione = v_descrizione,
           sede = nullif(trim(coalesce(d->>'sede', '')), ''), email = v_email, link = v_link, telefono = v_telefono,
           scadenza = v_scadenza, aggiornato_il = now()
    where id = p_id and luogo_id = p_luogo and stato <> 'ritirata'
    returning id into v_id;
    if v_id is null then raise exception 'Questa offerta non si può più modificare.'; end if;
  end if;
  return v_id;
end $$;

-- Il titolare chiude un'offerta (posto trovato) o la riapre se non è scaduta
create or replace function public.chiudi_offerta_lavoro(p_id uuid, p_chiusa boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_luogo uuid;
begin
  select luogo_id into v_luogo from public.offerte_lavoro where id = p_id and stato <> 'ritirata';
  if v_luogo is null then raise exception 'Offerta non trovata.'; end if;
  if not public.e_mio_luogo(v_luogo) then raise exception 'Questa offerta non è tua.'; end if;
  update public.offerte_lavoro set stato = case when p_chiusa then 'chiusa' else 'pubblicata' end, aggiornato_il = now() where id = p_id;
end $$;

-- Redazione: tutte le offerte per stato, con chi le ha pubblicate
create or replace function public.offerte_lavoro_redazione(p_stato text default 'pubblicata')
returns table (id uuid, luogo_id uuid, attivita text, titolo text, contratto text, orario text, descrizione text,
               email text, link text, telefono text, scadenza date, stato text, nota_redazione text, autore_email text, creato_il timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  return query
    select o.id, o.luogo_id, l.nome, o.titolo, o.contratto, o.orario, o.descrizione, o.email, o.link, o.telefono, o.scadenza,
           o.stato, o.nota_redazione, u.email::text, o.creato_il
    from public.offerte_lavoro o
    join public.luoghi l on l.id = o.luogo_id
    left join auth.users u on u.id = o.autore
    where o.stato = coalesce(p_stato, 'pubblicata')
    order by o.creato_il desc
    limit 200;
end $$;

-- Redazione: ritira un'offerta (con la nota per il titolare) o la rimette online
create or replace function public.ritira_offerta_lavoro(p_id uuid, p_nota text default null, p_ritira boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  update public.offerte_lavoro
  set stato = case when p_ritira then 'ritirata' else 'pubblicata' end,
      nota_redazione = case when p_ritira then nullif(trim(coalesce(p_nota, '')), '') else nota_redazione end,
      aggiornato_il = now()
  where id = p_id;
  if not found then raise exception 'Offerta non trovata.'; end if;
end $$;

revoke execute on function public.mie_offerte_lavoro(uuid) from public, anon;
revoke execute on function public.salva_offerta_lavoro(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.chiudi_offerta_lavoro(uuid, boolean) from public, anon;
revoke execute on function public.offerte_lavoro_redazione(text) from public, anon;
revoke execute on function public.ritira_offerta_lavoro(uuid, text, boolean) from public, anon;
grant execute on function public.mie_offerte_lavoro(uuid) to authenticated;
grant execute on function public.salva_offerta_lavoro(uuid, uuid, jsonb) to authenticated;
grant execute on function public.chiudi_offerta_lavoro(uuid, boolean) to authenticated;
grant execute on function public.offerte_lavoro_redazione(text) to authenticated;
grant execute on function public.ritira_offerta_lavoro(uuid, text, boolean) to authenticated;
grant execute on function public.offerte_lavoro_aperte(integer) to anon, authenticated;
grant execute on function public.offerta_lavoro(uuid) to anon, authenticated;
