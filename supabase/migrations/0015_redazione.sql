-- 739 San Marino · ruoli della redazione (passo 0.4). Solo oggetti nuovi: applicata automaticamente.
-- Ruoli: amministratore (tabella `amministratori`, 0011), redattore e organizzatore (tabella `redazione`).
-- Gli amministratori sono anche redattori; i redattori possono fare tutto quello che fa un organizzatore.
-- Nessuna policy di scrittura: un utente non può mai darsi un ruolo da solo. Si aggiungono dall'SQL Editor:
--   insert into public.redazione (utente_id, ruolo) select id, 'redattore' from auth.users where email = '…';

create table if not exists public.redazione (
  utente_id uuid not null references auth.users (id) on delete cascade,
  ruolo text not null check (ruolo in ('redattore', 'organizzatore')),
  aggiunto_il timestamptz not null default now(),
  primary key (utente_id, ruolo)
);
alter table public.redazione enable row level security;

create or replace function public.e_redattore()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.e_amministratore()
      or exists (select 1 from public.redazione where utente_id = auth.uid() and ruolo = 'redattore')
$$;

create or replace function public.e_organizzatore()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.e_redattore()
      or exists (select 1 from public.redazione where utente_id = auth.uid() and ruolo = 'organizzatore')
$$;

-- I ruoli di chi ha fatto l'accesso, per mostrare nell'app i collegamenti giusti
create or replace function public.miei_ruoli()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'amministratore', public.e_amministratore(),
    'redattore', public.e_redattore(),
    'organizzatore', public.e_organizzatore()
  )
$$;

revoke execute on function public.e_redattore() from public, anon;
revoke execute on function public.e_organizzatore() from public, anon;
revoke execute on function public.miei_ruoli() from public, anon;
grant execute on function public.e_redattore() to authenticated;
grant execute on function public.e_organizzatore() to authenticated;
grant execute on function public.miei_ruoli() to authenticated;
