-- Avvisi personali (19/10/2026, richiesta di Alex: «avviso al gestore»). Solo oggetti nuovi.
--
-- Le notifiche del Bollettino (0029) sono uguali per tutti; questi sono avvisi per una persona sola:
-- al gestore quando arriva o si annulla una prenotazione, a chi prenota quando il centro risponde.
-- Più avanti li useranno anche premi dei metri e volontari.
--
-- Come funziona:
--   1. il telefono si iscrive con attiva_avvisi() (con l'SMR ID: l'avviso va alla persona, su tutti i suoi telefoni);
--   2. dopo un'azione, l'app chiama avvisa_prenotazione(id): il database scrive l'avviso in coda,
--      una volta sola per prenotazione e stato (chiave unica), solo se chi chiama è il cliente o il gestore;
--   3. pg_cron ogni minuto chiama manda_avvisi(): se c'è qualcosa in coda chiama /api/avvisi col segreto della
--      cassaforte (lo stesso del Bollettino), l'app chiede gli avvisi con avvisi_da_inviare(), li firma con le
--      chiavi VAPID e li manda, poi li segna con segna_avvisi(). Un avviso vale un giorno, al massimo 3 tentativi.

create table if not exists public.avvisi_telefoni (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  utente_id uuid not null references auth.users (id) on delete cascade,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  spento_il timestamptz                                   -- spento dalla persona o non più valido (niente cancellazioni)
);
create index if not exists avvisi_telefoni_per_utente on public.avvisi_telefoni (utente_id);

create table if not exists public.avvisi_personali (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users (id) on delete cascade,
  chiave text not null,                                   -- es. pren:<id>:confermata:<utente>, contro i doppioni
  titolo text not null check (char_length(titolo) <= 80),
  corpo text not null check (char_length(corpo) <= 240),
  url text not null check (url ~ '^/' and char_length(url) <= 200),
  creato_il timestamptz not null default now(),
  inviato_il timestamptz,
  tentativi integer not null default 0,
  unique (chiave)
);
create index if not exists avvisi_personali_da_inviare on public.avvisi_personali (creato_il) where inviato_il is null;

-- Nessuna regola sulle due tabelle: si usano solo con le funzioni qui sotto
alter table public.avvisi_telefoni enable row level security;
alter table public.avvisi_personali enable row level security;

