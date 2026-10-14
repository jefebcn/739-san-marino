-- 739 San Marino · coda delle bozze: funzioni del pannello /admin/coda e importazione da Libertas.
-- DA APPLICARE A MANO dall'SQL Editor di Supabase (contiene insert e update): copiare il file da
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0012_coda_funzioni.sql
-- Le tabelle sono in 0011_coda_tabelle.sql (già applicata).

-- Testo leggibile da un pezzo di feed: toglie i tag HTML e decodifica le entità (&#8217;, &amp;…)
create or replace function public.testo_da_html(t text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  s text := coalesce(t, '');
  m text[];
  n integer;
begin
  -- Le sezioni CDATA arrivano così come sono: si tiene solo il contenuto
  s := regexp_replace(s, '<!\[CDATA\[(.*?)\]\]>', '\1', 'g');
  -- xpath restituisce il testo con <, > e & di nuovo codificati
  s := replace(replace(replace(replace(replace(s, '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&apos;', ''''), '&amp;', '&');
  s := regexp_replace(s, '<[^>]*>', ' ', 'g');
  loop
    m := regexp_match(s, '&#([0-9]{1,7});');
    exit when m is null;
    n := m[1]::integer;
    s := replace(s, '&#' || m[1] || ';', case when n between 1 and 1114111 then chr(n) else '' end);
  end loop;
  s := replace(replace(replace(replace(replace(replace(replace(replace(s,
    '&nbsp;', ' '), '&hellip;', '…'), '&rsquo;', '’'), '&lsquo;', '‘'), '&ldquo;', '“'), '&rdquo;', '”'), '&amp;', '&'), '&quot;', '"');
  -- WordPress chiude i riassunti con «L'articolo … proviene da …» e «[…]»
  s := regexp_replace(s, '\s*L''articolo .* proviene da .*$', '');
  s := regexp_replace(s, '\s*\[…\]\s*$', '…');
  return nullif(trim(regexp_replace(s, '\s+', ' ', 'g')), '');
end $$;

-- Data e ora dal pannello: «2026-10-17T21:00» è ora di San Marino; con il fuso indicato vale quello
create or replace function public.ora_san_marino(t text)
returns timestamptz language sql stable set search_path = '' as $$
  select case
    when nullif(trim(t), '') is null then null
    when t ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$' then (t::timestamp at time zone 'Europe/San_Marino')
    else t::timestamptz
  end
$$;

-- Bozze per stato ('nuovo', 'approvato', 'scartato'; gli scartati comprendono i doppioni), con l'eventuale doppione
create or replace function public.coda_bozze(p_stato text default 'nuovo')
returns table (
  id uuid, tipo text, dati jsonb, fonte text, link_fonte text, canale text, stato text, nota text,
  creato_il timestamptz, deciso_il timestamptz, elemento_id uuid,
  simile_id uuid, simile_titolo text, simile_inizio timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.e_amministratore() then
    raise exception 'Il pannello è riservato agli amministratori di 739.';
  end if;
  return query
  select b.id, b.tipo, b.dati, b.fonte, b.link_fonte, b.canale, b.stato, b.nota,
         b.creato_il, b.deciso_il, b.elemento_id, s.id, s.titolo, s.inizio
  from public.importazioni b
  left join lateral (
    select e.id, e.titolo, e.inizio
    from public.eventi e
    where e.id = b.simile_a
       or (b.stato = 'nuovo' and e.inizio > now() - interval '1 day'
           and public.normalizza(e.titolo) = public.normalizza(b.dati->>'titolo'))
    order by (e.id = b.simile_a) desc
    limit 1
  ) s on true
  where b.stato = p_stato or (p_stato = 'scartato' and b.stato = 'duplicato')
  order by coalesce(b.deciso_il, b.creato_il) desc
  limit 200;
end $$;

-- Quante bozze per stato, per le etichette del pannello
create or replace function public.conteggio_bozze()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_amministratore() then
    raise exception 'Il pannello è riservato agli amministratori di 739.';
  end if;
  return (
    select jsonb_build_object(
      'nuovo', count(*) filter (where stato = 'nuovo'),
      'approvato', count(*) filter (where stato = 'approvato'),
      'scartato', count(*) filter (where stato in ('scartato', 'duplicato'))
    )
    from public.importazioni
  );
end $$;

-- Pubblica una bozza di evento con i dati completati nel pannello. Restituisce l'id dell'evento creato.
create or replace function public.approva_bozza(p_id uuid, p_dati jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  b public.importazioni;
  v_titolo text;
  v_inizio timestamptz;
  v_fine timestamptz;
  v_luogo uuid;
  v_castello smallint;
  v_metri integer;
  nuovo uuid;
begin
  if not public.e_amministratore() then
    raise exception 'Il pannello è riservato agli amministratori di 739.';
  end if;
  select * into b from public.importazioni where id = p_id for update;
  if b.id is null then raise exception 'Bozza non trovata.'; end if;
  if b.stato <> 'nuovo' then raise exception 'Questa bozza è già stata decisa.'; end if;
  if b.tipo <> 'evento' then raise exception 'Per ora dal pannello si pubblicano solo eventi.'; end if;

  v_titolo := nullif(trim(p_dati->>'titolo'), '');
  if v_titolo is null then raise exception 'Manca il titolo.'; end if;
  begin
    v_inizio := public.ora_san_marino(p_dati->>'inizio');
    v_fine := public.ora_san_marino(p_dati->>'fine');
  exception when others then
    raise exception 'Data o ora non valida.';
  end;
  if v_inizio is null then raise exception 'Manca la data di inizio.'; end if;
  if v_fine is not null and v_fine < v_inizio then raise exception 'La fine è prima dell''inizio.'; end if;
  begin
    v_luogo := nullif(p_dati->>'luogo_id', '')::uuid;
    v_castello := nullif(p_dati->>'castello_id', '')::smallint;
    v_metri := coalesce(nullif(p_dati->>'metri', '')::integer, 20);
  exception when others then
    raise exception 'Luogo, castello o metri non validi.';
  end;
  if v_luogo is not null and not exists (select 1 from public.luoghi where id = v_luogo) then
    raise exception 'Luogo non trovato.';
  end if;
  if v_castello is not null and not exists (select 1 from public.castelli where id = v_castello) then
    raise exception 'Castello non trovato.';
  end if;
  if v_metri < 0 or v_metri > 500 then raise exception 'I metri vanno da 0 a 500.'; end if;
  -- Senza castello indicato vale quello del luogo
  if v_castello is null and v_luogo is not null then
    select castello_id into v_castello from public.luoghi where id = v_luogo;
  end if;

  insert into public.eventi (titolo, descrizione, inizio, fine, luogo_id, castello_id, organizzatore, metri, fonte, link_fonte)
  values (
    v_titolo, nullif(trim(p_dati->>'descrizione'), ''), v_inizio, v_fine, v_luogo, v_castello,
    nullif(trim(p_dati->>'organizzatore'), ''), v_metri, b.fonte, b.link_fonte
  )
  returning id into nuovo;

  update public.importazioni
  set stato = 'approvato', dati = b.dati || p_dati, elemento_id = nuovo, deciso_il = now(), deciso_da = auth.uid()
  where id = b.id;
  return nuovo;
end $$;

-- Scarta una bozza; con p_doppione_di la segna come doppione di un evento già pubblicato
create or replace function public.scarta_bozza(p_id uuid, p_nota text default null, p_doppione_di uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_amministratore() then
    raise exception 'Il pannello è riservato agli amministratori di 739.';
  end if;
  update public.importazioni
  set stato = case when p_doppione_di is null then 'scartato' else 'duplicato' end,
      simile_a = coalesce(p_doppione_di, simile_a),
      nota = nullif(trim(p_nota), ''),
      deciso_il = now(), deciso_da = auth.uid()
  where id = p_id and stato = 'nuovo';
  if not found then raise exception 'Bozza non trovata o già decisa.'; end if;
end $$;

-- Rimette in coda una bozza scartata per errore
create or replace function public.ripristina_bozza(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_amministratore() then
    raise exception 'Il pannello è riservato agli amministratori di 739.';
  end if;
  update public.importazioni
  set stato = 'nuovo', nota = null, deciso_il = null, deciso_da = null
  where id = p_id and stato in ('scartato', 'duplicato');
  if not found then raise exception 'Si possono rimettere in coda solo le bozze scartate.'; end if;
end $$;

revoke execute on function public.coda_bozze(text) from public, anon;
revoke execute on function public.conteggio_bozze() from public, anon;
revoke execute on function public.approva_bozza(uuid, jsonb) from public, anon;
revoke execute on function public.scarta_bozza(uuid, text, uuid) from public, anon;
revoke execute on function public.ripristina_bozza(uuid) from public, anon;
grant execute on function public.coda_bozze(text) to authenticated;
grant execute on function public.conteggio_bozze() to authenticated;
grant execute on function public.approva_bozza(uuid, jsonb) to authenticated;
grant execute on function public.scarta_bozza(uuid, text, uuid) to authenticated;
grant execute on function public.ripristina_bozza(uuid) to authenticated;

-- Articoli di Libertas su spettacoli, mostre e cultura degli ultimi 30 giorni → bozze di evento.
-- Stesso filtro di lib/stampa.ts. Data, ora e luogo li completa chi approva, leggendo l'articolo.
create or replace function public.importa_libertas()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r extensions.http_response;
  doc xml;
  n integer;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '30');
  begin
    select * into r from extensions.http((
      'GET', 'https://www.libertas.sm/feed/',
      array[extensions.http_header('User-Agent', '739SanMarino/1.0 (https://739-san-marino.vercel.app)')],
      null, null
    )::extensions.http_request);
    doc := r.content::xml;
  exception when others then
    raise warning 'Libertas non risponde o il feed non è valido (%)', sqlerrm;
    return 0;
  end;
  -- Il sito a volte risponde con una pagina di controllo anti-bot invece del feed
  if r.status <> 200 or position('<rss' in r.content) = 0 then
    raise warning 'Libertas: risposta non valida (HTTP %)', r.status;
    return 0;
  end if;

  with articoli as (
    select public.testo_da_html((xpath('/item/title/text()', i))[1]::text) as titolo,
           trim((xpath('/item/link/text()', i))[1]::text) as link,
           public.testo_da_html((xpath('/item/description/text()', i))[1]::text) as descrizione,
           ((xpath('/item/pubDate/text()', i))[1]::text)::timestamptz as pubblicato,
           array(select public.testo_da_html(c::text) from unnest(xpath('/item/category/text()', i)) c) as categorie
    -- Ogni articolo estratto diventa un documento a sé: i percorsi partono da /item
    from unnest(xpath('/rss/channel/item', doc)) i
  )
  insert into public.importazioni (tipo, dati, fonte, link_fonte, canale)
  select 'evento',
         jsonb_build_object('titolo', a.titolo, 'descrizione', a.descrizione, 'pubblicato_il', a.pubblicato, 'categorie', to_jsonb(a.categorie)),
         'Libertas', a.link, 'rss'
  from articoli a
  where a.titolo is not null
    and a.link like 'https://%'
    and a.pubblicato > now() - interval '30 days'
    and not (a.categorie && array['Politica', 'Cronaca', 'Satira', 'Rassegna stampa'])
    and a.titolo !~* '(rassegna stampa|commission[ei]|consiglio grande|congresso di stato)'
    and (
      a.categorie && array['Spettacoli', 'Cultura', 'Musica', 'Arte', 'Eventi']
      or a.titolo ~* '\m(weekend|fine settimana|eventi|appuntament\w*|mostr[ae]|concert\w*|festival|sagr[ae]|spettacol\w*|teatro|rassegn[ae]|manifestazion\w*|fest[ae]|mercatin\w*|medieval\w*|natale|halloween|capodanno)\M'
    )
  on conflict (fonte, link_fonte) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.importa_libertas() from public, anon, authenticated;

-- Due volte al giorno, alle 5.17 e alle 15.17 UTC (7.17 e 17.17 in estate a San Marino)
select cron.unschedule(jobid) from cron.job where jobname = 'importa-libertas';
select cron.schedule('importa-libertas', '17 5,15 * * *', 'select public.importa_libertas()');
