-- 0038: luoghi da Overture Maps, con un'area di appoggio e la pubblicazione controllata (prova su San Marino).
-- Overture (Linux Foundation: Meta, Microsoft, Amazon, TomTom…) pubblica ogni mese i luoghi del mondo con licenza
-- aperta (CDLA Permissive 2.0). A San Marino ne ha circa 2.160 contro i 413 di 739: soprattutto negozi, aziende,
-- artigiani e professionisti, quelli che OpenStreetMap non ha.
-- Come funziona:
--   1. scripts/overture.py estrae l'area (pochi secondi) e scrive un file JSON;
--   2. un amministratore lo carica in /admin/fonti: i luoghi entrano in `luoghi_candidati`, NON sulla mappa;
--   3. confronta_candidati() segna i doppioni (stesso nome o stesso telefono vicino a un luogo che c'è già);
--   4. l'amministratore pubblica quelli che vuole (uno per uno o per affidabilità): diventano luoghi con
--      fonte 'overture', «Da verificare» e l'attribuzione nella scheda; può ritirarli in ogni momento.
-- Le schede inserite a mano, quelle di OSM e quelle gestite dai titolari non vengono mai riscritte.
-- Se OSM aggiunge lo stesso posto, pulisci_doppioni_overture() (ogni notte dopo OSM) toglie la copia di Overture.
-- Richiede la 0037 (PostGIS, pg_trgm, testo_norm). Non distruttiva.
-- DA APPLICARE A MANO dall'SQL Editor (sostituisce aggiorna_luoghi_osm() e crea due job di pg_cron):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0038_fonti_overture.sql
--
-- Per tornare indietro:
--   delete from public.luoghi l where l.fonte = 'overture'
--     and not exists (select 1 from public.attivita_gestori g where g.luogo_id = l.id and g.stato = 'approvata');
--   select cron.unschedule('pulisci-overture'); select cron.unschedule('pulisci-overture-2');
--   drop table public.luoghi_candidati;   -- e le funzioni qui sotto
--   (aggiorna_luoghi_osm() torna quella della 0034 rilanciandone il testo)

create table if not exists public.luoghi_candidati (
  id uuid primary key default gen_random_uuid(),
  fonte text not null default 'overture',
  id_esterno text not null,
  release text,
  nome text not null check (char_length(nome) between 1 and 120),
  categoria text not null,
  sottocategoria text,
  area text,
  lat double precision not null check (lat between 43.89 and 43.995),
  lng double precision not null check (lng between 12.40 and 12.52),
  posizione extensions.geography(Point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  indirizzo text,
  telefono text,
  sito text,
  confidenza numeric(4, 3),
  fonti text[],               -- da dove l'ha preso Overture: meta, Microsoft, Foursquare…
  licenza text,
  tassonomia text,            -- la categoria originale di Overture, per chi controlla
  aggiornato_fonte timestamptz,
  qualita smallint,           -- 0-100: affidabilità di Overture più telefono, sito, indirizzo e più fonti
  stato text not null default 'nuovo' check (stato in ('nuovo', 'doppione', 'pubblicato', 'scartato')),
  simile_a uuid references public.luoghi (id) on delete set null,
  distanza_m integer,
  motivo text,
  luogo_id uuid references public.luoghi (id) on delete set null,
  caricato_il timestamptz not null default now(),
  aggiornato_il timestamptz,
  deciso_da uuid references auth.users (id) on delete set null,
  deciso_il timestamptz,
  unique (fonte, id_esterno)
);
create index if not exists luoghi_candidati_stato on public.luoghi_candidati (stato, categoria);
create index if not exists luoghi_candidati_posizione on public.luoghi_candidati using gist (posizione);
-- Nessuna regola: si usa solo con le funzioni qui sotto
alter table public.luoghi_candidati enable row level security;

-- Le cifre di un telefono senza prefisso internazionale, per confrontare «+39 0549 99 97 92» con «0549999792»
create or replace function public.cifre_telefono(t text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select nullif(right(regexp_replace(coalesce(t, ''), '[^0-9]', '', 'g'), 8), '')
$$;

-- Due nomi sono dello stesso posto? Simili (trigrammi) oppure uno contiene l'altro, se il più corto ha almeno 5 lettere:
-- «Al Passetto» = «Al Passetto Ristorante Pizzeria», «Inorout» = «In or Out», ma «Bar» non basta per dire «Bar Centrale».
create or replace function public.nomi_simili(a text, b text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  with n as (select public.testo_norm(a) as x, public.testo_norm(b) as y)
  select extensions.similarity(x, y) >= 0.45
      or regexp_replace(x, '[^a-z0-9]', '', 'g') = regexp_replace(y, '[^a-z0-9]', '', 'g')
      or (least(char_length(x), char_length(y)) >= 5
          and greatest(extensions.word_similarity(x, y), extensions.word_similarity(y, x)) >= 0.9)
  from n
$$;

-- Segna i doppioni tra i candidati non ancora decisi: un luogo di 739 entro 120 m con un nome simile,
-- oppure con lo stesso telefono entro 400 m; e lo stesso posto due volte dentro la fonte (si tiene il migliore).
create or replace function public.confronta_candidati()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.luoghi_candidati set stato = 'nuovo', simile_a = null, distanza_m = null, motivo = null
  where stato = 'doppione' and deciso_da is null;

  with somiglianze as (
    select distinct on (c.id) c.id, l.id as luogo, round(extensions.st_distance(c.posizione, l.posizione))::integer as metri,
      case when public.cifre_telefono(c.telefono) is not null and public.cifre_telefono(c.telefono) = public.cifre_telefono(l.telefono)
           then 'stesso telefono' else 'nome simile' end as perche
    from public.luoghi_candidati c
    join public.luoghi l
      on extensions.st_dwithin(c.posizione, l.posizione, 400)
     and not (l.fonte = c.fonte and l.id_esterno = c.id_esterno)
     and (
       (extensions.st_dwithin(c.posizione, l.posizione, 120) and public.nomi_simili(c.nome, l.nome))
       or (public.cifre_telefono(c.telefono) is not null and public.cifre_telefono(c.telefono) = public.cifre_telefono(l.telefono))
     )
    where c.stato = 'nuovo'
    order by c.id, extensions.similarity(public.testo_norm(c.nome), public.testo_norm(l.nome)) desc, extensions.st_distance(c.posizione, l.posizione)
  )
  update public.luoghi_candidati c set stato = 'doppione', simile_a = s.luogo, distanza_m = s.metri,
    motivo = case s.perche when 'stesso telefono' then 'Stesso telefono di un luogo che c''è già' else 'Nome simile a un luogo che c''è già, a ' || s.metri || ' m' end
  from somiglianze s where s.id = c.id;

  -- Lo stesso posto due volte nella fonte (stesso nome entro 60 m): resta quello con la qualità più alta
  update public.luoghi_candidati c set stato = 'doppione', motivo = 'Ripetuto nella fonte'
  where c.stato = 'nuovo' and exists (
    select 1 from public.luoghi_candidati d
    where d.id <> c.id and d.fonte = c.fonte and d.stato in ('nuovo', 'pubblicato')
      and public.testo_norm(d.nome) = public.testo_norm(c.nome)
      and extensions.st_dwithin(d.posizione, c.posizione, 60)
      and (coalesce(d.qualita, 0), d.id_esterno) > (coalesce(c.qualita, 0), c.id_esterno)
  );

  select count(*) into n from public.luoghi_candidati where stato = 'doppione';
  return n;
end $$;

-- Carica (o aggiorna) i candidati di una fonte. Solo amministratori. p = il file di scripts/overture.py
-- (anche a pezzi: { fonte, release, candidati: [...] }). I luoghi già pubblicati si aggiornano anche sulla mappa,
-- tranne quelli che gestisce un titolare.
create or replace function public.carica_candidati(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_fonte text := coalesce(nullif(p->>'fonte', ''), 'overture');
  v_release text := p->>'release';
  v_validi integer;
  v_letti integer := jsonb_array_length(coalesce(p->'candidati', '[]'::jsonb));
  v_nuovi integer;
  v_luoghi integer;
begin
  if not public.e_amministratore() then raise exception 'Riservato agli amministratori.'; end if;
  if v_fonte not in ('overture') then raise exception 'Fonte non prevista: %', v_fonte; end if;
  if v_letti > 3000 then raise exception 'Al massimo 3000 luoghi per volta.'; end if;

  create temporary table if not exists pg_temp.nuovi_candidati (like public.luoghi_candidati including defaults) on commit drop;
  insert into pg_temp.nuovi_candidati (fonte, id_esterno, release, nome, categoria, sottocategoria, area, lat, lng, indirizzo, telefono, sito,
                                       confidenza, fonti, licenza, tassonomia, aggiornato_fonte, qualita)
  select v_fonte, x.id_esterno, v_release, left(trim(x.nome), 120), x.categoria, nullif(x.sottocategoria, ''), x.area, x.lat, x.lng,
         left(nullif(trim(x.indirizzo), ''), 200), left(nullif(trim(x.telefono), ''), 30),
         case when x.sito ~ '^https?://' and char_length(x.sito) <= 500 then x.sito end,
         least(greatest(coalesce(x.confidenza, 0), 0), 1), x.fonti, left(x.licenza, 40), left(x.tassonomia, 80),
         case when x.aggiornato ~ '^\d{4}-\d{2}-\d{2}' then x.aggiornato::timestamptz end,
         round(least(greatest(coalesce(x.confidenza, 0), 0), 1) * 60
           + case when nullif(trim(x.telefono), '') is not null then 15 else 0 end
           + case when x.sito ~ '^https?://' then 10 else 0 end
           + case when nullif(trim(x.indirizzo), '') is not null then 10 else 0 end
           + case when cardinality(x.fonti) > 1 then 5 else 0 end)::smallint
  from jsonb_to_recordset(coalesce(p->'candidati', '[]'::jsonb)) as x(
    id_esterno text, nome text, categoria text, sottocategoria text, area text, lat double precision, lng double precision,
    indirizzo text, telefono text, sito text, confidenza numeric, fonti text[], licenza text, tassonomia text, aggiornato text)
  where nullif(trim(x.id_esterno), '') is not null and nullif(trim(x.nome), '') is not null
    and x.lat between 43.89 and 43.995 and x.lng between 12.40 and 12.52
    and x.categoria in ('locale', 'negozio', 'azienda', 'professionista', 'artigiano', 'impianto')
    and (x.categoria = 'impianto' or x.sottocategoria = any (public.tipi_attivita(x.categoria)));
  get diagnostics v_validi = row_count;

  insert into public.luoghi_candidati (fonte, id_esterno, release, nome, categoria, sottocategoria, area, lat, lng, indirizzo, telefono, sito,
                                       confidenza, fonti, licenza, tassonomia, aggiornato_fonte, qualita)
  select fonte, id_esterno, release, nome, categoria, sottocategoria, area, lat, lng, indirizzo, telefono, sito,
         confidenza, fonti, licenza, tassonomia, aggiornato_fonte, qualita
  from pg_temp.nuovi_candidati
  on conflict (fonte, id_esterno) do update set
    release = excluded.release, nome = excluded.nome, categoria = excluded.categoria, sottocategoria = excluded.sottocategoria,
    area = excluded.area, lat = excluded.lat, lng = excluded.lng, indirizzo = excluded.indirizzo, telefono = excluded.telefono,
    sito = excluded.sito, confidenza = excluded.confidenza, fonti = excluded.fonti, licenza = excluded.licenza,
    tassonomia = excluded.tassonomia, aggiornato_fonte = excluded.aggiornato_fonte, qualita = excluded.qualita, aggiornato_il = now();
  select count(*) into v_nuovi from public.luoghi_candidati c join pg_temp.nuovi_candidati n using (fonte, id_esterno) where c.aggiornato_il is null;

  -- Aggiornamento periodico: i luoghi già pubblicati prendono i dati nuovi (mai quelli gestiti da un titolare)
  update public.luoghi l set nome = c.nome, categoria = c.categoria, sottocategoria = c.sottocategoria, area = c.area,
    lat = c.lat, lng = c.lng, indirizzo = c.indirizzo, telefono = c.telefono, sito = c.sito, aggiornato_il = now()
  from public.luoghi_candidati c join pg_temp.nuovi_candidati n using (fonte, id_esterno)
  where c.stato = 'pubblicato' and l.id = c.luogo_id and l.fonte = c.fonte
    and not exists (select 1 from public.attivita_gestori g where g.luogo_id = l.id and g.stato = 'approvata');
  get diagnostics v_luoghi = row_count;

  perform public.confronta_candidati();
  return jsonb_build_object('letti', v_letti, 'validi', v_validi, 'nuovi', v_nuovi, 'aggiornati', v_validi - v_nuovi, 'luoghi_aggiornati', v_luoghi);
end $$;

-- Pubblica sulla mappa i candidati scelti (p_ids) oppure, senza scelta, quelli nuovi con qualità almeno p_qualita
-- (e delle categorie indicate). Diventano luoghi «Da verificare» con la fonte e la licenza. Solo amministratori.
create or replace function public.pubblica_candidati(p_ids uuid[] default null, p_qualita integer default 75, p_categorie text[] default null, p_limite integer default 300)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if not public.e_amministratore() then raise exception 'Riservato agli amministratori.'; end if;
  perform public.confronta_candidati();
  with scelti as (
    select c.* from public.luoghi_candidati c
    where c.stato = 'nuovo'
      and (case when p_ids is not null then c.id = any (p_ids) else coalesce(c.qualita, 0) >= coalesce(p_qualita, 75) end)
      and (p_categorie is null or cardinality(p_categorie) = 0 or c.categoria = any (p_categorie))
    order by c.qualita desc nulls last, c.nome
    limit least(greatest(coalesce(p_limite, 300), 1), 2000)
  ), inseriti as (
    insert into public.luoghi (fonte, id_esterno, nome, categoria, sottocategoria, area, lat, lng, indirizzo, telefono, sito,
                               fonte_nome, fonte_link, da_verificare, aggiornato_il)
    select s.fonte, s.id_esterno, s.nome, s.categoria, s.sottocategoria, s.area, s.lat, s.lng, s.indirizzo, s.telefono, s.sito,
           'Overture Maps Foundation (' || coalesce(s.licenza, 'CDLA-Permissive-2.0') || ')', 'https://docs.overturemaps.org/attribution/', true, now()
    from scelti s
    on conflict (fonte, id_esterno) do nothing
    returning id, fonte, id_esterno
  )
  update public.luoghi_candidati c set stato = 'pubblicato', luogo_id = i.id, deciso_da = auth.uid(), deciso_il = now()
  from inseriti i where c.fonte = i.fonte and c.id_esterno = i.id_esterno;
  get diagnostics n = row_count;
  return n;
end $$;

-- Scarta dei candidati; se erano già pubblicati li ritira dalla mappa (mai le schede gestite da un titolare)
create or replace function public.scarta_candidati(p_ids uuid[], p_motivo text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if not public.e_amministratore() then raise exception 'Riservato agli amministratori.'; end if;
  delete from public.luoghi l using public.luoghi_candidati c
  where c.id = any (p_ids) and c.stato = 'pubblicato' and l.id = c.luogo_id and l.fonte = c.fonte
    and not exists (select 1 from public.attivita_gestori g where g.luogo_id = l.id and g.stato = 'approvata');
  update public.luoghi_candidati set stato = 'scartato', luogo_id = null, motivo = coalesce(nullif(trim(p_motivo), ''), motivo),
    deciso_da = auth.uid(), deciso_il = now()
  where id = any (p_ids) and stato <> 'scartato';
  get diagnostics n = row_count;
  return n;
end $$;

-- Rimette in «nuovi» dei candidati scartati o segnati come doppioni per errore
create or replace function public.rimetti_candidati(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if not public.e_amministratore() then raise exception 'Riservato agli amministratori.'; end if;
  update public.luoghi_candidati set stato = 'nuovo', simile_a = null, distanza_m = null, motivo = null, deciso_da = null, deciso_il = null
  where id = any (p_ids) and stato in ('scartato', 'doppione');
  get diagnostics n = row_count;
  return n;
end $$;

-- Redazione: quanti candidati ci sono, per stato e categoria, e dati dell'ultimo caricamento
create or replace function public.riepilogo_candidati()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  return jsonb_build_object(
    'per_stato', (select coalesce(jsonb_object_agg(stato, n), '{}') from (select stato, count(*) n from public.luoghi_candidati group by stato) x),
    'nuovi_per_categoria', (select coalesce(jsonb_object_agg(categoria, n), '{}') from (select categoria, count(*) n from public.luoghi_candidati where stato = 'nuovo' group by categoria) x),
    'nuovi_per_qualita', (select coalesce(jsonb_object_agg(fascia, n), '{}') from (
      select case when qualita >= 85 then '85+' when qualita >= 75 then '75-84' when qualita >= 60 then '60-74' else 'meno di 60' end fascia, count(*) n
      from public.luoghi_candidati where stato = 'nuovo' group by 1) x),
    'release', (select max(release) from public.luoghi_candidati),
    'ultimo_caricamento', (select max(coalesce(aggiornato_il, caricato_il)) from public.luoghi_candidati)
  );
end $$;

-- Redazione: l'elenco dei candidati, con il luogo simile per i doppioni
create or replace function public.elenco_candidati(p_stato text default 'nuovo', p_categoria text default null, p_qualita integer default 0, p_limite integer default 100, p_offset integer default 0)
returns table (id uuid, nome text, categoria text, sottocategoria text, lat double precision, lng double precision, indirizzo text, telefono text, sito text,
               confidenza numeric, qualita smallint, fonti text[], tassonomia text, stato text, motivo text, simile_a uuid, simile_nome text, distanza_m integer, luogo_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  return query
    select c.id, c.nome, c.categoria, c.sottocategoria, c.lat, c.lng, c.indirizzo, c.telefono, c.sito, c.confidenza, c.qualita, c.fonti, c.tassonomia,
           c.stato, c.motivo, c.simile_a, l.nome, c.distanza_m, c.luogo_id
    from public.luoghi_candidati c left join public.luoghi l on l.id = c.simile_a
    where c.stato = coalesce(p_stato, 'nuovo') and (p_categoria is null or c.categoria = p_categoria) and coalesce(c.qualita, 0) >= coalesce(p_qualita, 0)
    order by c.qualita desc nulls last, c.nome
    limit least(greatest(coalesce(p_limite, 100), 1), 500) offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Ogni notte, dopo OpenStreetMap: se un luogo di Overture ha ormai una copia in OSM, a mano o da un titolare
-- (nome simile entro 80 m), si toglie quello di Overture. OSM resta la fonte preferita.
create or replace function public.pulisci_doppioni_overture()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  with doppi as (
    select distinct on (o.id) o.id, a.id as altro, round(extensions.st_distance(o.posizione, a.posizione))::integer as metri
    from public.luoghi o
    join public.luoghi a on a.fonte <> 'overture' and extensions.st_dwithin(o.posizione, a.posizione, 80)
      and public.nomi_simili(o.nome, a.nome)
    where o.fonte = 'overture'
      and not exists (select 1 from public.attivita_gestori g where g.luogo_id = o.id and g.stato = 'approvata')
    order by o.id, extensions.st_distance(o.posizione, a.posizione)
  ), segnati as (
    update public.luoghi_candidati c set stato = 'doppione', simile_a = d.altro, distanza_m = d.metri, luogo_id = null,
      motivo = 'Arrivato anche da un''altra fonte: tolto da Overture'
    from doppi d where c.luogo_id = d.id
    returning d.id
  )
  delete from public.luoghi l using doppi d where l.id = d.id;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.confronta_candidati() from public, anon, authenticated;
revoke execute on function public.pulisci_doppioni_overture() from public, anon, authenticated;
revoke execute on function public.carica_candidati(jsonb) from public, anon;
revoke execute on function public.pubblica_candidati(uuid[], integer, text[], integer) from public, anon;
revoke execute on function public.scarta_candidati(uuid[], text) from public, anon;
revoke execute on function public.rimetti_candidati(uuid[]) from public, anon;
revoke execute on function public.riepilogo_candidati() from public, anon;
revoke execute on function public.elenco_candidati(text, text, integer, integer, integer) from public, anon;
grant execute on function public.carica_candidati(jsonb) to authenticated;
grant execute on function public.pubblica_candidati(uuid[], integer, text[], integer) to authenticated;
grant execute on function public.scarta_candidati(uuid[], text) to authenticated;
grant execute on function public.rimetti_candidati(uuid[]) to authenticated;
grant execute on function public.riepilogo_candidati() to authenticated;
grant execute on function public.elenco_candidati(text, text, integer, integer, integer) to authenticated;
grant execute on function public.cifre_telefono(text) to anon, authenticated;
grant execute on function public.nomi_simili(text, text) to anon, authenticated;

-- Dopo i due tentativi notturni di OpenStreetMap (3:23 e 4:53 UTC)
select cron.unschedule('pulisci-overture') where exists (select 1 from cron.job where jobname = 'pulisci-overture');
select cron.unschedule('pulisci-overture-2') where exists (select 1 from cron.job where jobname = 'pulisci-overture-2');
select cron.schedule('pulisci-overture', '43 3 * * *', 'select public.pulisci_doppioni_overture()');
select cron.schedule('pulisci-overture-2', '13 5 * * *', 'select public.pulisci_doppioni_overture()');

-- L'aggiornamento notturno da OpenStreetMap: uguale alla 0034, con una sola riga cambiata (i luoghi di Overture
-- non impediscono a quelli di OSM di entrare)
create or replace function public.aggiorna_luoghi_osm()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  q text := '[out:json][timeout:50];area["ISO3166-1"="SM"][admin_level=2]->.sm;('
    || 'nwr["amenity"="toilets"](area.sm);'
    || 'nwr["amenity"="drinking_water"](area.sm);'
    || 'nwr["amenity"="charging_station"](area.sm);'
    || 'nwr["leisure"~"^(sports_centre|stadium)$"](area.sm);'
    || 'nwr["leisure"~"^(pitch|swimming_pool)$"]["name"](area.sm);'
    || 'nwr["tourism"~"^(museum|gallery|attraction)$"]["name"](area.sm);'
    || 'nwr["historic"~"^(castle|fort|tower|city_gate|monument)$"]["name"](area.sm);'
    || 'nwr["tourism"="viewpoint"](area.sm);'
    || 'nwr["tourism"="information"]["information"="office"](area.sm);'
    || 'nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub|ice_cream|biergarten)$"]["name"](area.sm);'
    || 'nwr["amenity"~"^(post_office|bank|atm|fuel)$"](area.sm);'
    || 'nwr["amenity"~"^(school|kindergarten|childcare|college|university)$"](area.sm);'
    || 'nwr["amenity"="place_of_worship"](area.sm);'
    || 'nwr["shop"]["name"][!"amenity"](area.sm);'
    || ');out center tags;';
  -- Server Overpass pubblici: spesso sono sovraccarichi (risposta 504), quindi si provano in ordine
  server text;
  r extensions.http_response;
  ok boolean := false;
  dati jsonb;
  n integer;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '45');
  foreach server in array array[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ] loop
    begin
      select * into r from extensions.http((
        'GET',
        server || '?data=' || extensions.urlencode(q),
        array[extensions.http_header('User-Agent', '739SanMarino/1.0 (https://739-san-marino.vercel.app)')],
        null, null
      )::extensions.http_request);
      if r.status = 200 and left(r.content, 1) = '{' then
        ok := true;
        exit;
      end if;
      raise warning 'OpenStreetMap: % ha risposto HTTP %', server, r.status;
    exception when others then
      -- Tempo scaduto o connessione rifiutata: si passa al server successivo
      raise warning 'OpenStreetMap: % non risponde (%)', server, sqlerrm;
    end;
  end loop;

  -- Se nessun server risponde, i luoghi restano quelli dell'ultimo aggiornamento e si riprova la notte dopo
  if not ok then
    return 0;
  end if;
  dati := r.content::jsonb;
  if jsonb_array_length(coalesce(dati->'elements', '[]'::jsonb)) = 0 then
    raise warning 'OpenStreetMap ha risposto senza luoghi: luoghi lasciati come erano';
    return 0;
  end if;

  drop table if exists pg_temp.osm_nuovi;
  create temporary table osm_nuovi on commit drop as
  with el as (
    select e->>'type' || '/' || (e->>'id') as id_esterno,
           coalesce(e->'tags', '{}'::jsonb) as t,
           coalesce((e->>'lat')::float8, (e->'center'->>'lat')::float8) as lat,
           coalesce((e->>'lon')::float8, (e->'center'->>'lon')::float8) as lng
    from jsonb_array_elements(dati->'elements') e
  ), c as (
    select *, case
      when t->>'amenity' = 'toilets' then 'bagni'
      when t->>'amenity' = 'drinking_water' then 'acqua'
      when t->>'amenity' = 'charging_station' then 'ricarica'
      when t->>'amenity' in ('restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'ice_cream', 'biergarten') then 'locale'
      when t->>'amenity' = 'post_office' then 'posta'
      when t->>'amenity' in ('bank', 'atm') then 'banca'
      when t->>'amenity' = 'fuel' then 'carburante'
      when t->>'amenity' in ('school', 'kindergarten', 'childcare', 'college', 'university') then 'scuola'
      when t->>'amenity' = 'place_of_worship' then 'chiesa'
      when t ? 'shop' then 'negozio'
      when t ? 'leisure' then 'impianto'
      when t->>'tourism' = 'viewpoint' then 'panorama'
      when t->>'tourism' = 'information' then 'servizio'
      else 'cultura'
    end as categoria
    from el
    where lat is not null and lng is not null
  ), d as (
    select id_esterno, categoria, lat, lng, t,
      nullif(concat_ws(', ',
        t->>'description',
        case when categoria = 'bagni' and t->>'fee' = 'yes' then 'a pagamento' when categoria = 'bagni' and t->>'fee' = 'no' then 'gratuiti' end,
        case when categoria = 'bagni' and t->>'wheelchair' = 'yes' then 'accessibili in sedia a rotelle' end,
        case when categoria = 'bagni' and t->>'changing_table' = 'yes' then 'con fasciatoio' end,
        case when categoria = 'acqua' and coalesce(t->>'drinking_water', 'yes') <> 'no' then 'acqua potabile' end,
        case when categoria = 'ricarica' and t ? 'operator' then 'gestore: ' || (t->>'operator') end,
        case when categoria = 'ricarica' and t ? 'capacity' then (t->>'capacity') || ' posti di ricarica' end,
        case when categoria = 'impianto' and t ? 'sport' then replace(replace(t->>'sport', ';', ', '), '_', ' ') end,
        case when categoria = 'locale' and t->>'outdoor_seating' = 'yes' then 'tavoli all''aperto' end,
        case when categoria = 'locale' and t->>'takeaway' in ('yes', 'only') then 'da asporto' end,
        case when categoria = 'locale' and t->>'wheelchair' = 'yes' then 'accessibile in sedia a rotelle' end,
        case when categoria = 'banca' and t->>'amenity' = 'bank' and t->>'atm' = 'yes' then 'con bancomat' end,
        case when categoria = 'carburante' and coalesce(t->>'brand', t->>'operator') is not null and t ? 'name'
          and lower(t->>'name') <> lower(coalesce(t->>'brand', t->>'operator')) then 'marchio ' || coalesce(t->>'brand', t->>'operator') end,
        case when categoria = 'carburante' and t->>'self_service' = 'yes' then 'self service' end,
        case when categoria = 'carburante' and t->>'fuel:lpg' = 'yes' then 'GPL' end,
        case when categoria = 'carburante' and t->>'fuel:cng' = 'yes' then 'metano' end
      ), '') as descr
    from c
  )
  select id_esterno, categoria, lat, lng,
    coalesce(t->>'name:it', t->>'name',
      case when categoria = 'carburante' then coalesce(t->>'brand', t->>'operator') end,
      case when categoria = 'banca' and t->>'amenity' = 'atm' then coalesce('Bancomat ' || (t->>'operator'), 'Bancomat') end,
      case categoria
      when 'posta' then 'Ufficio postale'
      when 'scuola' then case when t->>'amenity' in ('kindergarten', 'childcare') then 'Scuola dell''infanzia' else 'Scuola' end
      when 'chiesa' then 'Chiesa'
      when 'banca' then 'Banca'
      when 'carburante' then 'Distributore di carburante'
      when 'bagni' then 'Bagni pubblici'
      when 'acqua' then 'Fontanella'
      when 'ricarica' then 'Ricarica auto elettriche'
      when 'impianto' then 'Impianto sportivo'
      when 'panorama' then 'Punto panoramico'
      when 'servizio' then 'Ufficio informazioni turistiche'
      else 'Monumento' end) as nome,
    case when descr is null then null else upper(left(descr, 1)) || substr(descr, 2) || '.' end as descrizione,
    nullif(concat_ws(', ', nullif(concat_ws(' ', t->>'addr:street', t->>'addr:housenumber'), ''), t->>'addr:city'), '') as indirizzo,
    -- Locali: che tipo di posto è, letto da amenity e cuisine; banche: banca o bancomat
    case when categoria = 'banca' then case when t->>'amenity' = 'atm' then 'bancomat' end
      -- Scuole: il grado, dal tipo OSM o dal nome
      when categoria = 'scuola' then case
        when t->>'amenity' in ('university', 'college') then 'università'
        when t->>'amenity' in ('kindergarten', 'childcare') or coalesce(t->>'name', '') ~* '(infanzia|nido|asilo|materna)' then 'nido e infanzia'
        when coalesce(t->>'name', '') ~* 'elementar|primaria' then 'elementare'
        when coalesce(t->>'name', '') ~* '(media|secondaria|liceo|istituto|superiore)' then 'media e superiore'
      end
      -- Negozi: raggruppati in pochi tipi che si capiscono
      when categoria = 'negozio' then case
        when t->>'shop' in ('gift', 'souvenir', 'craft', 'art') then 'souvenir'
        when t->>'shop' in ('jewelry', 'watches') then 'gioielleria'
        when t->>'shop' in ('weapons', 'hunting') then 'armeria'
        when t->>'shop' in ('supermarket', 'convenience', 'greengrocer', 'bakery', 'butcher', 'pastry', 'confectionery', 'wine', 'alcohol', 'tea', 'coffee', 'deli', 'cheese', 'farm', 'beverages', 'chocolate') then 'alimentari'
        when t->>'shop' in ('clothes', 'shoes', 'leather', 'bag', 'boutique', 'fashion_accessories', 'sports') then 'abbigliamento'
        when t->>'shop' in ('perfumery', 'cosmetics', 'chemist', 'herbalist', 'beauty', 'optician') then 'profumeria'
        when t->>'shop' in ('tobacco', 'newsagent', 'e-cigarette', 'lottery') then 'tabaccheria'
        when t->>'shop' in ('mall', 'department_store', 'outlet') then 'centro commerciale'
        when t->>'shop' in ('doityourself', 'hardware', 'furniture', 'interior_decoration', 'houseware', 'garden_centre', 'agrarian', 'kitchen', 'lighting') then 'casa'
        when t->>'shop' in ('electronics', 'computer', 'mobile_phone', 'photo', 'photography', 'hifi', 'appliance') then 'elettronica'
        when t->>'shop' in ('books', 'musical_instrument', 'toys', 'model', 'games', 'stationery', 'music') then 'libri e giochi'
        when t->>'shop' in ('car_repair', 'tyres', 'car_parts', 'car', 'motorcycle') then 'auto'
        when t->>'shop' in ('hairdresser', 'laundry', 'dry_cleaning', 'tailor', 'travel_agency', 'ticket', 'copyshop') then 'servizi'
        else 'negozio'
      end
      -- Luoghi di culto non cristiani: si dice quale (a San Marino c'è il santuario shintoista)
      when categoria = 'chiesa' then case when t->>'religion' = 'shinto' then 'santuario shintoista'
        when t ? 'religion' and t->>'religion' <> 'christian' then 'luogo di culto' end
      when categoria <> 'locale' then null
      when t->>'amenity' = 'ice_cream' or t->>'cuisine' ~ 'ice_cream' then 'gelateria'
      when t->>'cuisine' ~ 'piadina' then 'piadineria'
      when t->>'amenity' = 'restaurant' and t->>'cuisine' ~ '(^|;)(italian_)?pizza(;|$)' then 'pizzeria'
      when t->>'amenity' = 'restaurant' then 'ristorante'
      when t->>'amenity' = 'fast_food' then 'cibo veloce'
      when t->>'amenity' in ('pub', 'biergarten') then 'pub'
      else 'bar'
    end as sottocategoria,
    case when categoria in ('locale', 'negozio') then coalesce(t->>'website', t->>'contact:website') end as sito,
    coalesce(t->>'phone', t->>'contact:phone') as telefono,
    public.orari_osm(t->>'opening_hours') as orari
  from d;

  -- Lo stesso luogo come punto e come edificio: si tiene un elemento solo
  delete from pg_temp.osm_nuovi a using pg_temp.osm_nuovi b
  where a.categoria = b.categoria and a.nome = b.nome and a.id_esterno > b.id_esterno
    and public.distanza_m(a.lat, a.lng, b.lat, b.lng) < 60;

  -- Non si duplicano i luoghi inseriti a mano dalle fonti ufficiali (stessa categoria entro 60 m)
  delete from pg_temp.osm_nuovi o
  where exists (
    select 1 from public.luoghi l
    -- (0038) tranne quelli di Overture: se OSM ha lo stesso posto vince OSM, e pulisci_doppioni_overture() toglie la copia
    where l.fonte not in ('osm', 'overture') and l.categoria = o.categoria
      and public.distanza_m(l.lat, l.lng, o.lat, o.lng) < 60
  );

  insert into public.luoghi (fonte, id_esterno, nome, categoria, descrizione, lat, lng, indirizzo, telefono, orari, sottocategoria, sito, area, aggiornato_il)
  select 'osm', id_esterno, nome, categoria, descrizione, lat, lng, indirizzo, telefono, orari, sottocategoria, sito,
    case when categoria in ('locale', 'negozio') then 'uscire' when categoria in ('posta', 'banca', 'carburante', 'scuola') then 'vivere' when categoria = 'chiesa' then 'comunita' end, now()
  from pg_temp.osm_nuovi
  on conflict (fonte, id_esterno) do update set
    nome = excluded.nome, categoria = excluded.categoria, descrizione = excluded.descrizione,
    lat = excluded.lat, lng = excluded.lng, indirizzo = excluded.indirizzo,
    telefono = excluded.telefono, orari = excluded.orari,
    -- Sottocategoria e sito li scrive OSM solo per i locali: le altre schede OSM restano come erano
    sottocategoria = case when excluded.categoria in ('locale', 'banca', 'scuola', 'chiesa', 'negozio') then excluded.sottocategoria else public.luoghi.sottocategoria end,
    sito = case when excluded.categoria in ('locale', 'negozio') then excluded.sito else public.luoghi.sito end,
    aggiornato_il = now()
  -- Le schede che il titolare gestisce non le riscrive più OpenStreetMap (0034)
  where not exists (select 1 from public.attivita_gestori g where g.luogo_id = public.luoghi.id and g.stato = 'approvata');
  get diagnostics n = row_count;

  -- Tolti da OpenStreetMap: tolti anche da 739
  delete from public.luoghi l
  where l.fonte = 'osm' and not exists (select 1 from pg_temp.osm_nuovi o where o.id_esterno = l.id_esterno)
    and not exists (select 1 from public.attivita_gestori g where g.luogo_id = l.id and g.stato = 'approvata');

  return n;
end; $$;

revoke execute on function public.aggiorna_luoghi_osm() from public, anon, authenticated;
