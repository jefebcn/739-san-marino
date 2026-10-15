-- 0035: 739 Pro per le attività (Fase 2, passo 2.2). Crea solo oggetti nuovi.
-- Il Pro si aggiunge al profilo base del titolare: link al menu, link per prenotare, fino a 3 offerte con scadenza,
-- e i numeri della scheda (visite e tocchi su telefono, indicazioni, sito, menu, prenota). Niente pagamenti in app:
-- lo attiva un amministratore dopo l'accordo con la società (3,99 € al mese o 39 € all'anno, scelta di Alex del 15/10/2026).
-- Il Pro non cambia l'ordine delle liste e non dà più visibilità: chi vive e visita San Marino vede le stesse schede.
-- I conteggi sono solo numeri per scheda e per giorno, di tutte le attività (così chi passa al Pro trova già lo storico):
-- nessun dato su chi apre o tocca.

create table if not exists public.attivita_pro (
  luogo_id uuid primary key references public.luoghi (id) on delete cascade,
  fino date not null,
  menu_url text check (menu_url ~ '^https://' and char_length(menu_url) <= 500),
  prenota_url text check (prenota_url ~ '^https://' and char_length(prenota_url) <= 500),
  attivato_da uuid references auth.users (id) on delete set null,
  aggiornato_il timestamptz not null default now()
);

create table if not exists public.attivita_offerte (
  id uuid primary key default gen_random_uuid(),
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  titolo text not null check (char_length(titolo) between 3 and 80),
  testo text check (char_length(testo) <= 300),
  dal date not null,
  al date not null,
  creato_il timestamptz not null default now(),
  check (al >= dal and al <= dal + 92)
);
create index if not exists attivita_offerte_luogo on public.attivita_offerte (luogo_id, al);

create table if not exists public.schede_conteggi (
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  giorno date not null,
  tipo text not null check (tipo in ('visita', 'telefono', 'indicazioni', 'sito', 'email', 'menu', 'prenota')),
  n integer not null default 0,
  primary key (luogo_id, giorno, tipo)
);

-- Nessuna regola: si usano solo con le funzioni qui sotto
alter table public.attivita_pro enable row level security;
alter table public.attivita_offerte enable row level security;
alter table public.schede_conteggi enable row level security;

create or replace function public.oggi_sm()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/San_Marino')::date
$$;

-- Il Pro vale se non è scaduto e la scheda ha un titolare approvato
create or replace function public.pro_attivo(p_luogo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.attivita_pro p where p.luogo_id = p_luogo and p.fino >= public.oggi_sm())
     and exists (select 1 from public.attivita_gestori g where g.luogo_id = p_luogo and g.stato = 'approvata')
$$;

