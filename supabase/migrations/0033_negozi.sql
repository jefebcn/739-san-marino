-- 0033: negozi da OpenStreetMap (Fase 2: «Negozi e outlet» in Uscire).
-- Nuova categoria di luoghi `negozio` (area `uscire`) per i negozi con un nome, con un tipo semplice in sottocategoria:
-- souvenir, gioielleria, armeria, alimentari, abbigliamento, profumeria, tabaccheria, centro commerciale, casa,
-- elettronica, libri e giochi, auto, servizi, negozio. Sito se c'è.
-- Sostituisce aggiorna_luoghi_osm() e CONTIENE GIÀ LA 0030, LA 0031 E LA 0032: se non sono state applicate basta questa.
-- Al 15/10/2026 su OpenStreetMap: 95 negozi con un nome.
-- Dati © OpenStreetMap contributors, licenza ODbL.
-- DA APPLICARE A MANO dall'SQL Editor (cambia la regola delle categorie di una tabella con dati e sostituisce una funzione):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0033_negozi.sql
-- I nuovi luoghi arrivano con l'aggiornamento della notte (3.23 UTC). Per averli subito, dopo aver applicato il file:
--   select cron.schedule('osm-subito', '* * * * *', 'select public.aggiorna_luoghi_osm()');
-- e dopo un paio di minuti, quando sono arrivati:
--   select cron.unschedule('osm-subito');

alter table public.luoghi drop constraint if exists luoghi_categoria_check;
alter table public.luoghi add constraint luoghi_categoria_check check (categoria in (
  'luogo', 'parcheggio', 'farmacia', 'impianto', 'trasporti', 'locale', 'servizio',
  'cultura', 'panorama', 'bagni', 'acqua', 'ricarica', 'ufficio', 'salute',
  'posta', 'banca', 'carburante', 'scuola', 'chiesa', 'negozio'
));

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
    where l.fonte <> 'osm' and l.categoria = o.categoria
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
    aggiornato_il = now();
  get diagnostics n = row_count;

  -- Tolti da OpenStreetMap: tolti anche da 739
  delete from public.luoghi l
  where l.fonte = 'osm' and not exists (select 1 from pg_temp.osm_nuovi o where o.id_esterno = l.id_esterno);

  return n;
end; $$;

revoke execute on function public.aggiorna_luoghi_osm() from public, anon, authenticated;
