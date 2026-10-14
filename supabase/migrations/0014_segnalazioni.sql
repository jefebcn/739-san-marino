-- 739 San Marino · «Segnala un errore» su schede ed eventi: le segnalazioni entrano nella coda delle bozze.
-- DA APPLICARE A MANO dall'SQL Editor di Supabase, DOPO la 0013 (cambia tabelle esistenti e contiene insert/update):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0014_segnalazioni.sql

-- Nuovi tipi nella coda: 'segnalazione' (questo passo) e 'contenuto' (importazione della redazione, passo 0.6)
alter table public.importazioni drop constraint if exists importazioni_tipo_check;
alter table public.importazioni add constraint importazioni_tipo_check
  check (tipo in ('evento', 'luogo', 'avviso', 'segnalazione', 'contenuto'));

alter table public.importazioni
  -- A cosa si riferisce una segnalazione
  add column if not exists luogo_id uuid references public.luoghi (id) on delete cascade,
  add column if not exists evento_id uuid references public.eventi (id) on delete cascade,
  -- Chi ha segnalato, se aveva fatto l'accesso
  add column if not exists segnalato_da uuid references auth.users (id) on delete set null,
  -- Impronta anonima per il limite anti-spam: hash dell'indirizzo IP e del giorno, mai l'IP in chiaro
  add column if not exists impronta text;
create index if not exists importazioni_impronta on public.importazioni (impronta, creato_il) where impronta is not null;

-- Chiunque può segnalare, anche senza accesso. Limiti: 5 segnalazioni al giorno per persona (o per rete
-- senza accesso), una sola al giorno sulla stessa scheda, al massimo 60 l'ora in tutto senza accesso.
create or replace function public.segnala_errore(p_luogo uuid, p_evento uuid, p_motivo text, p_testo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  ip text := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1);
  v_impronta text := md5(coalesce(nullif(trim(ip), ''), 'sconosciuto') || current_date::text);
  v_testo text := nullif(trim(p_testo), '');
  v_nome text;
begin
  if p_motivo not in ('orario', 'posizione', 'chiuso', 'altro') then raise exception 'Scegli cosa è sbagliato.'; end if;
  if (p_luogo is null) = (p_evento is null) then raise exception 'Segnalazione non valida.'; end if;
  if p_motivo = 'altro' and coalesce(length(v_testo), 0) < 5 then raise exception 'Scrivi in due parole cosa è sbagliato.'; end if;
  if length(v_testo) > 1000 then raise exception 'Il testo è troppo lungo (massimo 1000 caratteri).'; end if;

  if p_luogo is not null then
    select nome into v_nome from public.luoghi where id = p_luogo;
  else
    select titolo into v_nome from public.eventi where id = p_evento and pubblicato;
  end if;
  if v_nome is null then raise exception 'Scheda non trovata.'; end if;

  -- Limiti anti-spam
  if (select count(*) from public.importazioni
      where tipo = 'segnalazione' and creato_il > now() - interval '1 day'
        and (case when io is not null then segnalato_da = io else impronta = v_impronta end)) >= 5 then
    raise exception 'Hai già inviato molte segnalazioni oggi: grazie, riprova domani.';
  end if;
  if exists (select 1 from public.importazioni
      where tipo = 'segnalazione' and creato_il > now() - interval '1 day'
        and luogo_id is not distinct from p_luogo and evento_id is not distinct from p_evento
        and (case when io is not null then segnalato_da = io else impronta = v_impronta end)) then
    raise exception 'Hai già segnalato questa scheda oggi: la redazione la controlla.';
  end if;
  if io is null and (select count(*) from public.importazioni
      where tipo = 'segnalazione' and segnalato_da is null and creato_il > now() - interval '1 hour') >= 60 then
    raise exception 'Troppe segnalazioni in questo momento: riprova tra un po''.';
  end if;

  insert into public.importazioni (tipo, dati, fonte, canale, luogo_id, evento_id, segnalato_da, impronta)
  values (
    'segnalazione',
    jsonb_build_object('titolo', v_nome, 'motivo', p_motivo, 'testo', v_testo),
    'Segnalazione', 'contributo', p_luogo, p_evento, io, v_impronta
  );
