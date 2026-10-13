-- 739 San Marino · Modulo 1: Sport & Eventi.
-- Partite tra utenti SMR ID, squadre bilanciate e rating Glicko-2 per sport.
-- Le scritture passano solo dalle funzioni qui sotto (security definer, con i controlli),
-- così nessuno può modificare rating o squadre direttamente dal telefono.

create table public.sport (
  id text primary key,
  nome text not null,
  giocatori_per_squadra smallint not null check (giocatori_per_squadra between 1 and 11),
  ordine smallint not null default 0
);

insert into public.sport (id, nome, giocatori_per_squadra, ordine) values
  ('calcetto', 'Calcetto', 5, 1),
  ('padel', 'Padel', 2, 2),
  ('tennis', 'Tennis', 1, 3),
  ('basket', 'Basket 3x3', 3, 4),
  ('pallavolo', 'Pallavolo', 6, 5);

create table public.rating_sport (
  utente_id uuid not null references public.profili(id) on delete cascade,
  sport_id text not null references public.sport(id),
  rating double precision not null default 1500,
  rd double precision not null default 350,
  volatilita double precision not null default 0.06,
  partite integer not null default 0,
  vittorie integer not null default 0,
  aggiornato_il timestamptz not null default now(),
  primary key (utente_id, sport_id)
);

create table public.partite (
  id uuid primary key default gen_random_uuid(),
  sport_id text not null references public.sport(id),
  titolo text not null check (char_length(titolo) between 3 and 60),
  inizio timestamptz not null,
  luogo_nome text not null check (char_length(luogo_nome) between 2 and 80),
  lat double precision check (lat between 43.85 and 44.05),
  lng double precision check (lng between 12.35 and 12.6),
  posti smallint not null,
  organizzatore_id uuid not null references public.profili(id) on delete cascade,
  stato text not null default 'aperta' check (stato in ('aperta', 'squadre', 'giocata', 'annullata')),
  punteggio_a smallint check (punteggio_a >= 0),
  punteggio_b smallint check (punteggio_b >= 0),
  creato_il timestamptz not null default now()
);
create index partite_inizio_idx on public.partite (inizio);
create index partite_organizzatore_idx on public.partite (organizzatore_id);

create table public.iscrizioni (
  partita_id uuid not null references public.partite(id) on delete cascade,
  utente_id uuid not null references public.profili(id) on delete cascade,
  squadra text check (squadra in ('A', 'B')),
  rating_prima double precision,
  rating_dopo double precision,
  creato_il timestamptz not null default now(),
  primary key (partita_id, utente_id)
);
create index iscrizioni_utente_idx on public.iscrizioni (utente_id);

alter table public.sport enable row level security;
alter table public.rating_sport enable row level security;
alter table public.partite enable row level security;
alter table public.iscrizioni enable row level security;

create policy "sport visibili a tutti" on public.sport for select using (true);
create policy "i miei rating" on public.rating_sport for select using ((select auth.uid()) = utente_id);
-- partite e iscrizioni: nessuna lettura diretta, solo tramite le funzioni (non espongono gli id degli utenti)

-- ——— Glicko-2 (Glickman, 2012) ———
-- Funzione ausiliaria per l'aggiornamento della volatilità (passo 5 dell'algoritmo).
create or replace function public.glicko2_f(x double precision, delta double precision, phi double precision, v double precision, a double precision, tau double precision)
returns double precision language sql immutable set search_path = '' as $$
  select exp(x) * (delta ^ 2 - phi ^ 2 - v - exp(x)) / (2 * (phi ^ 2 + v + exp(x)) ^ 2) - (x - a) / tau ^ 2;
$$;

-- Nuovo rating dopo un periodo con gli avversari opp_r/opp_rd e i risultati s (1 vittoria, 0.5 pareggio, 0 sconfitta).
create or replace function public.glicko2(
  r double precision, rd double precision, sigma double precision,
  opp_r double precision[], opp_rd double precision[], s double precision[],
  out nuovo_r double precision, out nuovo_rd double precision, out nuova_sigma double precision)
language plpgsql immutable set search_path = '' as $$
declare
  k constant double precision := 173.7178;
  tau constant double precision := 0.5;
  eps constant double precision := 0.000001;
  mu double precision := (r - 1500) / k;
  phi double precision := rd / k;
  v double precision := 0;
  somma double precision := 0;
  g double precision; e double precision; muj double precision; phij double precision;
  delta double precision; a double precision;
  xa double precision; xb double precision; fa double precision; fb double precision; xc double precision; fc double precision;
  phistella double precision; phinuovo double precision;
  i integer;
