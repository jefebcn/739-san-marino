-- 0029: notifiche dell'app installata (passo 1.6). Crea solo oggetti nuovi.
--
-- Chi le vuole le accende dalla pagina del Bollettino, dal profilo o dopo il primo check-in (mai all'apertura):
-- due interruttori, Bollettino (ogni mattina alle 7:39) e Weekend (il venerdì mattina, al posto del Bollettino).
-- Al massimo una notifica al giorno per telefono (ultimo_invio).
-- Ogni telefono è identificato dal suo endpoint di Web Push, che conosce solo lui: niente account obbligatorio.
--
-- Invio: pg_cron alle 5:39 e alle 6:39 UTC chiama manda_notifiche(), che parte solo quando a San Marino sono le 7
-- (così vale con l'ora legale e con quella solare) e chiama l'app (/api/notifiche) col segreto della cassaforte.
-- L'app chiede al database le iscrizioni da avvisare (notifiche_da_inviare, solo con quel segreto), firma e
-- manda le notifiche con le chiavi VAPID di Vercel, poi segna le inviate e toglie gli indirizzi scaduti.
-- Il segreto si crea qui sotto e non lo vede nessuno: lo usano solo il database e la sua chiamata.

create table if not exists public.notifiche_iscrizioni (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  utente_id uuid references public.profili (id) on delete set null,
  bollettino boolean not null default true,
  weekend boolean not null default true,
  ultimo_invio date,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
-- Nessuna regola: si usa solo con le funzioni qui sotto
alter table public.notifiche_iscrizioni enable row level security;

-- Accende o aggiorna le notifiche di questo telefono
create or replace function public.iscrivi_notifiche(p_endpoint text, p_p256dh text, p_auth text, p_bollettino boolean default true, p_weekend boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_endpoint is null or p_endpoint !~ '^https://' then raise exception 'Indirizzo delle notifiche non valido.'; end if;
  if not exists (select 1 from public.notifiche_iscrizioni where endpoint = p_endpoint)
     and (select count(*) from public.notifiche_iscrizioni where creato_il > now() - interval '1 hour') >= 500 then
    raise exception 'Troppe richieste in questo momento: riprova tra poco.';
  end if;
  insert into public.notifiche_iscrizioni (endpoint, p256dh, auth, utente_id, bollettino, weekend)
  values (p_endpoint, p_p256dh, p_auth, auth.uid(), coalesce(p_bollettino, true), coalesce(p_weekend, true))
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh, auth = excluded.auth,
    utente_id = coalesce(excluded.utente_id, public.notifiche_iscrizioni.utente_id),
    bollettino = excluded.bollettino, weekend = excluded.weekend, aggiornato_il = now();
end $$;

-- Spegne le notifiche di questo telefono
create or replace function public.togli_notifiche(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.notifiche_iscrizioni where endpoint = p_endpoint;
$$;

-- Le scelte di questo telefono (per mostrare gli interruttori come sono)
create or replace function public.mie_notifiche(p_endpoint text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('bollettino', bollettino, 'weekend', weekend) from public.notifiche_iscrizioni where endpoint = p_endpoint;
$$;

-- ——— Invio, solo con il segreto della cassaforte ———

create or replace function public.segreto_notifiche_giusto(p_segreto text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_segreto, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'notifiche_segreto' and decrypted_secret = p_segreto
  );
$$;

-- Chi avvisare oggi e con cosa: il venerdì chi vuole il weekend riceve quello, gli altri il Bollettino
create or replace function public.notifiche_da_inviare(p_segreto text)
returns table (id uuid, endpoint text, p256dh text, auth text, tipo text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_oggi date := (now() at time zone 'Europe/San_Marino')::date;
  v_venerdi boolean := extract(isodow from (now() at time zone 'Europe/San_Marino')) = 5;
begin
  if not public.segreto_notifiche_giusto(p_segreto) then raise exception 'Non autorizzato.'; end if;
  return query
    select n.id, n.endpoint, n.p256dh, n.auth,
           case when v_venerdi and n.weekend then 'weekend' else 'bollettino' end
    from public.notifiche_iscrizioni n
    where n.ultimo_invio is distinct from v_oggi
      and ((v_venerdi and n.weekend) or n.bollettino);
end $$;

-- Dopo l'invio: segna chi l'ha ricevuta oggi e toglie gli indirizzi che il telefono non accetta più
create or replace function public.segna_notifiche(p_segreto text, p_inviate uuid[], p_scadute uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.segreto_notifiche_giusto(p_segreto) then raise exception 'Non autorizzato.'; end if;
  update public.notifiche_iscrizioni set ultimo_invio = (now() at time zone 'Europe/San_Marino')::date
  where id = any(coalesce(p_inviate, '{}'));
  delete from public.notifiche_iscrizioni where id = any(coalesce(p_scadute, '{}'));
end $$;

-- Il segreto: creato una volta, a caso, e mai scritto da nessuna parte
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'notifiche_segreto') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'notifiche_segreto', 'Segreto tra pg_cron e /api/notifiche (0029)');
  end if;
end $$;

-- Chiamata all'app: parte solo se a San Marino sono le 7 (il cron gira alle 5:39 e alle 6:39 UTC)
create or replace function public.manda_notifiche()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_segreto text;
  r extensions.http_response;
begin
  if extract(hour from (now() at time zone 'Europe/San_Marino')) <> 7 then return; end if;
  select decrypted_secret into v_segreto from vault.decrypted_secrets where name = 'notifiche_segreto';
  if v_segreto is null then return; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '60');
  select * into r from extensions.http((
    'POST', 'https://739-san-marino.vercel.app/api/notifiche',
    array[extensions.http_header('x-segreto', v_segreto)],
    'application/json', '{}'
  )::extensions.http_request);
  raise log 'notifiche 739: risposta %', r.status;
end $$;

revoke execute on function public.iscrivi_notifiche(text, text, text, boolean, boolean) from public;
revoke execute on function public.togli_notifiche(text) from public;
revoke execute on function public.mie_notifiche(text) from public;
revoke execute on function public.segreto_notifiche_giusto(text) from public, anon, authenticated;
revoke execute on function public.notifiche_da_inviare(text) from public;
revoke execute on function public.segna_notifiche(text, uuid[], uuid[]) from public;
revoke execute on function public.manda_notifiche() from public, anon, authenticated;

grant execute on function public.iscrivi_notifiche(text, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.togli_notifiche(text) to anon, authenticated;
grant execute on function public.mie_notifiche(text) to anon, authenticated;
-- L'app le chiama con la chiave pubblica: le protegge il segreto
grant execute on function public.notifiche_da_inviare(text) to anon, authenticated;
grant execute on function public.segna_notifiche(text, uuid[], uuid[]) to anon, authenticated;

select cron.schedule('notifiche-739', '39 5,6 * * *', 'select public.manda_notifiche()');
