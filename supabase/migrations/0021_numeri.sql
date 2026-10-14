-- 0021: misurare (passo 0.10). Da applicare a mano dall'SQL Editor: aggiunge una colonna a `profili`.
--
-- Cosa si conserva: per ogni persona con SMR ID, il giorno in cui ha aperto 739 (uno al giorno, niente orari,
-- niente pagine viste) e la data dell'ultimo accesso nel profilo. Serve a contare chi è attivo e chi torna
-- ogni settimana. I numeri li vede solo un amministratore, e solo come totali.

alter table public.profili add column if not exists ultimo_accesso timestamptz;

create table if not exists public.accessi (
  utente_id uuid not null references auth.users (id) on delete cascade,
  giorno date not null,
  primary key (utente_id, giorno)
);
-- Nessuna policy: si scrive solo con segna_accesso() e si legge solo con numeri_739()
alter table public.accessi enable row level security;
create index if not exists accessi_giorno on public.accessi (giorno);

-- Chiamata dall'app (SessioneSync) al massimo una volta al giorno per persona
create or replace function public.segna_accesso()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oggi date := (now() at time zone 'Europe/San_Marino')::date;
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.accessi (utente_id, giorno) values (auth.uid(), v_oggi) on conflict do nothing;
  if found then
    update public.profili set ultimo_accesso = now() where id = auth.uid();
  end if;
end;
$$;

revoke all on function public.segna_accesso() from public, anon;
grant execute on function public.segna_accesso() to authenticated;

-- I numeri per /admin/numeri: solo totali, solo per gli amministratori
create or replace function public.numeri_739()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_oggi date := (now() at time zone 'Europe/San_Marino')::date;
begin
  if not public.e_amministratore() then
    raise exception 'Riservato agli amministratori' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'smr_id', (select count(*) from public.profili),
    'nuovi_7', (select count(*) from public.profili where creato_il > now() - interval '7 days'),
    'attivi_7', (select count(distinct utente_id) from public.accessi where giorno > v_oggi - 7),
    'attivi_settimana_prima', (select count(distinct utente_id) from public.accessi where giorno <= v_oggi - 7 and giorno > v_oggi - 14),
    -- Chi c'era la settimana scorsa ed è tornato in questa
    'tornati', (
      select count(distinct a.utente_id) from public.accessi a
      where a.giorno > v_oggi - 7
        and exists (select 1 from public.accessi b where b.utente_id = a.utente_id and b.giorno <= v_oggi - 7 and b.giorno > v_oggi - 14)
    ),
    'eventi_pubblicati_30', (select count(*) from public.eventi where pubblicato and creato_il > now() - interval '30 days'),
    'eventi_prossimi_30', (select count(*) from public.eventi where pubblicato and inizio >= now() and inizio < now() + interval '30 days'),
    'schede_verificate', (select count(*) from public.luoghi where not da_verificare and verificato_il is not null),
    'luoghi', (select count(*) from public.luoghi),
    -- Giorni degli ultimi 28 con un Bollettino scritto dalla redazione
    'bollettini_28', (
      select count(distinct (pubblicato_il at time zone 'Europe/San_Marino')::date) from public.contenuti
      where tipo = 'bollettino' and stato = 'pubblicato' and pubblicato_il <= now() and pubblicato_il > now() - interval '28 days'
    )
  );
end;
$$;

revoke all on function public.numeri_739() from public, anon;
grant execute on function public.numeri_739() to authenticated;