begin
  if coalesce(array_length(opp_r, 1), 0) = 0 then
    nuovo_r := r;
    nuovo_rd := least(350, sqrt(phi ^ 2 + sigma ^ 2) * k);
    nuova_sigma := sigma;
    return;
  end if;

  for i in 1 .. array_length(opp_r, 1) loop
    muj := (opp_r[i] - 1500) / k;
    phij := opp_rd[i] / k;
    g := 1 / sqrt(1 + 3 * phij ^ 2 / pi() ^ 2);
    e := 1 / (1 + exp(-g * (mu - muj)));
    v := v + g ^ 2 * e * (1 - e);
    somma := somma + g * (s[i] - e);
  end loop;
  v := 1 / v;
  delta := v * somma;

  -- Volatilità: metodo di Illinois
  a := ln(sigma ^ 2);
  xa := a;
  if delta ^ 2 > phi ^ 2 + v then
    xb := ln(delta ^ 2 - phi ^ 2 - v);
  else
    i := 1;
    while public.glicko2_f(a - i * tau, delta, phi, v, a, tau) < 0 loop
      i := i + 1;
    end loop;
    xb := a - i * tau;
  end if;
  fa := public.glicko2_f(xa, delta, phi, v, a, tau);
  fb := public.glicko2_f(xb, delta, phi, v, a, tau);
  while abs(xb - xa) > eps loop
    xc := xa + (xa - xb) * fa / (fb - fa);
    fc := public.glicko2_f(xc, delta, phi, v, a, tau);
    if fc * fb <= 0 then
      xa := xb;
      fa := fb;
    else
      fa := fa / 2;
    end if;
    xb := xc;
    fb := fc;
  end loop;
  nuova_sigma := exp(xa / 2);

  phistella := sqrt(phi ^ 2 + nuova_sigma ^ 2);
  phinuovo := 1 / sqrt(1 / phistella ^ 2 + 1 / v);
  nuovo_r := k * (mu + phinuovo ^ 2 * somma) + 1500;
  nuovo_rd := greatest(30, least(350, k * phinuovo));
end; $$;

-- ——— Letture ———

-- Partite in programma (e quelle da chiudere per chi le organizza). Nessun id utente in uscita.
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
    and (
      (p.stato in ('aperta', 'squadre') and p.inizio > now() - interval '3 hours')
      or (p.stato = 'squadre' and p.organizzatore_id = auth.uid())
    )
  order by p.inizio
  limit 100;
$$;

