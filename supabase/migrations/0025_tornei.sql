-- 0025: tornei di castello (passo 1.3).
--
-- Un torneo raccoglie squadre che rappresentano un castello, in uno sport, con date e luogo. Lo crea la redazione.
-- Un capitano con SMR ID iscrive la squadra del suo castello (quello scelto nel profilo) e condivide un link:
-- chi ha lo stesso castello si unisce con il codice del link. Una squadra per castello in ogni torneo.
-- Alla partenza la redazione genera il tabellone: eliminazione diretta (con i passaggi del turno se le squadre
-- non sono una potenza di 2) oppure girone all'italiana (tutti contro tutti: 3 punti la vittoria, 1 il pareggio).
-- Ogni incontro diventa una partita della tabella «partite» (squadra A e B già fatte) quando la redazione lo
-- programma; il risultato si registra con registra_risultato() come per ogni partita, che aggiorna anche i
-- rating Glicko-2. Un trigger porta il risultato nel tabellone, fa avanzare la vincente e, alla fine, assegna i metri
-- del torneo a ogni giocatore della squadra vincitrice: così salgono anche nella classifica del suo castello.
--
-- Da applicare a mano: aggiunge un trigger alla tabella «partite» e sostituisce quattro funzioni della 0007/0008
-- (elenco_partite, ritirati_partita, annulla_partita, forma_squadre) perché non tocchino le partite dei tornei.

create table if not exists public.tornei (
  id uuid primary key default gen_random_uuid(),
  titolo text not null check (char_length(titolo) between 3 and 80),
  descrizione text check (char_length(descrizione) <= 2000),
  sport_id text not null references public.sport (id),
  formato text not null check (formato in ('eliminazione', 'girone')),
  dal date not null,
  al date not null,
  luogo_id uuid references public.luoghi (id) on delete set null,
  luogo_nome text check (char_length(luogo_nome) <= 120),
  metri integer not null default 100 check (metri between 0 and 739),
  stato text not null default 'iscrizioni' check (stato in ('iscrizioni', 'in_corso', 'concluso', 'annullato')),
  vincitrice uuid,
  creato_da uuid references public.profili (id) on delete set null,
  creato_il timestamptz not null default now(),
  check (al >= dal)
);

create table if not exists public.torneo_squadre (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.tornei (id) on delete cascade,
  castello_id smallint not null references public.castelli (id),
  nome text not null check (char_length(nome) between 2 and 40),
  capitano_id uuid not null references public.profili (id) on delete cascade,
  codice text not null unique,
  creato_il timestamptz not null default now(),
  unique (torneo_id, castello_id)
);

alter table public.tornei drop constraint if exists tornei_vincitrice_fkey;
alter table public.tornei add constraint tornei_vincitrice_fkey foreign key (vincitrice) references public.torneo_squadre (id) on delete set null;

create table if not exists public.torneo_giocatori (
  torneo_id uuid not null references public.tornei (id) on delete cascade,
  squadra_id uuid not null references public.torneo_squadre (id) on delete cascade,
  utente_id uuid not null references public.profili (id) on delete cascade,
  creato_il timestamptz not null default now(),
  primary key (torneo_id, utente_id)
);
create index if not exists torneo_giocatori_squadra_idx on public.torneo_giocatori (squadra_id);

-- Il tabellone: eliminazione (turno 1 = primo turno, posizione dentro il turno) o girone (turno = giornata)
create table if not exists public.torneo_incontri (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.tornei (id) on delete cascade,
  turno smallint not null,
  posizione smallint not null,
  squadra_a uuid references public.torneo_squadre (id) on delete set null,
  squadra_b uuid references public.torneo_squadre (id) on delete set null,
  partita_id uuid unique references public.partite (id) on delete set null,
  punti_a smallint,
  punti_b smallint,
  vincitrice uuid references public.torneo_squadre (id) on delete set null,
  giocato boolean not null default false,
  unique (torneo_id, turno, posizione)
);