end $$;

revoke execute on function public.segnala_errore(uuid, uuid, text, text) from public;
grant execute on function public.segnala_errore(uuid, uuid, text, text) to anon, authenticated;

-- La coda ora distingue le segnalazioni ('segnalazioni') dalle bozze da pubblicare ('nuovo')
-- e dice a cosa si riferiscono e chi le ha inviate. Cambia il risultato: va ricreata.
drop function if exists public.coda_bozze(text);
create function public.coda_bozze(p_stato text default 'nuovo')
returns table (
  id uuid, tipo text, dati jsonb, fonte text, link_fonte text, canale text, stato text, nota text,
  creato_il timestamptz, deciso_il timestamptz, elemento_id uuid,
  simile_id uuid, simile_titolo text, simile_inizio timestamptz,
  luogo_id uuid, evento_id uuid, segnalato_da text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.e_amministratore() then
    raise exception 'Il pannello è riservato agli amministratori di 739.';
  end if;
  return query
  select b.id, b.tipo, b.dati, b.fonte, b.link_fonte, b.canale, b.stato, b.nota,
         b.creato_il, b.deciso_il, b.elemento_id, s.id, s.titolo, s.inizio,
         b.luogo_id, b.evento_id,
         case when b.segnalato_da is null then null
              else coalesce(nullif(p.nome, ''), 'SMR ID ' || p.tessera, 'SMR ID') end
  from public.importazioni b
  left join public.profili p on p.id = b.segnalato_da
  left join lateral (
    select e.id, e.titolo, e.inizio
    from public.eventi e
    where e.id = b.simile_a
       or (b.stato = 'nuovo' and b.tipo = 'evento' and e.inizio > now() - interval '1 day'
           and public.normalizza(e.titolo) = public.normalizza(b.dati->>'titolo'))
    order by (e.id = b.simile_a) desc
    limit 1
  ) s on true
  where case p_stato
    when 'nuovo' then b.stato = 'nuovo' and b.tipo <> 'segnalazione'
    when 'segnalazioni' then b.stato = 'nuovo' and b.tipo = 'segnalazione'
    when 'scartato' then b.stato in ('scartato', 'duplicato')
    else b.stato = p_stato
  end
  order by coalesce(b.deciso_il, b.creato_il) desc
  limit 200;
end $$;
revoke execute on function public.coda_bozze(text) from public, anon;
grant execute on function public.coda_bozze(text) to authenticated;

create or replace function public.conteggio_bozze()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_amministratore() then
    raise exception 'Il pannello è riservato agli amministratori di 739.';
  end if;
  return (
    select jsonb_build_object(
      'nuovo', count(*) filter (where stato = 'nuovo' and tipo <> 'segnalazione'),
      'segnalazioni', count(*) filter (where stato = 'nuovo' and tipo = 'segnalazione'),
      'approvato', count(*) filter (where stato = 'approvato'),
      'scartato', count(*) filter (where stato in ('scartato', 'duplicato'))
    )
    from public.importazioni
  );
end $$;

-- «Corretto» (la redazione ha sistemato il dato: la scheda risulta controllata oggi) o «Ignora»
create or replace function public.chiudi_segnalazione(p_id uuid, p_corretta boolean, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b public.importazioni;
begin
  if not public.e_amministratore() then
    raise exception 'Il pannello è riservato agli amministratori di 739.';
  end if;
  select * into b from public.importazioni where id = p_id and tipo = 'segnalazione' and stato = 'nuovo' for update;
  if b.id is null then raise exception 'Segnalazione non trovata o già chiusa.'; end if;
  update public.importazioni
  set stato = case when p_corretta then 'approvato' else 'scartato' end,
      nota = nullif(trim(p_nota), ''), deciso_il = now(), deciso_da = auth.uid()
  where id = b.id;
  if p_corretta and b.luogo_id is not null then
    update public.luoghi set verificato_il = current_date where id = b.luogo_id;
  end if;
end $$;
revoke execute on function public.chiudi_segnalazione(uuid, boolean, text) from public, anon;
grant execute on function public.chiudi_segnalazione(uuid, boolean, text) to authenticated;
