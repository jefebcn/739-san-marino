-- 739 San Marino · contenuti editoriali (passo 0.5): Bollettino, rubriche, liste, storie, speciali.
-- Solo oggetti nuovi: applicata automaticamente. Le regole di modifica e cancellazione sono nella 0017
-- (l'applicazione automatica chiede una conferma per quelle).
-- Lettura pubblica solo dei contenuti pubblicati con data già passata (così si programmano per data e ora);
-- la redazione (e_redattore(), 0015) legge e scrive tutto.

create table if not exists public.contenuti (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in (
    'bollettino', 'castello_settimana', 'come_si_fa', 'weekend', 'partite_settimana',
    'vetta_mese', 'lista', 'storia', 'speciale'
  )),
  titolo text not null check (length(trim(titolo)) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sommario text,
  -- Testo in markdown
  corpo text not null default '',
  area text check (area is null or area in ('vivere', 'uscire', 'sport', 'comunita', 'lavorare')),
  castello_id smallint references public.castelli (id),
  foto_url text,
  foto_credito text,
  -- Luoghi ed eventi collegati, mostrati in fondo al contenuto
  luoghi uuid[] not null default '{}',
  eventi uuid[] not null default '{}',
  -- Data di pubblicazione: se è nel futuro il contenuto è programmato e compare da solo a quell'ora
  pubblicato_il timestamptz,
  stato text not null default 'bozza' check (stato in ('bozza', 'pubblicato')),
  autore uuid default auth.uid() references auth.users (id) on delete set null,
  fonte_nome text,
  fonte_link text,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  check (stato = 'bozza' or pubblicato_il is not null)
);
create index if not exists contenuti_tipo_data on public.contenuti (tipo, pubblicato_il desc);

alter table public.contenuti enable row level security;

create policy "contenuti pubblicati visibili a tutti" on public.contenuti
  for select to anon, authenticated
  using (stato = 'pubblicato' and pubblicato_il <= now());

create policy "la redazione legge tutto" on public.contenuti
  for select to authenticated using (public.e_redattore());

create policy "la redazione crea" on public.contenuti
  for insert to authenticated with check (public.e_redattore());

grant select on public.contenuti to anon, authenticated;
grant insert on public.contenuti to authenticated;