-- Accende gli avvisi su questo telefono, per chi è entrato con l'SMR ID
create or replace function public.attiva_avvisi(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Per gli avvisi serve l''SMR ID.'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'Indirizzo degli avvisi non valido.'; end if;
  if char_length(coalesce(p_p256dh, '')) not between 1 and 200 or char_length(coalesce(p_auth, '')) not between 1 and 100 then
    raise exception 'Chiavi degli avvisi non valide.';
  end if;
  if not exists (select 1 from public.avvisi_telefoni where endpoint = p_endpoint and spento_il is null)
     and (select count(*) from public.avvisi_telefoni where utente_id = auth.uid() and spento_il is null) >= 10 then
    raise exception 'Hai già gli avvisi su 10 telefoni: spegnili su uno che non usi più.';
  end if;
  insert into public.avvisi_telefoni (endpoint, p256dh, auth, utente_id)
  values (p_endpoint, p_p256dh, p_auth, auth.uid())
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, utente_id = excluded.utente_id, aggiornato_il = now(), spento_il = null;
end $$;

-- Spegne gli avvisi su questo telefono (resta nella tabella con spento_il: niente cancellazioni)
create or replace function public.togli_avvisi(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  update public.avvisi_telefoni set spento_il = now() where endpoint = p_endpoint and utente_id = auth.uid() and spento_il is null;
$$;

-- Gli avvisi sono accesi su questo telefono, per questa persona?
create or replace function public.avvisi_attivi(p_endpoint text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.avvisi_telefoni where endpoint = p_endpoint and utente_id = auth.uid() and spento_il is null);
$$;

-- Mette in coda un avviso (uso interno)
create or replace function public.metti_avviso(p_utente uuid, p_chiave text, p_titolo text, p_corpo text, p_url text)
returns void language sql security definer set search_path = '' as $$
  insert into public.avvisi_personali (utente_id, chiave, titolo, corpo, url)
  values (p_utente, p_chiave, left(p_titolo, 80), left(p_corpo, 240), p_url)
  on conflict (chiave) do nothing;
$$;

-- Dopo un'azione su una prenotazione: avvisa l'altra parte. Si chiama dall'app; non manda mai due volte lo stesso avviso.
create or replace function public.avvisa_prenotazione(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.prenotazioni;
  v_luogo text;
  v_risorsa text;
  v_quando text;
  g record;
begin
  select * into p from public.prenotazioni where id = p_id;
  if p.id is null then return; end if;
  -- Solo per le azioni appena fatte (un giorno al massimo)
  if coalesce(p.deciso_il, p.creato_il) < now() - interval '1 day' then return; end if;
  select l.nome into v_luogo from public.luoghi l where l.id = p.luogo_id;
  select r.nome into v_risorsa from public.prenota_risorse r where r.id = p.risorsa_id;
  v_quando := to_char(p.inizio at time zone 'Europe/San_Marino', 'DD/MM "alle" HH24:MI');

  if auth.uid() = p.utente_id then
    -- Il cliente ha prenotato o annullato: avvisa chi gestisce il centro
    if p.stato in ('richiesta', 'confermata') or (p.stato = 'annullata' and p.annullata_da = 'cliente') then
      for g in select distinct a.utente_id from public.attivita_gestori a where a.luogo_id = p.luogo_id and a.stato = 'approvata' loop
        perform public.metti_avviso(
          g.utente_id, 'pren:' || p.id || ':' || p.stato || ':' || g.utente_id,
          case p.stato when 'richiesta' then 'Nuova richiesta di prenotazione' when 'confermata' then 'Nuova prenotazione' else 'Prenotazione annullata' end,
          v_risorsa || ', ' || v_quando || case p.stato when 'richiesta' then ': da confermare.' when 'confermata' then '.' else ': annullata dal cliente.' end,
          '/profile/attivita/' || p.luogo_id || '/prenotazioni');
      end loop;
    end if;
  elsif public.e_mio_luogo(p.luogo_id) then
    -- Il centro ha risposto: avvisa il cliente
    if p.stato in ('confermata', 'rifiutata') or (p.stato = 'annullata' and p.annullata_da = 'gestore') then
      perform public.metti_avviso(
        p.utente_id, 'pren:' || p.id || ':' || p.stato || ':' || p.utente_id,
        case p.stato when 'confermata' then 'Prenotazione confermata' when 'rifiutata' then 'Prenotazione non accettata' else 'Prenotazione annullata dal centro' end,
        v_luogo || ', ' || v_risorsa || ', ' || v_quando || case when p.stato <> 'confermata' and p.nota_gestore is not null then '. ' || p.nota_gestore else '.' end,
        '/profile/prenotazioni');
    end if;
  end if;
end $$;

-- Per l'app (/api/avvisi), solo col segreto: gli avvisi da mandare e i telefoni di chi li riceve
create or replace function public.avvisi_da_inviare(p_segreto text)
returns table (avviso_id uuid, endpoint text, p256dh text, auth text, titolo text, corpo text, url text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.segreto_notifiche_giusto(p_segreto) then raise exception 'Non autorizzato.'; end if;
  return query
    select a.id, t.endpoint, t.p256dh, t.auth, a.titolo, a.corpo, a.url
    from public.avvisi_personali a
    join public.avvisi_telefoni t on t.utente_id = a.utente_id and t.spento_il is null
    where a.inviato_il is null and a.tentativi < 3 and a.creato_il > now() - interval '1 day'
    order by a.creato_il
    limit 500;
end $$;

-- Per l'app, solo col segreto: segna gli avvisi mandati, conta i tentativi falliti, toglie i telefoni che non ci sono più
create or replace function public.segna_avvisi(p_segreto text, p_inviati uuid[], p_falliti uuid[], p_scaduti text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.segreto_notifiche_giusto(p_segreto) then raise exception 'Non autorizzato.'; end if;
  update public.avvisi_personali set inviato_il = now() where id = any (coalesce(p_inviati, '{}'));
  update public.avvisi_personali set tentativi = tentativi + 1 where id = any (coalesce(p_falliti, '{}')) and inviato_il is null;
  update public.avvisi_telefoni set spento_il = now() where endpoint = any (coalesce(p_scaduti, '{}')) and spento_il is null;
end $$;

-- Ogni minuto (pg_cron): chiama l'app solo se c'è un avviso in coda per qualcuno con un telefono iscritto
create or replace function public.manda_avvisi()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_segreto text;
  r extensions.http_response;
begin
  if not exists (
    select 1 from public.avvisi_personali a
    where a.inviato_il is null and a.tentativi < 3 and a.creato_il > now() - interval '1 day'
      and exists (select 1 from public.avvisi_telefoni t where t.utente_id = a.utente_id and t.spento_il is null)
  ) then return; end if;
  select decrypted_secret into v_segreto from vault.decrypted_secrets where name = 'notifiche_segreto';
  if v_segreto is null then return; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '30');
  select * into r from extensions.http((
    'POST', 'https://739-san-marino.vercel.app/api/avvisi',
    array[extensions.http_header('x-segreto', v_segreto)],
    'application/json', '{}'
  )::extensions.http_request);
end $$;

revoke execute on function public.attiva_avvisi(text, text, text) from public, anon;
revoke execute on function public.togli_avvisi(text) from public, anon;
revoke execute on function public.avvisi_attivi(text) from public, anon;
revoke execute on function public.metti_avviso(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.avvisa_prenotazione(uuid) from public, anon;
revoke execute on function public.avvisi_da_inviare(text) from public;
revoke execute on function public.segna_avvisi(text, uuid[], uuid[], text[]) from public;
revoke execute on function public.manda_avvisi() from public, anon, authenticated;

grant execute on function public.attiva_avvisi(text, text, text) to authenticated;
grant execute on function public.togli_avvisi(text) to authenticated;
grant execute on function public.avvisi_attivi(text) to authenticated;
grant execute on function public.avvisa_prenotazione(uuid) to authenticated;
grant execute on function public.avvisi_da_inviare(text) to anon, authenticated;
grant execute on function public.segna_avvisi(text, uuid[], uuid[], text[]) to anon, authenticated;

select cron.schedule('avvisi-739', '* * * * *', 'select public.manda_avvisi()');
