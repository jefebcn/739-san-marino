-- 739 San Marino · luoghi da OpenStreetMap scaricati dal database ogni notte.
-- Bagni pubblici, fontanelle, ricarica auto, impianti sportivi, musei e monumenti, panorami, info turistiche.
-- Dati © OpenStreetMap contributors, licenza ODbL: l'app cita la fonte nella scheda del luogo.
-- DA APPLICARE A MANO dall'SQL Editor di Supabase (contiene insert e delete): copiare il file da
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0010_osm_automatico.sql
-- Il primo aggiornamento non è nel file: se i server OSM sono lenti supererebbe il tempo massimo dell'SQL Editor
-- e annullerebbe tutto. Si lancia a parte con «select public.aggiorna_luoghi_osm();» o si aspetta la notte.

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

alter table public.luoghi drop constraint if exists luoghi_categoria_check;
alter table public.luoghi add constraint luoghi_categoria_check check (categoria in (
  'luogo', 'parcheggio', 'farmacia', 'impianto', 'trasporti', 'locale', 'servizio',
  'cultura', 'panorama', 'bagni', 'acqua', 'ricarica'
));

-- Orari OSM («Mo-Fr 09:00-18:00») resi leggibili in italiano, senza interpretarli
create or replace function public.orari_osm(s text)
returns text language sql immutable set search_path = '' as $$
  select case when s is null then null when s = '24/7' then 'Sempre aperto' else
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(regexp_replace(regexp_replace(s,
      '\mMo\M', 'lun', 'g'), '\mTu\M', 'mar', 'g'), '\mWe\M', 'mer', 'g'), '\mTh\M', 'gio', 'g'),
      '\mFr\M', 'ven', 'g'), '\mSa\M', 'sab', 'g'), '\mSu\M', 'dom', 'g'), '\mPH\M', 'festivi', 'g'),
      '\moff\M', 'chiuso', 'g'), ';\s*', '; ', 'g')
  end
$$;

-- Distanza in metri tra due punti (abbastanza precisa per poche centinaia di metri)
create or replace function public.distanza_m(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable set search_path = '' as $$
  select sqrt(power((lng2 - lng1) * cos(radians((lat1 + lat2) / 2)) * 111320, 2) + power((lat2 - lat1) * 110540, 2))
$$;

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
        case when categoria = 'impianto' and t ? 'sport' then replace(replace(t->>'sport', ';', ', '), '_', ' ') end
      ), '') as descr
    from c
  )
  select id_esterno, categoria, lat, lng,
    coalesce(t->>'name:it', t->>'name', case categoria
      when 'bagni' then 'Bagni pubblici'
      when 'acqua' then 'Fontanella'
      when 'ricarica' then 'Ricarica auto elettriche'
      when 'impianto' then 'Impianto sportivo'
      when 'panorama' then 'Punto panoramico'
      when 'servizio' then 'Ufficio informazioni turistiche'
      else 'Monumento' end) as nome,
    case when descr is null then null else upper(left(descr, 1)) || substr(descr, 2) || '.' end as descrizione,
    nullif(concat_ws(', ', nullif(concat_ws(' ', t->>'addr:street', t->>'addr:housenumber'), ''), t->>'addr:city'), '') as indirizzo,
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
    where l.fonte <> 'osm' and l.categoria = o.categoria
      and public.distanza_m(l.lat, l.lng, o.lat, o.lng) < 60
  );

  insert into public.luoghi (fonte, id_esterno, nome, categoria, descrizione, lat, lng, indirizzo, telefono, orari, aggiornato_il)
  select 'osm', id_esterno, nome, categoria, descrizione, lat, lng, indirizzo, telefono, orari, now()
  from pg_temp.osm_nuovi
  on conflict (fonte, id_esterno) do update set
    nome = excluded.nome, categoria = excluded.categoria, descrizione = excluded.descrizione,
    lat = excluded.lat, lng = excluded.lng, indirizzo = excluded.indirizzo,
    telefono = excluded.telefono, orari = excluded.orari, aggiornato_il = now();
  get diagnostics n = row_count;

  -- Tolti da OpenStreetMap: tolti anche da 739
  delete from public.luoghi l
  where l.fonte = 'osm' and not exists (select 1 from pg_temp.osm_nuovi o where o.id_esterno = l.id_esterno);

  return n;
end; $$;

revoke execute on function public.aggiorna_luoghi_osm() from public, anon, authenticated;

-- Ogni notte alle 3.23 (UTC): una sola richiesta al giorno, e se una notte i server sono occupati si recupera la successiva
select cron.unschedule(jobid) from cron.job where jobname = 'aggiorna-luoghi-osm';
select cron.schedule('aggiorna-luoghi-osm', '23 3 * * *', 'select public.aggiorna_luoghi_osm()');

