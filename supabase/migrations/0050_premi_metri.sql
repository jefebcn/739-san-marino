-- Premi dei metri (19/10/2026, scelta di Alex; nel modello economico di docs/piano.md). Solo oggetti nuovi, niente cancellazioni.
--
-- Chi gestisce una scheda (e_mio_luogo) offre un premio a chi ha raggiunto un livello di metri:
-- Valle (0), Mura (200), Torri (450), Vetta (739). Una volta sola, una volta a settimana o una volta al mese
-- per persona, con un numero massimo se vuole. Il cliente mostra il QR del suo SMR ID (739ID:<tessera>),
-- il titolare lo legge dalla sua pagina: controlla_premio() dice se va bene (nome, livello) senza scrivere niente,
-- riscatta_premio() registra la consegna e manda un avviso personale (0049) al cliente.
-- Per ora gratis, come prova (il prezzo lo decide Alex, come per le prenotazioni).

create table if not exists public.premi (
  id uuid primary key default gen_random_uuid(),
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  titolo text not null check (char_length(titolo) between 3 and 60),        -- es. «Caffè offerto»
  descrizione text check (char_length(descrizione) <= 240),                 -- es. «Al banco, con qualsiasi consumazione»
  metri_min integer not null default 200 check (metri_min in (0, 200, 450, 739)),
  ogni text not null default 'mese' check (ogni in ('volta', 'settimana', 'mese')),
  quanti integer check (quanti between 1 and 10000),                        -- in tutto; vuoto = senza limite
  dal date not null default (now() at time zone 'Europe/San_Marino')::date,
  al date,
  attivo boolean not null default true,
  creato_da uuid references auth.users (id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  check (al is null or (al >= dal and al <= dal + 366))
);
create index if not exists premi_per_luogo on public.premi (luogo_id);

create table if not exists public.premi_ritiri (
  id uuid primary key default gen_random_uuid(),
  premio_id uuid not null references public.premi (id) on delete cascade,
  utente_id uuid not null references auth.users (id) on delete cascade,
  ritirato_il timestamptz not null default now(),
  registrato_da uuid references auth.users (id) on delete set null
);
create index if not exists premi_ritiri_per_premio on public.premi_ritiri (premio_id, utente_id, ritirato_il);
create index if not exists premi_ritiri_per_utente on public.premi_ritiri (utente_id, ritirato_il);

-- Nessuna regola sulle due tabelle: si usano solo con le funzioni qui sotto
alter table public.premi enable row level security;
alter table public.premi_ritiri enable row level security;

-- I metri di una persona (uso interno)
create or replace function public.metri_di(p_utente uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(metri), 0)::integer from public.metri_movimenti where utente_id = p_utente;
$$;

-- Da quando conta il limite del premio: per «volta» da sempre, se no dall'inizio della settimana o del mese di San Marino
create or replace function public.premio_periodo(p_ogni text)
returns timestamptz language sql stable set search_path = '' as $$
  select case p_ogni
    when 'settimana' then (date_trunc('week', now() at time zone 'Europe/San_Marino') at time zone 'Europe/San_Marino')
    when 'mese' then (date_trunc('month', now() at time zone 'Europe/San_Marino') at time zone 'Europe/San_Marino')
    else '-infinity'::timestamptz end;
$$;

-- Un premio si può dare adesso? (attivo, nelle date, non esaurito)
create or replace function public.premio_aperto(p public.premi)
returns boolean language sql stable security definer set search_path = '' as $$
  select p.attivo
     and p.dal <= (now() at time zone 'Europe/San_Marino')::date
     and (p.al is null or p.al >= (now() at time zone 'Europe/San_Marino')::date)
     and (p.quanti is null or (select count(*) from public.premi_ritiri r where r.premio_id = p.id) < p.quanti);
$$;

-- Pubblica: i premi aperti, di un luogo o di tutti; con l'SMR ID anche se li puoi ritirare adesso
create or replace function public.premi_attivi(p_luogo uuid default null)
returns table (id uuid, luogo_id uuid, luogo text, categoria text, castello_id smallint, titolo text, descrizione text,
               metri_min integer, ogni text, al date, rimasti integer, posso boolean)
language sql stable security definer set search_path = '' as $$
  with io as (select auth.uid() as uid, case when auth.uid() is null then null else public.metri_di(auth.uid()) end as metri)
  select p.id, p.luogo_id, l.nome, l.categoria, l.castello_id, p.titolo, p.descrizione, p.metri_min, p.ogni, p.al,
         case when p.quanti is null then null else (p.quanti - (select count(*) from public.premi_ritiri r where r.premio_id = p.id))::integer end,
         case when io.uid is null then null
              else io.metri >= p.metri_min and not exists (
                select 1 from public.premi_ritiri r where r.premio_id = p.id and r.utente_id = io.uid and r.ritirato_il >= public.premio_periodo(p.ogni))
         end
  from public.premi p
  join public.luoghi l on l.id = p.luogo_id
  cross join io
  where public.premio_aperto(p) and (p_luogo is null or p.luogo_id = p_luogo)
  order by p.metri_min, l.nome, p.titolo
  limit 300;
$$;

-- Per chi gestisce la scheda: tutti i suoi premi, con quanti ritirati in tutto e negli ultimi 30 giorni
create or replace function public.premi_luogo(p_luogo uuid)
returns table (id uuid, titolo text, descrizione text, metri_min integer, ogni text, quanti integer, dal date, al date, attivo boolean,
               aperto boolean, ritirati integer, ritirati_30 integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  return query
    select p.id, p.titolo, p.descrizione, p.metri_min, p.ogni, p.quanti, p.dal, p.al, p.attivo, public.premio_aperto(p),
           (select count(*) from public.premi_ritiri r where r.premio_id = p.id)::integer,
           (select count(*) from public.premi_ritiri r where r.premio_id = p.id and r.ritirato_il > now() - interval '30 days')::integer
    from public.premi p where p.luogo_id = p_luogo
    order by p.attivo desc, p.creato_il desc;
end $$;

-- Crea o modifica un premio (al massimo 5 attivi per scheda)
create or replace function public.salva_premio(p_luogo uuid, p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_titolo text := trim(coalesce(p->>'titolo', ''));
  v_descr text := nullif(trim(coalesce(p->>'descrizione', '')), '');
  v_metri integer := coalesce((p->>'metri_min')::integer, 200);
  v_ogni text := coalesce(p->>'ogni', 'mese');
  v_quanti integer := nullif(p->>'quanti', '')::integer;
  v_dal date := coalesce(nullif(p->>'dal', '')::date, (now() at time zone 'Europe/San_Marino')::date);
  v_al date := nullif(p->>'al', '')::date;
  v_attivo boolean := coalesce((p->>'attivo')::boolean, true);
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  if char_length(v_titolo) not between 3 and 60 then raise exception 'Il premio ha bisogno di un nome da 3 a 60 caratteri.'; end if;
  if char_length(coalesce(v_descr, '')) > 240 then raise exception 'La descrizione è troppo lunga (al massimo 240 caratteri).'; end if;
  if v_metri not in (0, 200, 450, 739) then raise exception 'Scegli un livello: Valle, Mura, Torri o Vetta.'; end if;
  if v_ogni not in ('volta', 'settimana', 'mese') then raise exception 'Scegli ogni quanto si può ritirare.'; end if;
  if v_quanti is not null and v_quanti not between 1 and 10000 then raise exception 'Il numero di premi va da 1 a 10.000.'; end if;
  if v_al is not null and (v_al < v_dal or v_al > v_dal + 366) then raise exception 'La fine deve venire dopo l''inizio, entro un anno.'; end if;
  if v_attivo and (select count(*) from public.premi x where x.luogo_id = p_luogo and x.attivo and x.id is distinct from p_id
                   and (x.al is null or x.al >= (now() at time zone 'Europe/San_Marino')::date)) >= 5 then
    raise exception 'Hai già 5 premi attivi: spegnine uno prima di accenderne un altro.';
  end if;
  if p_id is null then
    insert into public.premi (luogo_id, titolo, descrizione, metri_min, ogni, quanti, dal, al, attivo, creato_da)
    values (p_luogo, v_titolo, v_descr, v_metri, v_ogni, v_quanti, v_dal, v_al, v_attivo, auth.uid())
    returning id into v_id;
  else
    update public.premi set titolo = v_titolo, descrizione = v_descr, metri_min = v_metri, ogni = v_ogni, quanti = v_quanti,
           dal = v_dal, al = v_al, attivo = v_attivo, aggiornato_il = now()
    where id = p_id and luogo_id = p_luogo
    returning id into v_id;
    if v_id is null then raise exception 'Premio non trovato.'; end if;
  end if;
  return v_id;
end $$;

-- Il titolare legge il QR (o scrive il numero della tessera): si può dare il premio? Non scrive niente.
-- Restituisce solo il nome (la prima parola), il livello e l'esito: ok, pochi_metri, gia_ritirato, chiuso, tessera.
create or replace function public.controlla_premio(p_premio uuid, p_tessera text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  p public.premi;
  v_utente uuid;
  v_nome text;
  v_metri integer;
  v_ultimo timestamptz;
  v_tessera text := upper(trim(regexp_replace(coalesce(p_tessera, ''), '^739ID:', '', 'i')));
begin
  select * into p from public.premi where id = p_premio;
  if p.id is null then raise exception 'Premio non trovato.'; end if;
  if not public.e_mio_luogo(p.luogo_id) then raise exception 'Questo premio non è della tua scheda.'; end if;
  if v_tessera !~ '^739-[A-Z0-9]{4}-[A-Z0-9]{2}$' then return jsonb_build_object('esito', 'tessera'); end if;
  select pr.id, split_part(coalesce(pr.nome, ''), ' ', 1) into v_utente, v_nome from public.profili pr where pr.tessera = v_tessera;
  if v_utente is null then return jsonb_build_object('esito', 'tessera'); end if;
  v_metri := public.metri_di(v_utente);
  select max(r.ritirato_il) into v_ultimo from public.premi_ritiri r where r.premio_id = p.id and r.utente_id = v_utente;
  return jsonb_build_object(
    'esito', case when not public.premio_aperto(p) then 'chiuso'
                  when v_metri < p.metri_min then 'pochi_metri'
                  when v_ultimo is not null and v_ultimo >= public.premio_periodo(p.ogni) then 'gia_ritirato'
                  else 'ok' end,
    'nome', nullif(v_nome, ''), 'metri', v_metri, 'ultimo', v_ultimo);
end $$;

-- Il titolare consegna il premio: rifà i controlli e lo registra, poi avvisa il cliente
create or replace function public.riscatta_premio(p_premio uuid, p_tessera text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p public.premi;
  v_utente uuid;
  v_esito jsonb;
  v_ritiro uuid;
  v_luogo text;
  v_tessera text := upper(trim(regexp_replace(coalesce(p_tessera, ''), '^739ID:', '', 'i')));
begin
  -- Il premio bloccato finché non si è finito: due consegne insieme non superano il limite
  select * into p from public.premi where id = p_premio for update;
  v_esito := public.controlla_premio(p_premio, p_tessera);
  if v_esito->>'esito' <> 'ok' then return v_esito; end if;
  if (select count(*) from public.premi_ritiri r where r.registrato_da = auth.uid() and r.ritirato_il > now() - interval '1 day') >= 500 then
    raise exception 'Hai registrato troppi premi oggi: scrivici se è giusto così.';
  end if;
  select pr.id into v_utente from public.profili pr where pr.tessera = v_tessera;
  insert into public.premi_ritiri (premio_id, utente_id, registrato_da) values (p.id, v_utente, auth.uid()) returning id into v_ritiro;
  select l.nome into v_luogo from public.luoghi l where l.id = p.luogo_id;
  perform public.metti_avviso(v_utente, 'premio:' || v_ritiro, 'Premio ritirato', p.titolo || ' da ' || v_luogo || '. Grazie dei tuoi metri.', '/premi');
  return v_esito || jsonb_build_object('esito', 'consegnato');
end $$;

-- I miei premi ritirati (gli ultimi 20)
create or replace function public.miei_premi()
returns table (titolo text, luogo_id uuid, luogo text, ritirato_il timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.titolo, p.luogo_id, l.nome, r.ritirato_il
  from public.premi_ritiri r join public.premi p on p.id = r.premio_id join public.luoghi l on l.id = p.luogo_id
  where r.utente_id = auth.uid()
  order by r.ritirato_il desc limit 20;
$$;

revoke execute on function public.metri_di(uuid) from public, anon, authenticated;
revoke execute on function public.premio_aperto(public.premi) from public, anon, authenticated;
revoke execute on function public.premi_luogo(uuid) from public, anon;
revoke execute on function public.salva_premio(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.controlla_premio(uuid, text) from public, anon;
revoke execute on function public.riscatta_premio(uuid, text) from public, anon;
revoke execute on function public.miei_premi() from public, anon;

grant execute on function public.premi_attivi(uuid) to anon, authenticated;
grant execute on function public.premi_luogo(uuid) to authenticated;
grant execute on function public.salva_premio(uuid, uuid, jsonb) to authenticated;
grant execute on function public.controlla_premio(uuid, text) to authenticated;
grant execute on function public.riscatta_premio(uuid, text) to authenticated;
grant execute on function public.miei_premi() to authenticated;
