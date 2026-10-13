-- 739 San Marino · servizi utili: farmacie di turno, bus e funivia, raccolta rifiuti, parcheggi.
-- Solo aggiunte: nessuna colonna o tabella esistente viene tolta o cambiata.

-- Farmacie e parcheggi sono luoghi (così compaiono anche sulla mappa) con qualche dato in più.
alter table public.luoghi
  add column indirizzo text,
  add column telefono text,
  add column orari text,
  add column tariffa text,
  add column posti integer check (posti is null or posti >= 0),
  add column da_verificare boolean not null default false;

update public.luoghi set da_verificare = true where descrizione = 'Posizione da verificare';

-- Turni delle farmacie (notturni e festivi): un turno è un intervallo di tempo.
create table public.turni_farmacie (
  id uuid primary key default gen_random_uuid(),
  farmacia_id uuid not null references public.luoghi(id) on delete cascade,
  inizio timestamptz not null,
  fine timestamptz not null check (fine > inizio),
  note text,
  creato_il timestamptz not null default now()
);
create index turni_farmacie_fine_idx on public.turni_farmacie (fine);
create index turni_farmacie_farmacia_idx on public.turni_farmacie (farmacia_id);

-- Linee di trasporto e partenze. giorni: 1 = lunedì … 7 = domenica. dal/al: periodo di validità (vuoto = sempre).
create table public.linee (
  id text primary key,
  tipo text not null check (tipo in ('funivia','bus')),
  nome text not null,
  descrizione text,
  colore text not null default '#2C79AE',
  biglietto text,
  fonte text,
  da_verificare boolean not null default true,
  ordine smallint not null default 0
);

create table public.partenze (
  id uuid primary key default gen_random_uuid(),
  linea_id text not null references public.linee(id) on delete cascade,
  direzione text not null,
  ora time not null,
  giorni smallint[] not null default '{1,2,3,4,5,6,7}',
  dal date,
  al date
);
create index partenze_linea_idx on public.partenze (linea_id, ora);

-- Raccolta rifiuti per castello.
create table public.raccolta_rifiuti (
  id uuid primary key default gen_random_uuid(),
  castello_id smallint not null references public.castelli(id) on delete cascade,
  frazione text not null check (frazione in ('organico','carta','plastica','vetro','secco','verde')),
  giorni smallint[] not null,
  orario text,
  note text,
  da_verificare boolean not null default true,
  unique (castello_id, frazione)
);

alter table public.turni_farmacie enable row level security;
alter table public.linee enable row level security;
alter table public.partenze enable row level security;
alter table public.raccolta_rifiuti enable row level security;

create policy "turni visibili a tutti" on public.turni_farmacie for select using (true);
create policy "linee visibili a tutti" on public.linee for select using (true);
create policy "partenze visibili a tutti" on public.partenze for select using (true);
create policy "raccolta visibile a tutti" on public.raccolta_rifiuti for select using (true);
