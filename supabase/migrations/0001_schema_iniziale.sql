-- 739 San Marino · schema iniziale (fase 1: la piazza)
-- Già applicato al progetto Supabase "739-san-marino" (txjwvjcfubskvjxaelih).

create table public.castelli (
  id smallint primary key,
  slug text not null unique,
  nome text not null,
  colore text not null
);

create table public.profili (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  castello_id smallint references public.castelli(id),
  lingua text not null default 'it' check (lingua in ('it','en','de')),
  creato_il timestamptz not null default now()
);

create table public.luoghi (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null check (categoria in ('luogo','parcheggio','farmacia','impianto','trasporti','locale','servizio')),
  descrizione text,
  lat double precision not null,
  lng double precision not null,
  castello_id smallint references public.castelli(id),
  creato_il timestamptz not null default now()
);

create table public.eventi (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  descrizione text,
  inizio timestamptz not null,
  fine timestamptz,
  luogo_id uuid references public.luoghi(id) on delete set null,
  castello_id smallint references public.castelli(id),
  organizzatore text,
  metri integer not null default 20 check (metri between 0 and 500),
  pubblicato boolean not null default true,
  creato_il timestamptz not null default now()
);
create index eventi_inizio_idx on public.eventi (inizio);
create index eventi_luogo_idx on public.eventi (luogo_id);

create table public.checkin (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references public.profili(id) on delete cascade,
  evento_id uuid not null references public.eventi(id) on delete cascade,
  creato_il timestamptz not null default now(),
  unique (utente_id, evento_id)
);
create index checkin_evento_idx on public.checkin (evento_id);

create table public.metri_movimenti (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references public.profili(id) on delete cascade,
  metri integer not null,
  motivo text not null,
  riferimento uuid,
  creato_il timestamptz not null default now()
);
create index metri_utente_idx on public.metri_movimenti (utente_id);

create or replace function public.crea_profilo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profili (id, nome) values (new.id, new.raw_user_meta_data->>'nome');
  return new;
end; $$;
create trigger alla_registrazione after insert on auth.users
  for each row execute function public.crea_profilo();

create or replace function public.metri_da_checkin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.metri_movimenti (utente_id, metri, motivo, riferimento)
  select new.utente_id, e.metri, 'checkin', e.id from public.eventi e where e.id = new.evento_id;
  return new;
end; $$;
create trigger dopo_checkin after insert on public.checkin
  for each row execute function public.metri_da_checkin();

alter table public.castelli enable row level security;
alter table public.profili enable row level security;
alter table public.luoghi enable row level security;
alter table public.eventi enable row level security;
alter table public.checkin enable row level security;
alter table public.metri_movimenti enable row level security;

create policy "castelli visibili a tutti" on public.castelli for select using (true);
create policy "luoghi visibili a tutti" on public.luoghi for select using (true);
create policy "eventi pubblicati visibili a tutti" on public.eventi for select using (pubblicato);
create policy "il mio profilo" on public.profili for select using ((select auth.uid()) = id);
create policy "aggiorno il mio profilo" on public.profili for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "i miei check-in" on public.checkin for select using ((select auth.uid()) = utente_id);
create policy "faccio check-in" on public.checkin for insert with check ((select auth.uid()) = utente_id);
create policy "i miei metri" on public.metri_movimenti for select using ((select auth.uid()) = utente_id);

revoke execute on function public.crea_profilo() from public, anon, authenticated;
revoke execute on function public.metri_da_checkin() from public, anon, authenticated;

-- Classifica pubblica: solo totali per castello, nessun dato personale.
create or replace function public.classifica_castelli_totali()
returns table (id smallint, slug text, nome text, colore text, metri bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.nome, c.colore, coalesce(sum(m.metri), 0)::bigint as metri
  from public.castelli c
  left join public.profili p on p.castello_id = c.id
  left join public.metri_movimenti m on m.utente_id = p.id
  group by c.id, c.slug, c.nome, c.colore
  order by metri desc, c.id;
$$;
revoke execute on function public.classifica_castelli_totali() from public;
grant execute on function public.classifica_castelli_totali() to anon, authenticated;

insert into public.castelli (id, slug, nome, colore) values
  (1,'citta','Città','#E4572E'),
  (2,'borgo-maggiore','Borgo Maggiore','#F3A712'),
  (3,'serravalle','Serravalle','#2E86AB'),
  (4,'domagnano','Domagnano','#6A4C93'),
  (5,'fiorentino','Fiorentino','#2BA84A'),
  (6,'acquaviva','Acquaviva','#17BEBB'),
  (7,'faetano','Faetano','#E84393'),
  (8,'chiesanuova','Chiesanuova','#A1887F'),
  (9,'montegiardino','Montegiardino','#7986CB');

-- Nota: nel progetto esiste anche una vista "classifica_castelli" creata nella prima versione.
-- È stata resa sicura (security_invoker) e non è più usata dall'app: si può eliminare dal pannello Supabase.