-- Nessuna regola: tutto passa dalle funzioni qui sotto
alter table public.tornei enable row level security;
alter table public.torneo_squadre enable row level security;
alter table public.torneo_giocatori enable row level security;
alter table public.torneo_incontri enable row level security;

-- ——— Letture ———

-- Elenco pubblico: i tornei non annullati, prima quelli in corso e in arrivo
create or replace function public.elenco_tornei()
returns table (id uuid, titolo text, sport_id text, formato text, dal date, al date, luogo_nome text, metri integer,
               stato text, squadre integer, vincitrice_castello smallint)
language sql stable security definer set search_path = '' as $$
  select t.id, t.titolo, t.sport_id, t.formato, t.dal, t.al, coalesce(l.nome, t.luogo_nome), t.metri, t.stato,
         (select count(*)::integer from public.torneo_squadre s where s.torneo_id = t.id),
         (select s.castello_id from public.torneo_squadre s where s.id = t.vincitrice)
  from public.tornei t
  left join public.luoghi l on l.id = t.luogo_id
  where t.stato <> 'annullato'
  order by (t.stato = 'concluso'), t.dal, t.titolo
  limit 50;
$$;

-- Tutto il torneo in un colpo: dati, squadre (i nomi dei giocatori solo a chi ha fatto l'accesso,
-- il codice del link solo al capitano e alla redazione) e incontri con la partita collegata
create or replace function public.dettaglio_torneo(p_torneo uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'titolo', t.titolo, 'descrizione', t.descrizione, 'sport_id', t.sport_id, 'formato', t.formato,
    'dal', t.dal, 'al', t.al, 'luogo_id', t.luogo_id, 'luogo_nome', coalesce(l.nome, t.luogo_nome), 'metri', t.metri,
    'stato', t.stato, 'vincitrice', t.vincitrice,
    'redazione', public.e_redattore(),
    'mia_squadra', (select g.squadra_id from public.torneo_giocatori g where g.torneo_id = t.id and g.utente_id = auth.uid()),
    'squadre', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'castello_id', s.castello_id, 'nome', s.nome,
        'capitano', case when auth.uid() is not null then (select p.nome from public.profili p where p.id = s.capitano_id) end,
        'sono_capitano', s.capitano_id = auth.uid(),
        'codice', case when s.capitano_id = auth.uid() or public.e_redattore() then s.codice end,
        'giocatori', (select count(*) from public.torneo_giocatori g where g.squadra_id = s.id),
        'nomi', case when auth.uid() is not null then (
          select coalesce(jsonb_agg(coalesce(p.nome, 'Giocatore') order by g.creato_il), '[]'::jsonb)
          from public.torneo_giocatori g join public.profili p on p.id = g.utente_id where g.squadra_id = s.id) end
      ) order by s.creato_il)
      from public.torneo_squadre s where s.torneo_id = t.id
    ), '[]'::jsonb),
    'incontri', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'turno', i.turno, 'posizione', i.posizione, 'squadra_a', i.squadra_a, 'squadra_b', i.squadra_b,
        'punti_a', i.punti_a, 'punti_b', i.punti_b, 'vincitrice', i.vincitrice, 'giocato', i.giocato,
        'partita_id', i.partita_id, 'inizio', pa.inizio, 'luogo', pa.luogo_nome
      ) order by i.turno, i.posizione)
      from public.torneo_incontri i left join public.partite pa on pa.id = i.partita_id where i.torneo_id = t.id
    ), '[]'::jsonb)
  )
  from public.tornei t
  left join public.luoghi l on l.id = t.luogo_id
  where t.id = p_torneo and t.stato <> 'annullato';
$$;

-- Il torneo di una partita (per la pagina della partita), null se non è di un torneo
create or replace function public.torneo_di_partita(p_partita uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', t.id, 'titolo', t.titolo,
    'castello_a', (select s.castello_id from public.torneo_squadre s where s.id = i.squadra_a),
    'castello_b', (select s.castello_id from public.torneo_squadre s where s.id = i.squadra_b),
    'nome_a', (select s.nome from public.torneo_squadre s where s.id = i.squadra_a),
    'nome_b', (select s.nome from public.torneo_squadre s where s.id = i.squadra_b),
    'eliminazione', t.formato = 'eliminazione')
  from public.torneo_incontri i join public.tornei t on t.id = i.torneo_id
  where i.partita_id = p_partita;