create or replace function public.e_mio_luogo(p_luogo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.e_redattore()
      or exists (select 1 from public.attivita_gestori where luogo_id = p_luogo and utente_id = auth.uid() and stato = 'approvata')
$$;

-- Pubblico: menu, prenota e offerte in corso di una scheda Pro (null se non è Pro)
create or replace function public.dati_pro(p_luogo uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.pro_attivo(p_luogo) then jsonb_build_object(
    'menu_url', p.menu_url,
    'prenota_url', p.prenota_url,
    'offerte', coalesce((
      select jsonb_agg(jsonb_build_object('titolo', o.titolo, 'testo', o.testo, 'al', o.al) order by o.al)
      from public.attivita_offerte o
      where o.luogo_id = p_luogo and o.dal <= public.oggi_sm() and o.al >= public.oggi_sm()
    ), '[]'::jsonb)
  ) end
  from public.attivita_pro p where p.luogo_id = p_luogo
$$;

-- Pubblico: le offerte in corso di tutte le schede Pro, per le liste
create or replace function public.offerte_in_corso()
returns table (luogo_id uuid, titolo text)
language sql stable security definer set search_path = '' as $$
  select distinct on (o.luogo_id) o.luogo_id, o.titolo
  from public.attivita_offerte o
  where o.dal <= public.oggi_sm() and o.al >= public.oggi_sm() and public.pro_attivo(o.luogo_id)
  order by o.luogo_id, o.al
$$;

-- Pubblico: conta una visita o un tocco sulla scheda di un'attività (solo numeri per giorno)
create or replace function public.conta_scheda(p_luogo uuid, p_tipo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_tipo not in ('visita', 'telefono', 'indicazioni', 'sito', 'email', 'menu', 'prenota') then return; end if;
  if not exists (select 1 from public.luoghi where id = p_luogo and public.categoria_attivita(categoria)) then return; end if;
  insert into public.schede_conteggi (luogo_id, giorno, tipo, n) values (p_luogo, public.oggi_sm(), p_tipo, 1)
  on conflict (luogo_id, giorno, tipo) do update set n = public.schede_conteggi.n + 1;
end $$;

-- Titolare: lo stato del suo Pro, con tutte le offerte (anche future)
create or replace function public.mio_pro(p_luogo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Puoi vedere solo le schede delle tue attività.'; end if;
  return jsonb_build_object(
    'attivo', public.pro_attivo(p_luogo),
    'fino', (select fino from public.attivita_pro where luogo_id = p_luogo),
    'menu_url', (select menu_url from public.attivita_pro where luogo_id = p_luogo),
    'prenota_url', (select prenota_url from public.attivita_pro where luogo_id = p_luogo),
    'offerte', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'titolo', o.titolo, 'testo', o.testo, 'dal', o.dal, 'al', o.al) order by o.dal)
      from public.attivita_offerte o where o.luogo_id = p_luogo and o.al >= public.oggi_sm()
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.salva_pro(p_luogo uuid, p_menu text, p_prenota text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Puoi modificare solo le schede delle tue attività.'; end if;
  if not public.pro_attivo(p_luogo) then raise exception 'Menu e prenotazioni sono del piano Pro.'; end if;
  if nullif(p_menu, '') is not null and (p_menu !~ '^https://' or char_length(p_menu) > 500) then raise exception 'Il link del menu deve iniziare con https://'; end if;
  if nullif(p_prenota, '') is not null and (p_prenota !~ '^https://' or char_length(p_prenota) > 500) then raise exception 'Il link per prenotare deve iniziare con https://'; end if;
  update public.attivita_pro set menu_url = nullif(trim(p_menu), ''), prenota_url = nullif(trim(p_prenota), ''), aggiornato_il = now()
  where luogo_id = p_luogo;
end $$;

-- Nuova offerta o modifica (p_id): al massimo 3 in corso o in arrivo, ognuna lunga al massimo 3 mesi
create or replace function public.salva_offerta(p_luogo uuid, p_id uuid, p_titolo text, p_testo text, p_dal date, p_al date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Puoi modificare solo le schede delle tue attività.'; end if;
  if not public.pro_attivo(p_luogo) then raise exception 'Le offerte sono del piano Pro.'; end if;
  if char_length(trim(coalesce(p_titolo, ''))) < 3 then raise exception 'Scrivi un titolo per l''offerta.'; end if;
  if char_length(trim(coalesce(p_titolo, ''))) > 80 then raise exception 'Il titolo è troppo lungo: massimo 80 caratteri.'; end if;
  if char_length(coalesce(p_testo, '')) > 300 then raise exception 'Il testo è troppo lungo: massimo 300 caratteri.'; end if;
  if p_dal is null or p_al is null or p_al < p_dal then raise exception 'Controlla le date: la fine viene dopo l''inizio.'; end if;
  if p_al > p_dal + 92 then raise exception 'Un''offerta dura al massimo 3 mesi.'; end if;
  if p_al < public.oggi_sm() then raise exception 'L''offerta è già finita.'; end if;
  if p_id is null then
    if (select count(*) from public.attivita_offerte where luogo_id = p_luogo and al >= public.oggi_sm()) >= 3 then
      raise exception 'Puoi avere al massimo 3 offerte in corso o in arrivo.';
    end if;
    insert into public.attivita_offerte (luogo_id, titolo, testo, dal, al)
    values (p_luogo, trim(p_titolo), nullif(trim(coalesce(p_testo, '')), ''), p_dal, p_al) returning id into v_id;
  else
    update public.attivita_offerte set titolo = trim(p_titolo), testo = nullif(trim(coalesce(p_testo, '')), ''), dal = p_dal, al = p_al
    where id = p_id and luogo_id = p_luogo returning id into v_id;
    if v_id is null then raise exception 'Offerta non trovata.'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.togli_offerta(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_luogo uuid;
begin
  select luogo_id into v_luogo from public.attivita_offerte where id = p_id;
  if v_luogo is null or not public.e_mio_luogo(v_luogo) then raise exception 'Offerta non trovata.'; end if;
  delete from public.attivita_offerte where id = p_id;
end $$;

-- Titolare Pro (o redazione): i numeri della scheda negli ultimi giorni, per tipo
create or replace function public.numeri_scheda(p_luogo uuid, p_giorni integer default 30)
returns table (tipo text, totale integer, ultimi7 integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Puoi vedere solo le schede delle tue attività.'; end if;
  if not public.pro_attivo(p_luogo) and not public.e_redattore() then raise exception 'I numeri della scheda sono del piano Pro.'; end if;
  return query
    select c.tipo, sum(c.n)::int,
           coalesce(sum(c.n) filter (where c.giorno > public.oggi_sm() - 7), 0)::int
    from public.schede_conteggi c
    where c.luogo_id = p_luogo and c.giorno > public.oggi_sm() - least(greatest(coalesce(p_giorni, 30), 7), 365)
    group by c.tipo;
end $$;

-- Amministratori: attiva il Pro fino a una data, o lo toglie (p_fino null)
create or replace function public.imposta_pro(p_luogo uuid, p_fino date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_amministratore() then raise exception 'Il Pro lo attivano solo gli amministratori.'; end if;
  if p_fino is null then
    delete from public.attivita_pro where luogo_id = p_luogo;
    return;
  end if;
  if not exists (select 1 from public.attivita_gestori where luogo_id = p_luogo and stato = 'approvata') then
    raise exception 'Prima serve un titolare approvato per questa scheda.';
  end if;
  insert into public.attivita_pro (luogo_id, fino, attivato_da) values (p_luogo, p_fino, auth.uid())
  on conflict (luogo_id) do update set fino = excluded.fino, attivato_da = excluded.attivato_da, aggiornato_il = now();
end $$;

-- Redazione: quali schede hanno il Pro e fino a quando
create or replace function public.elenco_pro()
returns table (luogo_id uuid, fino date)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  return query select p.luogo_id, p.fino from public.attivita_pro p;
end $$;

revoke execute on function public.mio_pro(uuid) from public, anon;
revoke execute on function public.salva_pro(uuid, text, text) from public, anon;
revoke execute on function public.salva_offerta(uuid, uuid, text, text, date, date) from public, anon;
revoke execute on function public.togli_offerta(uuid) from public, anon;
revoke execute on function public.numeri_scheda(uuid, integer) from public, anon;
revoke execute on function public.imposta_pro(uuid, date) from public, anon;
revoke execute on function public.elenco_pro() from public, anon;
grant execute on function public.mio_pro(uuid) to authenticated;
grant execute on function public.salva_pro(uuid, text, text) to authenticated;
grant execute on function public.salva_offerta(uuid, uuid, text, text, date, date) to authenticated;
grant execute on function public.togli_offerta(uuid) to authenticated;
grant execute on function public.numeri_scheda(uuid, integer) to authenticated;
grant execute on function public.imposta_pro(uuid, date) to authenticated;
grant execute on function public.elenco_pro() to authenticated;
grant execute on function public.dati_pro(uuid) to anon, authenticated;
grant execute on function public.offerte_in_corso() to anon, authenticated;
grant execute on function public.conta_scheda(uuid, text) to anon, authenticated;
