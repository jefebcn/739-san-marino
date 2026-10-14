-- 739 San Marino · coda delle bozze (motore dati, passo 1): tabelle e permessi.
-- Ogni dato che arriva da fuori (evento, luogo, avviso) entra in `importazioni` e va online
-- solo dopo l'approvazione di un amministratore. Applicata automaticamente (solo oggetti nuovi).
-- Le funzioni che leggono e scrivono la coda sono in 0012_coda_funzioni.sql.

create extension if not exists unaccent with schema extensions;

-- Chi può vedere e approvare la coda. Si aggiunge a mano dall'SQL Editor:
-- insert into public.amministratori (utente_id) select id from auth.users where email = '...';
create table if not exists public.amministratori (
  utente_id uuid primary key references auth.users (id) on delete cascade,
  aggiunto_il timestamptz not null default now()
);
alter table public.amministratori enable row level security;

create or replace function public.e_amministratore()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.amministratori where utente_id = auth.uid())
$$;
revoke execute on function public.e_amministratore() from public, anon;
grant execute on function public.e_amministratore() to authenticated;

-- Titolo senza accenti, maiuscole e punteggiatura: serve a riconoscere i doppioni
create or replace function public.normalizza(t text)
returns text language sql stable set search_path = '' as $$
  select trim(regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '[^a-z0-9]+', ' ', 'g'))
$$;

create table if not exists public.importazioni (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('evento', 'luogo', 'avviso')),
  -- Dati già strutturati: per un evento titolo, descrizione, inizio, fine, luogo_id, castello_id, organizzatore, metri
  dati jsonb not null default '{}'::jsonb,
  fonte text not null,
  link_fonte text,
  canale text not null check (canale in ('api', 'rss', 'email', 'contributo', 'pagina', 'accordo')),
  stato text not null default 'nuovo' check (stato in ('nuovo', 'approvato', 'scartato', 'duplicato')),
  -- Evento già pubblicato che sembra lo stesso (doppione)
  simile_a uuid references public.eventi (id) on delete set null,
  -- Evento creato all'approvazione
  elemento_id uuid references public.eventi (id) on delete set null,
  nota text,
  creato_il timestamptz not null default now(),
  deciso_il timestamptz,
  deciso_da uuid references auth.users (id) on delete set null
);
-- Lo stesso articolo di una fonte entra in coda una volta sola
create unique index if not exists importazioni_fonte_link on public.importazioni (fonte, link_fonte);
create index if not exists importazioni_stato on public.importazioni (stato, creato_il desc);
-- Nessuna policy: la coda si legge e si scrive solo con le funzioni di 0012
alter table public.importazioni enable row level security;

-- Ogni evento pubblicato mostra da dove viene
alter table public.eventi
  add column if not exists fonte text,
  add column if not exists link_fonte text;