create or replace function public.dettaglio_partita(p_partita uuid)
returns table (id uuid, sport_id text, titolo text, inizio timestamptz, luogo_nome text, lat double precision, lng double precision,
               posti smallint, iscritti integer, stato text, punteggio_a smallint, punteggio_b smallint,
               organizzatore text, sono_iscritto boolean, sono_organizzatore boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.sport_id, p.titolo, p.inizio, p.luogo_nome, p.lat, p.lng, p.posti,
         (select count(*)::integer from public.iscrizioni i where i.partita_id = p.id),
         p.stato, p.punteggio_a, p.punteggio_b,
         case when auth.uid() is not null then (select pr.nome from public.profili pr where pr.id = p.organizzatore_id) end,
         exists (select 1 from public.iscrizioni i where i.partita_id = p.id and i.utente_id = auth.uid()),
         coalesce(p.organizzatore_id = auth.uid(), false)
  from public.partite p
  where p.id = p_partita;
$$;

-- Chi gioca, con rating e squadra: solo per chi ha fatto l'accesso.
create or replace function public.giocatori_partita(p_partita uuid)
returns table (nome text, castello_id smallint, rating double precision, rd double precision, partite integer,
               squadra text, sono_io boolean, rating_prima double precision, rating_dopo double precision)
language sql stable security definer set search_path = '' as $$
  select coalesce(pr.nome, 'Giocatore'), pr.castello_id,
         coalesce(r.rating, 1500), coalesce(r.rd, 350), coalesce(r.partite, 0),
         i.squadra, i.utente_id = auth.uid(), i.rating_prima, i.rating_dopo
  from public.iscrizioni i
  join public.partite p on p.id = i.partita_id
  join public.profili pr on pr.id = i.utente_id
  left join public.rating_sport r on r.utente_id = i.utente_id and r.sport_id = p.sport_id
  where i.partita_id = p_partita and auth.uid() is not null
  order by i.squadra nulls last, coalesce(r.rating, 1500) desc;
$$;

-- Classifica dei giocatori di uno sport (almeno una partita giocata): solo per chi ha fatto l'accesso.
create or replace function public.classifica_sport(p_sport text)
returns table (posizione integer, nome text, castello_id smallint, rating double precision, rd double precision,
               partite integer, vittorie integer, sono_io boolean)
language sql stable security definer set search_path = '' as $$
  select (row_number() over (order by r.rating desc))::integer, coalesce(pr.nome, 'Giocatore'), pr.castello_id,
         r.rating, r.rd, r.partite, r.vittorie, r.utente_id = auth.uid()
  from public.rating_sport r
  join public.profili pr on pr.id = r.utente_id
  where r.sport_id = p_sport and r.partite > 0 and auth.uid() is not null
  order by r.rating desc
  limit 50;
$$;

-- Classifica dei castelli in uno sport: solo totali, pubblica.
create or replace function public.classifica_castelli_sport(p_sport text)
returns table (castello_id smallint, giocatori integer, vittorie integer, rating_medio double precision)
language sql stable security definer set search_path = '' as $$
  select pr.castello_id, count(*)::integer, sum(r.vittorie)::integer, avg(r.rating)
  from public.rating_sport r
  join public.profili pr on pr.id = r.utente_id
  where r.sport_id = p_sport and r.partite > 0 and pr.castello_id is not null
  group by pr.castello_id
  order by sum(r.vittorie) desc, avg(r.rating) desc;
$$;

-- ——— Azioni (solo per chi ha fatto l'accesso) ———

create or replace function public.crea_partita(p_sport text, p_titolo text, p_inizio timestamptz, p_luogo text,
                                               p_lat double precision default null, p_lng double precision default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  per_squadra smallint;
  nuova uuid;
begin
  if io is null then raise exception 'Accedi con il tuo SMR ID per organizzare una partita.'; end if;
  select s.giocatori_per_squadra into per_squadra from public.sport s where s.id = p_sport;
  if per_squadra is null then raise exception 'Sport non disponibile.'; end if;
  if p_inizio < now() + interval '15 minutes' then raise exception 'La partita deve iniziare almeno tra 15 minuti.'; end if;
  if p_inizio > now() + interval '60 days' then raise exception 'Puoi organizzare partite fino a 60 giorni da oggi.'; end if;
  if (select count(*) from public.partite p where p.organizzatore_id = io and p.stato in ('aperta', 'squadre')) >= 5 then
    raise exception 'Hai già 5 partite in programma: chiudine una prima di crearne altre.';
  end if;
  insert into public.partite (sport_id, titolo, inizio, luogo_nome, lat, lng, posti, organizzatore_id)
  values (p_sport, trim(p_titolo), p_inizio, trim(p_luogo), p_lat, p_lng, per_squadra * 2, io)
  returning id into nuova;
  insert into public.iscrizioni (partita_id, utente_id) values (nuova, io);
  return nuova;
end; $$;

create or replace function public.iscriviti_partita(p_partita uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  p public.partite;
begin
  if io is null then raise exception 'Accedi con il tuo SMR ID per iscriverti.'; end if;
  select * into p from public.partite where id = p_partita for update;
  if p.id is null then raise exception 'Partita non trovata.'; end if;
  if p.stato <> 'aperta' then raise exception 'Le iscrizioni sono chiuse.'; end if;
  if p.inizio <= now() then raise exception 'La partita è già iniziata.'; end if;
  if (select count(*) from public.iscrizioni i where i.partita_id = p.id) >= p.posti then raise exception 'La partita è al completo.'; end if;
  insert into public.iscrizioni (partita_id, utente_id) values (p.id, io) on conflict do nothing;
end; $$;

-- Permessi: le letture "con nomi" e le azioni solo a chi ha fatto l'accesso
revoke execute on function public.glicko2_f(double precision, double precision, double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke execute on function public.glicko2(double precision, double precision, double precision, double precision[], double precision[], double precision[]) from public, anon, authenticated;
revoke execute on function public.elenco_partite(text) from public;
revoke execute on function public.dettaglio_partita(uuid) from public;
revoke execute on function public.giocatori_partita(uuid) from public, anon;
revoke execute on function public.classifica_sport(text) from public, anon;
revoke execute on function public.classifica_castelli_sport(text) from public;
revoke execute on function public.crea_partita(text, text, timestamptz, text, double precision, double precision) from public, anon;
revoke execute on function public.iscriviti_partita(uuid) from public, anon;

grant execute on function public.elenco_partite(text) to anon, authenticated;
grant execute on function public.dettaglio_partita(uuid) to anon, authenticated;
grant execute on function public.classifica_castelli_sport(text) to anon, authenticated;
grant execute on function public.giocatori_partita(uuid) to authenticated;
grant execute on function public.classifica_sport(text) to authenticated;
grant execute on function public.crea_partita(text, text, timestamptz, text, double precision, double precision) to authenticated;
grant execute on function public.iscriviti_partita(uuid) to authenticated;
