-- 739 San Marino · avvisi (passo 0.7): strade chiuse, servizi sospesi, allerte meteo, cambi di programma.
-- Solo oggetti nuovi: applicata automaticamente. Modificare ed eliminare un avviso arrivano con la 0019
-- (l'applicazione automatica chiede conferma per quelle regole). Gli avvisi arrivano anche dalla coda (tipo 'avviso').

create table if not exists public.avvisi (
  id uuid primary key default gen_random_uuid(),
  titolo text not null check (length(trim(titolo)) between 3 and 140),
  testo text,
  tipo text not null default 'altro' check (tipo in ('strada', 'servizio', 'meteo', 'evento', 'altro')),
  -- Vuoto = tutto il territorio
  castello_id smallint references public.castelli (id),
  -- Dove: un luogo della mappa oppure un punto (es. una strada chiusa)
  luogo_id uuid references public.luoghi (id) on delete set null,
  lat double precision,
  lng double precision,
  dal timestamptz not null default now(),
  -- Vuoto = finché non viene chiuso
  al timestamptz,
  gravita text not null default 'info' check (gravita in ('info', 'attenzione')),
  fonte_nome text,
  fonte_link text,
  autore uuid default auth.uid() references auth.users (id) on delete set null,
  creato_il timestamptz not null default now(),
  check (al is null or al >= dal),
  check ((lat is null) = (lng is null))
);
create index if not exists avvisi_periodo on public.avvisi (dal, al);

alter table public.avvisi enable row level security;

create policy "avvisi visibili a tutti" on public.avvisi
  for select to anon, authenticated using (true);

create policy "la redazione crea avvisi" on public.avvisi
  for insert to authenticated with check (public.e_redattore());

grant select on public.avvisi to anon, authenticated;
grant insert on public.avvisi to authenticated;
