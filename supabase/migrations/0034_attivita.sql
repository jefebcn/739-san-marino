-- 0034: profilo base delle attività (Fase 2). Gratis per tutte le attività.
-- Il titolare entra con SMR ID, chiede la scheda del suo locale o negozio («È la tua attività?»), la redazione
-- verifica (di solito richiamando il numero dell'attività) e approva; da lì il titolare aggiorna da solo
-- descrizione, indirizzo, contatti, orari (anche quelli per «aperto adesso») e foto.
-- Le schede gestite dal titolare non le riscrive più l'aggiornamento notturno da OpenStreetMap.
-- Il piano Pro (menu, offerte, statistiche) arriva dopo: qui c'è solo la colonna `piano`, che oggi resta 'base'.
-- DA APPLICARE A MANO dall'SQL Editor (sostituisce aggiorna_luoghi_osm(), che ora rispetta le schede gestite):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0034_attivita.sql

create table if not exists public.attivita_gestori (
  id uuid primary key default gen_random_uuid(),
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  utente_id uuid not null references auth.users (id) on delete cascade,
  chi text not null check (char_length(chi) between 3 and 120),          -- nome e ruolo, es. «Mario Rossi, titolare»
  telefono text not null check (char_length(telefono) between 6 and 30), -- per la verifica, non si pubblica
  nota text check (char_length(nota) <= 500),
  stato text not null default 'richiesta' check (stato in ('richiesta', 'approvata', 'rifiutata', 'revocata')),
  piano text not null default 'base' check (piano in ('base', 'pro')),
  nota_redazione text check (char_length(nota_redazione) <= 500),
  deciso_da uuid references auth.users (id) on delete set null,
  deciso_il timestamptz,
  creato_il timestamptz not null default now()
);
-- Un solo titolare approvato per scheda
create unique index if not exists attivita_un_titolare on public.attivita_gestori (luogo_id) where stato = 'approvata';
create index if not exists attivita_per_utente on public.attivita_gestori (utente_id);
-- Nessuna regola: si usa solo con le funzioni qui sotto
alter table public.attivita_gestori enable row level security;

-- Le categorie di luoghi che sono attività private e si possono chiedere
create or replace function public.categoria_attivita(c text)
returns boolean language sql immutable set search_path = '' as $$
  select c in ('locale', 'negozio', 'carburante')
$$;

-- «È la tua attività?»: la richiesta del titolare
create or replace function public.chiedi_attivita(p_luogo uuid, p_chi text, p_telefono text, p_nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_categoria text;
begin
  if auth.uid() is null then raise exception 'Per gestire la scheda della tua attività entra con il tuo SMR ID.'; end if;
  select categoria into v_categoria from public.luoghi where id = p_luogo;
  if v_categoria is null then raise exception 'Questa scheda non esiste più.'; end if;
  if not public.categoria_attivita(v_categoria) then raise exception 'Questa scheda non è di un''attività privata.'; end if;
  if exists (select 1 from public.attivita_gestori where luogo_id = p_luogo and stato = 'approvata') then
    raise exception 'Questa scheda ha già un titolare. Se è un errore, scrivici dalla scheda con «Segnala un errore».';
  end if;
  if exists (select 1 from public.attivita_gestori where luogo_id = p_luogo and utente_id = auth.uid() and stato = 'richiesta') then
    raise exception 'Hai già chiesto questa scheda: la redazione ti risponde appena l''ha verificata.';
  end if;
  if (select count(*) from public.attivita_gestori where utente_id = auth.uid() and creato_il > now() - interval '1 day') >= 5 then
    raise exception 'Hai mandato troppe richieste oggi: riprova domani.';
  end if;
  if char_length(trim(coalesce(p_chi, ''))) < 3 then raise exception 'Scrivi chi sei e che ruolo hai nell''attività.'; end if;
  if coalesce(p_telefono, '') !~ '^[+0-9 ./()-]{6,30}$' then raise exception 'Scrivi un numero di telefono valido per la verifica.'; end if;
  insert into public.attivita_gestori (luogo_id, utente_id, chi, telefono, nota)
  values (p_luogo, auth.uid(), trim(p_chi), trim(p_telefono), nullif(trim(coalesce(p_nota, '')), ''))
  returning id into v_id;
  return v_id;
end $$;

-- Le mie richieste e le schede che gestisco
create or replace function public.mie_attivita()
returns table (id uuid, luogo_id uuid, nome text, categoria text, sottocategoria text, stato text, piano text, nota_redazione text, creato_il timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.id, l.id, l.nome, l.categoria, l.sottocategoria, g.stato, g.piano, g.nota_redazione, g.creato_il
  from public.attivita_gestori g join public.luoghi l on l.id = g.luogo_id
  where g.utente_id = auth.uid()
  order by (g.stato = 'approvata') desc, g.creato_il desc
$$;

-- Il titolare aggiorna la sua scheda. Si toccano solo i campi che arrivano; quelli vuoti si cancellano.
create or replace function public.salva_mia_attivita(p_luogo uuid, p_dati jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := coalesce(p_dati, '{}'::jsonb);
  v text;
  giorno text;
  fascia jsonb;
begin
  if not exists (select 1 from public.attivita_gestori where luogo_id = p_luogo and utente_id = auth.uid() and stato = 'approvata')
     and not public.e_redattore() then
    raise exception 'Puoi modificare solo le schede delle tue attività.';
  end if;
  if char_length(coalesce(d->>'descrizione', '')) > 1000 then raise exception 'La descrizione è troppo lunga: massimo 1000 caratteri.'; end if;
  if char_length(coalesce(d->>'indirizzo', '')) > 200 then raise exception 'L''indirizzo è troppo lungo.'; end if;
  if char_length(coalesce(d->>'orari', '')) > 300 then raise exception 'Gli orari scritti sono troppo lunghi: massimo 300 caratteri.'; end if;
  v := nullif(trim(coalesce(d->>'telefono', '')), '');
  if v is not null and v !~ '^[+0-9 ./()-]{6,30}$' then raise exception 'Il telefono non sembra giusto.'; end if;
  v := nullif(trim(coalesce(d->>'email', '')), '');
  if v is not null and v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'L''email non sembra giusta.'; end if;
  foreach v in array array['sito', 'foto_url'] loop
    if nullif(d->>v, '') is not null and ((d->>v) !~ '^https://' or char_length(d->>v) > 500) then
      raise exception 'I link devono iniziare con https://';
    end if;
  end loop;
  if nullif(d->>'foto_url', '') is not null and char_length(trim(coalesce(d->>'foto_credito', ''))) < 2 then
    raise exception 'Scrivi chi ha scattato la foto (o «Foto del locale»).';
  end if;
  -- Orari per «aperto adesso»: {"1": [["08:00","13:00"]], …}, 1 = lunedì
  if d ? 'orari_settimana' and jsonb_typeof(d->'orari_settimana') = 'object' then
    for giorno, fascia in select key, value from jsonb_each(d->'orari_settimana') loop
      if giorno !~ '^[1-7]$' or jsonb_typeof(fascia) <> 'array' then raise exception 'Orari della settimana non validi.'; end if;
      if exists (select 1 from jsonb_array_elements(fascia) f
                 where jsonb_typeof(f) <> 'array' or jsonb_array_length(f) <> 2
                    or (f->>0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (f->>1) !~ '^([01][0-9]|2[0-4]):[0-5][0-9]$') then
        raise exception 'Gli orari vanno scritti come 08:30.';
      end if;
    end loop;
  end if;

  update public.luoghi set
    descrizione = case when d ? 'descrizione' then nullif(trim(d->>'descrizione'), '') else descrizione end,
    indirizzo = case when d ? 'indirizzo' then nullif(trim(d->>'indirizzo'), '') else indirizzo end,
    telefono = case when d ? 'telefono' then nullif(trim(d->>'telefono'), '') else telefono end,
    email = case when d ? 'email' then nullif(trim(d->>'email'), '') else email end,
    sito = case when d ? 'sito' then nullif(trim(d->>'sito'), '') else sito end,
    orari = case when d ? 'orari' then nullif(trim(d->>'orari'), '') else orari end,
    orari_settimana = case when d ? 'orari_settimana' then
      case when jsonb_typeof(d->'orari_settimana') = 'object' and d->'orari_settimana' <> '{}'::jsonb then d->'orari_settimana' end
      else orari_settimana end,
    foto_url = case when d ? 'foto_url' then nullif(trim(d->>'foto_url'), '') else foto_url end,
    foto_credito = case when d ? 'foto_url' then nullif(trim(coalesce(d->>'foto_credito', '')), '') else foto_credito end,
    -- La fonte di questi dati è il titolare
    fonte_nome = 'Il titolare dell''attività',
    fonte_link = coalesce(nullif(trim(coalesce(d->>'sito', '')), ''), fonte_link),
    verificato_il = current_date,
    da_verificare = false,
    aggiornato_il = now()
  where id = p_luogo;
end $$;

-- Pubblico: la scheda è aggiornata dal titolare?
create or replace function public.luogo_gestito(p_luogo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.attivita_gestori where luogo_id = p_luogo and stato = 'approvata')
$$;

-- ——— Redazione ———

create or replace function public.richieste_attivita(p_stato text default 'richiesta')
returns table (id uuid, luogo_id uuid, nome text, categoria text, indirizzo text, telefono_scheda text,
               chi text, telefono text, nota text, email text, stato text, nota_redazione text, creato_il timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  return query
    select g.id, l.id, l.nome, l.categoria, l.indirizzo, l.telefono, g.chi, g.telefono, g.nota, u.email::text, g.stato, g.nota_redazione, g.creato_il
    from public.attivita_gestori g
    join public.luoghi l on l.id = g.luogo_id
    left join auth.users u on u.id = g.utente_id
    where g.stato = coalesce(p_stato, 'richiesta')
    order by g.creato_il desc
    limit 200;
end $$;

create or replace function public.conteggio_richieste_attivita()
returns integer language sql stable security definer set search_path = '' as $$
  select case when public.e_redattore() then (select count(*)::int from public.attivita_gestori where stato = 'richiesta') end
$$;

-- Approva, rifiuta o toglie (revoca) un titolare
create or replace function public.decidi_attivita(p_id uuid, p_stato text, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g public.attivita_gestori;
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  if p_stato not in ('approvata', 'rifiutata', 'revocata') then raise exception 'Decisione non valida.'; end if;
  select * into g from public.attivita_gestori where id = p_id;
  if g.id is null then raise exception 'Richiesta non trovata.'; end if;
  if p_stato = 'approvata' and exists (select 1 from public.attivita_gestori where luogo_id = g.luogo_id and stato = 'approvata' and id <> p_id) then
    raise exception 'Questa scheda ha già un titolare approvato: prima toglilo.';
  end if;
  update public.attivita_gestori set stato = p_stato, nota_redazione = nullif(trim(coalesce(p_nota, '')), ''),
    deciso_da = auth.uid(), deciso_il = now()
  where id = p_id;
  -- Approvando, le altre richieste aperte sulla stessa scheda si chiudono
  if p_stato = 'approvata' then
    update public.attivita_gestori set stato = 'rifiutata', nota_redazione = 'La scheda è stata data a un altro titolare.',
      deciso_da = auth.uid(), deciso_il = now()
    where luogo_id = g.luogo_id and stato = 'richiesta' and id <> p_id;
  end if;
end $$;

-- L'aggiornamento notturno da OpenStreetMap, uguale alla 0033 ma senza toccare le schede gestite dal titolare
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

revoke execute on function public.chiedi_attivita(uuid, text, text, text) from public, anon;
revoke execute on function public.mie_attivita() from public, anon;
revoke execute on function public.salva_mia_attivita(uuid, jsonb) from public, anon;
revoke execute on function public.richieste_attivita(text) from public, anon;
revoke execute on function public.conteggio_richieste_attivita() from public, anon;
revoke execute on function public.decidi_attivita(uuid, text, text) from public, anon;
grant execute on function public.chiedi_attivita(uuid, text, text, text) to authenticated;
grant execute on function public.mie_attivita() to authenticated;
grant execute on function public.salva_mia_attivita(uuid, jsonb) to authenticated;
grant execute on function public.richieste_attivita(text) to authenticated;
grant execute on function public.conteggio_richieste_attivita() to authenticated;
grant execute on function public.decidi_attivita(uuid, text, text) to authenticated;
grant execute on function public.luogo_gestito(uuid) to anon, authenticated;