$$;

-- ——— Redazione ———

create or replace function public.crea_torneo(p_dati jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_dal date := nullif(p_dati->>'dal', '')::date;
  v_al date := coalesce(nullif(p_dati->>'al', '')::date, nullif(p_dati->>'dal', '')::date);
begin
  if not public.e_redattore() then raise exception 'I tornei li crea solo la redazione.'; end if;
  if char_length(trim(coalesce(p_dati->>'titolo', ''))) < 3 then raise exception 'Scrivi un titolo di almeno 3 caratteri.'; end if;
  if not exists (select 1 from public.sport s where s.id = p_dati->>'sport_id') then raise exception 'Scegli uno sport.'; end if;
  if coalesce(p_dati->>'formato', '') not in ('eliminazione', 'girone') then raise exception 'Scegli il formato: eliminazione diretta o girone.'; end if;
  if v_dal is null then raise exception 'Scegli il giorno di inizio.'; end if;
  if v_al < v_dal then raise exception 'Il torneo non può finire prima di cominciare.'; end if;
  insert into public.tornei (titolo, descrizione, sport_id, formato, dal, al, luogo_id, luogo_nome, metri, creato_da)
  values (trim(p_dati->>'titolo'), nullif(trim(coalesce(p_dati->>'descrizione', '')), ''), p_dati->>'sport_id', p_dati->>'formato',
          v_dal, v_al, nullif(p_dati->>'luogo_id', '')::uuid, nullif(trim(coalesce(p_dati->>'luogo_nome', '')), ''),
          coalesce(nullif(p_dati->>'metri', '')::integer, 100), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.annulla_torneo(p_torneo uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Solo la redazione può annullare un torneo.'; end if;
  update public.tornei set stato = 'annullato' where id = p_torneo and stato in ('iscrizioni', 'in_corso');
  if not found then raise exception 'Il torneo è già concluso o annullato.'; end if;
  -- Le partite non ancora giocate del torneo si annullano anche nel calendario delle partite
  update public.partite set stato = 'annullata'
  where id in (select partita_id from public.torneo_incontri where torneo_id = p_torneo and not giocato) and stato in ('aperta', 'squadre');
end $$;

-- Chiude il torneo con la vincitrice e dà i metri a ogni suo giocatore (una volta sola)
create or replace function public.chiudi_torneo(p_torneo uuid, p_vincitrice uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.tornei;
begin
  select * into t from public.tornei where id = p_torneo for update;
  if t.stato <> 'in_corso' then return; end if;
  update public.tornei set stato = 'concluso', vincitrice = p_vincitrice where id = p_torneo;
  if t.metri > 0 and p_vincitrice is not null then
    insert into public.metri_movimenti (utente_id, metri, motivo, riferimento)
    select g.utente_id, t.metri, 'torneo', t.id
    from public.torneo_giocatori g
    where g.squadra_id = p_vincitrice
      and not exists (select 1 from public.metri_movimenti m where m.utente_id = g.utente_id and m.motivo = 'torneo' and m.riferimento = t.id);
  end if;
end $$;

-- La vincente di un incontro a eliminazione passa al turno dopo; se era la finale, il torneo è finito
create or replace function public.avanza_vincente(p_incontro uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  i public.torneo_incontri;
  v_ultimo smallint;
begin
  select * into i from public.torneo_incontri where id = p_incontro;
  select max(turno) into v_ultimo from public.torneo_incontri where torneo_id = i.torneo_id;
  if i.turno = v_ultimo then
    perform public.chiudi_torneo(i.torneo_id, i.vincitrice);
    return;
  end if;
  if i.posizione % 2 = 1 then
    update public.torneo_incontri set squadra_a = i.vincitrice
    where torneo_id = i.torneo_id and turno = i.turno + 1 and posizione = (i.posizione + 1) / 2;
  else
    update public.torneo_incontri set squadra_b = i.vincitrice
    where torneo_id = i.torneo_id and turno = i.turno + 1 and posizione = i.posizione / 2;
  end if;
end $$;

-- Classifica del girone: 3 punti la vittoria, 1 il pareggio; a parità differenza punti, poi punti fatti
create or replace function public.classifica_girone(p_torneo uuid)
returns table (squadra_id uuid, giocate integer, vinte integer, pari integer, perse integer, fatti integer, subiti integer, punti integer)
language sql stable security definer set search_path = '' as $$
  with r as (
    select i.squadra_a as s, i.punti_a as f, i.punti_b as c from public.torneo_incontri i where i.torneo_id = p_torneo and i.giocato
    union all
    select i.squadra_b, i.punti_b, i.punti_a from public.torneo_incontri i where i.torneo_id = p_torneo and i.giocato
  )
  select sq.id,
         count(r.s)::integer,
         count(*) filter (where r.f > r.c)::integer,
         count(*) filter (where r.f = r.c)::integer,
         count(*) filter (where r.f < r.c)::integer,
         coalesce(sum(r.f), 0)::integer,
         coalesce(sum(r.c), 0)::integer,
         (3 * count(*) filter (where r.f > r.c) + count(*) filter (where r.f = r.c))::integer
  from public.torneo_squadre sq
  left join r on r.s = sq.id
  where sq.torneo_id = p_torneo
  group by sq.id, sq.creato_il
  order by 8 desc, (coalesce(sum(r.f), 0) - coalesce(sum(r.c), 0)) desc, 6 desc, sq.creato_il;
$$;

-- Parte il torneo: chiude le iscrizioni e genera il tabellone
create or replace function public.avvia_torneo(p_torneo uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.tornei;
  v_squadre uuid[];
  n integer;
  v_minimo smallint;
  v_corta text;
  v_lato integer := 1;
  v_turni integer := 0;
  v_turno integer;
  k integer;
  a uuid; b uuid;
  v_inc uuid;
  ruota uuid[];
begin
  if not public.e_redattore() then raise exception 'Solo la redazione può far partire un torneo.'; end if;
  select * into t from public.tornei where id = p_torneo for update;
  if t.id is null then raise exception 'Torneo non trovato.'; end if;
  if t.stato <> 'iscrizioni' then raise exception 'Il torneo è già partito.'; end if;

  select s.giocatori_per_squadra into v_minimo from public.sport s where s.id = t.sport_id;
  select sq.nome into v_corta from public.torneo_squadre sq
  where sq.torneo_id = t.id and (select count(*) from public.torneo_giocatori g where g.squadra_id = sq.id) < v_minimo
  limit 1;
  if v_corta is not null then
    raise exception 'La squadra «%» ha meno di % giocatori: completala o toglila prima di partire.', v_corta, v_minimo;
  end if;

  -- Ordine casuale: è il sorteggio
  select array_agg(id order by random()) into v_squadre from public.torneo_squadre where torneo_id = t.id;
  n := coalesce(array_length(v_squadre, 1), 0);
  if n < 2 then raise exception 'Servono almeno 2 squadre per partire.'; end if;

  if t.formato = 'eliminazione' then
    while v_lato < n loop v_lato := v_lato * 2; v_turni := v_turni + 1; end loop;
    -- Primo turno: la k-esima squadra del sorteggio contro la (lato+1-k)-esima; dove manca, passa il turno
    for k in 1 .. v_lato / 2 loop
      a := v_squadre[k];
      b := case when v_lato + 1 - k <= n then v_squadre[v_lato + 1 - k] end;
      insert into public.torneo_incontri (torneo_id, turno, posizione, squadra_a, squadra_b)
      values (t.id, 1, k, a, b);
    end loop;
    -- I turni dopo, vuoti: si riempiono con le vincenti
    for v_turno in 2 .. v_turni loop
      for k in 1 .. v_lato / (2 ^ v_turno)::integer loop
        insert into public.torneo_incontri (torneo_id, turno, posizione) values (t.id, v_turno, k);
      end loop;
    end loop;
    update public.tornei set stato = 'in_corso' where id = t.id;
    -- Chi non ha avversario passa subito al turno dopo
    for v_inc in select id from public.torneo_incontri where torneo_id = t.id and turno = 1 and squadra_b is null loop
      update public.torneo_incontri set giocato = true, vincitrice = squadra_a where id = v_inc;
      perform public.avanza_vincente(v_inc);
    end loop;
  else
    -- Girone all'italiana col metodo del cerchio: ogni giornata tutte le squadre giocano (una riposa se sono dispari)
    ruota := v_squadre;
    if n % 2 = 1 then ruota := ruota || null::uuid; end if;
    for v_turno in 1 .. array_length(ruota, 1) - 1 loop
      for k in 1 .. array_length(ruota, 1) / 2 loop
        a := ruota[k];
        b := ruota[array_length(ruota, 1) + 1 - k];
        if a is not null and b is not null then
          insert into public.torneo_incontri (torneo_id, turno, posizione, squadra_a, squadra_b) values (t.id, v_turno, k, a, b);
        end if;
      end loop;
      -- La prima resta ferma, le altre girano di un posto
      ruota := ruota[1:1] || ruota[array_length(ruota, 1):array_length(ruota, 1)] || ruota[2:array_length(ruota, 1) - 1];
    end loop;
    update public.tornei set stato = 'in_corso' where id = t.id;
  end if;
end $$;

-- Mette in calendario un incontro: crea la partita (squadre A e B già fatte, organizza chi la programma)
-- o ne cambia giorno, ora e luogo se non è ancora giocata. Il risultato poi si registra dalla pagina della partita.
create or replace function public.programma_incontro(p_incontro uuid, p_inizio timestamptz, p_luogo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  i public.torneo_incontri;
  t public.tornei;
  v_partita uuid;
  v_posti integer;
begin
  if not public.e_redattore() then raise exception 'Gli incontri li mette in calendario la redazione.'; end if;
  select * into i from public.torneo_incontri where id = p_incontro for update;
  if i.id is null then raise exception 'Incontro non trovato.'; end if;
  select * into t from public.tornei where id = i.torneo_id;
  if t.stato <> 'in_corso' then raise exception 'Il torneo non è in corso.'; end if;
  if i.giocato then raise exception 'L''incontro è già stato giocato.'; end if;
  if i.squadra_a is null or i.squadra_b is null then raise exception 'Mancano ancora le squadre di questo incontro.'; end if;
  if p_inizio is null then raise exception 'Scegli giorno e ora.'; end if;
  if char_length(trim(coalesce(p_luogo, ''))) < 2 then raise exception 'Scrivi dove si gioca.'; end if;

  if i.partita_id is not null then
    update public.partite set inizio = p_inizio, luogo_nome = left(trim(p_luogo), 80) where id = i.partita_id and stato = 'squadre';
    return i.partita_id;
  end if;

  select count(*) into v_posti from public.torneo_giocatori where squadra_id in (i.squadra_a, i.squadra_b);
  insert into public.partite (sport_id, titolo, inizio, luogo_nome, posti, organizzatore_id, stato)
  values (t.sport_id,
          left((select nome from public.torneo_squadre where id = i.squadra_a) || ' - ' || (select nome from public.torneo_squadre where id = i.squadra_b), 60),
          p_inizio, left(trim(p_luogo), 80), greatest(v_posti, 2), auth.uid(), 'squadre')
  returning id into v_partita;
  insert into public.iscrizioni (partita_id, utente_id, squadra)
  select v_partita, g.utente_id, case when g.squadra_id = i.squadra_a then 'A' else 'B' end
  from public.torneo_giocatori g where g.squadra_id in (i.squadra_a, i.squadra_b);
  update public.torneo_incontri set partita_id = v_partita where id = i.id;
  return v_partita;
end $$;

-- ——— Capitani e giocatori ———

-- Iscrive la squadra del castello del capitano; restituisce il codice del link per i compagni
create or replace function public.iscrivi_squadra(p_torneo uuid, p_nome text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  t public.tornei;
  v_castello smallint;
  v_squadra uuid;
  v_codice text;
begin
  if io is null then raise exception 'Per iscrivere una squadra entra con il tuo SMR ID.'; end if;
  select * into t from public.tornei where id = p_torneo for update;
  if t.id is null or t.stato = 'annullato' then raise exception 'Torneo non trovato.'; end if;
  if t.stato <> 'iscrizioni' then raise exception 'Le iscrizioni a questo torneo sono chiuse.'; end if;
  select castello_id into v_castello from public.profili where id = io;
  if v_castello is null then raise exception 'Scegli prima il tuo castello nel profilo SMR ID: la squadra lo rappresenta.'; end if;
  if exists (select 1 from public.torneo_squadre where torneo_id = t.id and castello_id = v_castello) then
    raise exception 'Il tuo castello ha già una squadra in questo torneo: chiedi il link al capitano.';
  end if;
  if exists (select 1 from public.torneo_giocatori where torneo_id = t.id and utente_id = io) then
    raise exception 'Sei già in una squadra di questo torneo.';
  end if;
  if char_length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Dai un nome alla squadra.'; end if;
  v_codice := substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 10);
  insert into public.torneo_squadre (torneo_id, castello_id, nome, capitano_id, codice)
  values (t.id, v_castello, left(trim(p_nome), 40), io, v_codice)
  returning id into v_squadra;
  insert into public.torneo_giocatori (torneo_id, squadra_id, utente_id) values (t.id, v_squadra, io);
  return v_codice;
end $$;

-- Si entra in una squadra con il codice del link, se si è dello stesso castello
create or replace function public.unisciti_squadra(p_codice text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  s public.torneo_squadre;
  t public.tornei;
  v_castello smallint;
  v_nome_castello text;
begin
  if io is null then raise exception 'Per entrare in squadra entra con il tuo SMR ID.'; end if;
  select * into s from public.torneo_squadre where codice = trim(coalesce(p_codice, ''));
  if s.id is null then raise exception 'Il link della squadra non è valido: chiedilo di nuovo al capitano.'; end if;
  select * into t from public.tornei where id = s.torneo_id;
  if t.stato <> 'iscrizioni' then raise exception 'Le iscrizioni a questo torneo sono chiuse.'; end if;
  if exists (select 1 from public.torneo_giocatori where torneo_id = t.id and utente_id = io and squadra_id = s.id) then return t.id; end if;
  if exists (select 1 from public.torneo_giocatori where torneo_id = t.id and utente_id = io) then
    raise exception 'Sei già in un''altra squadra di questo torneo.';
  end if;
  select castello_id into v_castello from public.profili where id = io;
  if v_castello is distinct from s.castello_id then
    select nome into v_nome_castello from public.castelli where id = s.castello_id;
    raise exception 'Questa squadra gioca per %: entra solo chi ha scelto % nel profilo SMR ID.', v_nome_castello, v_nome_castello;
  end if;
  insert into public.torneo_giocatori (torneo_id, squadra_id, utente_id) values (t.id, s.id, io);
  return t.id;
end $$;

-- Esce dalla squadra un giocatore; se esce il capitano, la squadra si ritira. Solo durante le iscrizioni.
create or replace function public.lascia_squadra(p_torneo uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  g public.torneo_giocatori;
begin
  select * into g from public.torneo_giocatori where torneo_id = p_torneo and utente_id = io;
  if g.utente_id is null then raise exception 'Non sei in una squadra di questo torneo.'; end if;
  if (select stato from public.tornei where id = p_torneo) <> 'iscrizioni' then
    raise exception 'Il torneo è partito: per ritirarti scrivi alla redazione.';
  end if;
  if exists (select 1 from public.torneo_squadre where id = g.squadra_id and capitano_id = io) then
    delete from public.torneo_squadre where id = g.squadra_id;
  else
    delete from public.torneo_giocatori where torneo_id = p_torneo and utente_id = io;
  end if;
end $$;

-- ——— Il risultato della partita entra nel tabellone ———

create or replace function public.risultato_torneo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  i public.torneo_incontri;
  t public.tornei;
  v_vince uuid;
begin
  select * into i from public.torneo_incontri where partita_id = new.id;
  if i.id is null or i.giocato then return new; end if;
  select * into t from public.tornei where id = i.torneo_id;
  if t.formato = 'eliminazione' and new.punteggio_a = new.punteggio_b then
    raise exception 'In un torneo a eliminazione serve una vincente: conta anche supplementari o rigori nel punteggio.';
  end if;
  v_vince := case when new.punteggio_a > new.punteggio_b then i.squadra_a when new.punteggio_b > new.punteggio_a then i.squadra_b end;
  update public.torneo_incontri set punti_a = new.punteggio_a, punti_b = new.punteggio_b, vincitrice = v_vince, giocato = true where id = i.id;
  if t.stato <> 'in_corso' then return new; end if;
  if t.formato = 'eliminazione' then
    perform public.avanza_vincente(i.id);
  elsif not exists (select 1 from public.torneo_incontri where torneo_id = t.id and not giocato) then
    perform public.chiudi_torneo(t.id, (select c.squadra_id from public.classifica_girone(t.id) c limit 1));
  end if;
  return new;
end $$;

drop trigger if exists dopo_risultato_torneo on public.partite;
create trigger dopo_risultato_torneo after update of stato on public.partite
  for each row when (new.stato = 'giocata' and old.stato is distinct from 'giocata')
  execute function public.risultato_torneo();

-- ——— Le partite dei tornei non si toccano con le azioni delle partite libere ———

create or replace function public.elenco_partite(p_sport text default null)
returns table (id uuid, sport_id text, titolo text, inizio timestamptz, luogo_nome text, lat double precision, lng double precision,
               posti smallint, iscritti integer, stato text, sono_iscritto boolean, sono_organizzatore boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.sport_id, p.titolo, p.inizio, p.luogo_nome, p.lat, p.lng, p.posti,
         (select count(*)::integer from public.iscrizioni i where i.partita_id = p.id),
         p.stato,
         exists (select 1 from public.iscrizioni i where i.partita_id = p.id and i.utente_id = auth.uid()),
         coalesce(p.organizzatore_id = auth.uid(), false)
  from public.partite p
  where (p_sport is null or p.sport_id = p_sport)
    and not exists (select 1 from public.torneo_incontri ti where ti.partita_id = p.id)
    and (
      (p.stato in ('aperta', 'squadre') and p.inizio > now() - interval '3 hours')
      or (p.stato = 'squadre' and p.organizzatore_id = auth.uid())
    )
  order by p.inizio
  limit 100;
$$;

create or replace function public.ritirati_partita(p_partita uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  p public.partite;
begin
  if io is null then raise exception 'Accedi con il tuo SMR ID.'; end if;
  if exists (select 1 from public.torneo_incontri where partita_id = p_partita) then
    raise exception 'È una partita di torneo: per non giocare scrivi alla redazione.';
  end if;
  select * into p from public.partite where id = p_partita for update;
  if p.id is null then raise exception 'Partita non trovata.'; end if;
  if p.organizzatore_id = io then raise exception 'Sei l''organizzatore: se non si gioca, annulla la partita.'; end if;
  if p.stato not in ('aperta', 'squadre') or p.inizio <= now() then raise exception 'Non puoi più ritirarti da questa partita.'; end if;
  delete from public.iscrizioni where partita_id = p.id and utente_id = io;
  -- Se le squadre erano già fatte, vanno rifatte
  if p.stato = 'squadre' then
    update public.partite set stato = 'aperta' where id = p.id;
    update public.iscrizioni set squadra = null where partita_id = p.id;
  end if;
end; $$;

create or replace function public.annulla_partita(p_partita uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.torneo_incontri where partita_id = p_partita) then
    raise exception 'È una partita di torneo: si sposta cambiando giorno e ora dal torneo.';
  end if;
  update public.partite set stato = 'annullata'
  where id = p_partita and organizzatore_id = auth.uid() and stato in ('aperta', 'squadre');
  if not found then raise exception 'Solo l''organizzatore può annullare una partita in programma.'; end if;
end; $$;

create or replace function public.forma_squadre(p_partita uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.partite;
  n integer;
  somma_a double precision := 0; somma_b double precision := 0;
  conta_a integer := 0; conta_b integer := 0;
  g record;
begin
  if exists (select 1 from public.torneo_incontri where partita_id = p_partita) then
    raise exception 'In un torneo le squadre sono quelle dei castelli.';
  end if;
  select * into p from public.partite where id = p_partita for update;
  if p.id is null or p.organizzatore_id is distinct from auth.uid() then raise exception 'Solo l''organizzatore può formare le squadre.'; end if;
  if p.stato not in ('aperta', 'squadre') then raise exception 'La partita è già chiusa.'; end if;
  select count(*) into n from public.iscrizioni where partita_id = p.id;
  if n < 2 or n % 2 = 1 then raise exception 'Servono un numero pari di giocatori (almeno 2).'; end if;

  for g in
    select i.utente_id, coalesce(r.rating, 1500) as rating
    from public.iscrizioni i
    left join public.rating_sport r on r.utente_id = i.utente_id and r.sport_id = p.sport_id
    where i.partita_id = p.id
    order by coalesce(r.rating, 1500) desc, random()
  loop
    if conta_a < n / 2 and (somma_a <= somma_b or conta_b >= n / 2) then
      update public.iscrizioni set squadra = 'A' where partita_id = p.id and utente_id = g.utente_id;
      somma_a := somma_a + g.rating; conta_a := conta_a + 1;
    else
      update public.iscrizioni set squadra = 'B' where partita_id = p.id and utente_id = g.utente_id;
      somma_b := somma_b + g.rating; conta_b := conta_b + 1;
    end if;
  end loop;
  update public.partite set stato = 'squadre' where id = p.id;
end; $$;

-- ——— Permessi ———

revoke execute on function public.elenco_tornei() from public;
revoke execute on function public.dettaglio_torneo(uuid) from public;
revoke execute on function public.torneo_di_partita(uuid) from public;
revoke execute on function public.classifica_girone(uuid) from public;
revoke execute on function public.crea_torneo(jsonb) from public, anon;
revoke execute on function public.annulla_torneo(uuid) from public, anon;
revoke execute on function public.avvia_torneo(uuid) from public, anon;
revoke execute on function public.programma_incontro(uuid, timestamptz, text) from public, anon;
revoke execute on function public.iscrivi_squadra(uuid, text) from public, anon;
revoke execute on function public.unisciti_squadra(text) from public, anon;
revoke execute on function public.lascia_squadra(uuid) from public, anon;
revoke execute on function public.chiudi_torneo(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.avanza_vincente(uuid) from public, anon, authenticated;
revoke execute on function public.risultato_torneo() from public, anon, authenticated;

grant execute on function public.elenco_tornei() to anon, authenticated;
grant execute on function public.dettaglio_torneo(uuid) to anon, authenticated;
grant execute on function public.torneo_di_partita(uuid) to anon, authenticated;
grant execute on function public.classifica_girone(uuid) to anon, authenticated;
grant execute on function public.crea_torneo(jsonb) to authenticated;
grant execute on function public.annulla_torneo(uuid) to authenticated;
grant execute on function public.avvia_torneo(uuid) to authenticated;
grant execute on function public.programma_incontro(uuid, timestamptz, text) to authenticated;
grant execute on function public.iscrivi_squadra(uuid, text) to authenticated;
grant execute on function public.unisciti_squadra(text) to authenticated;
grant execute on function public.lascia_squadra(uuid) to authenticated;
