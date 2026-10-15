-- 0037: la mappa interroga il database per area (PostGIS), distanza e nome.
-- Fino a qui la pagina Mappa riceveva tutti i luoghi con tutti i campi (585 KB di HTML per 413 luoghi):
-- con queste funzioni il telefono chiede solo i luoghi dell'area che sta guardando, con i campi minimi.
-- Non distruttiva: aggiunge due estensioni, una colonna calcolata (si scrive da sola da lat e lng), tre indici
-- e tre funzioni di sola lettura che rispettano le regole RLS di `luoghi` (security invoker).
-- DA APPLICARE A MANO dall'SQL Editor (aggiunge una colonna a `luoghi`, tabella con dati):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0037_mappa_postgis.sql
--
-- Per tornare indietro (nessun dato si perde: la posizione resta in lat e lng):
--   drop function if exists public.luoghi_mappa(double precision, double precision, double precision, double precision, text[], integer);
--   drop function if exists public.luoghi_vicini(double precision, double precision, integer, text[], integer);
--   drop function if exists public.cerca_luoghi(text, double precision, double precision, integer);
--   drop index if exists public.luoghi_nome_trgm; drop index if exists public.luoghi_categoria;
--   alter table public.luoghi drop column if exists posizione;   -- toglie anche luoghi_posizione_gist
--   drop function if exists public.testo_norm(text);

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Testo per confronti e ricerche: minuscolo e senza accenti («Città» = «citta»). Immutabile, quindi indicizzabile.
create or replace function public.testo_norm(t text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

-- La posizione come punto geografico, calcolata da lat e lng: chi scrive in `luoghi` non deve cambiare niente
alter table public.luoghi add column if not exists posizione extensions.geography(Point, 4326)
  generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored;

create index if not exists luoghi_posizione_gist on public.luoghi using gist (posizione);
create index if not exists luoghi_categoria on public.luoghi (categoria);
create index if not exists luoghi_nome_trgm on public.luoghi using gin (public.testo_norm(nome) extensions.gin_trgm_ops);

-- I luoghi dentro il riquadro della mappa, con i campi che servono per disegnarli e per l'elenco.
-- p_categorie vuoto = tutte. Al massimo 3000 righe: se ne arrivano p_limite, il telefono sa che deve avvicinarsi.
create or replace function public.luoghi_mappa(
  p_ovest double precision, p_sud double precision, p_est double precision, p_nord double precision,
  p_categorie text[] default null, p_limite integer default 1500
)
returns table (id uuid, nome text, categoria text, sottocategoria text, lat double precision, lng double precision, indirizzo text, fonte text)
language sql stable security invoker set search_path = '' as $$
  select l.id, l.nome, l.categoria, l.sottocategoria, l.lat, l.lng, l.indirizzo, l.fonte
  from public.luoghi l
  where l.posizione operator(extensions.&&) extensions.st_makeenvelope(p_ovest, p_sud, p_est, p_nord, 4326)::extensions.geography
    and (p_categorie is null or cardinality(p_categorie) = 0 or l.categoria = any (p_categorie))
  order by l.nome
  limit least(greatest(coalesce(p_limite, 1500), 1), 3000)
$$;

-- I luoghi più vicini a un punto (la posizione del telefono), con la distanza in metri
create or replace function public.luoghi_vicini(
  p_lat double precision, p_lng double precision, p_raggio integer default 1000,
  p_categorie text[] default null, p_limite integer default 30
)
returns table (id uuid, nome text, categoria text, sottocategoria text, lat double precision, lng double precision, indirizzo text, fonte text, distanza_m integer)
language sql stable security invoker set search_path = '' as $$
  with punto as (select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g)
  select l.id, l.nome, l.categoria, l.sottocategoria, l.lat, l.lng, l.indirizzo, l.fonte,
         round(extensions.st_distance(l.posizione, punto.g))::integer
  from public.luoghi l, punto
  where extensions.st_dwithin(l.posizione, punto.g, least(greatest(coalesce(p_raggio, 1000), 50), 20000))
    and (p_categorie is null or cardinality(p_categorie) = 0 or l.categoria = any (p_categorie))
  order by l.posizione operator(extensions.<->) punto.g
  limit least(greatest(coalesce(p_limite, 30), 1), 200)
$$;

-- Ricerca per nome, senza accenti e tollerante agli errori di battitura («pizeria»).
-- Prima i nomi che iniziano con il testo, poi i più simili; a parità, i più vicini se arriva una posizione.
create or replace function public.cerca_luoghi(p_testo text, p_lat double precision default null, p_lng double precision default null, p_limite integer default 15)
returns table (id uuid, nome text, categoria text, sottocategoria text, lat double precision, lng double precision, indirizzo text, fonte text, distanza_m integer)
language sql stable security invoker set search_path = '' as $$
  with q as (select public.testo_norm(trim(left(coalesce(p_testo, ''), 80))) as t),
  punto as (
    select case when p_lat is null or p_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end as g
  )
  select l.id, l.nome, l.categoria, l.sottocategoria, l.lat, l.lng, l.indirizzo, l.fonte,
         case when punto.g is null then null else round(extensions.st_distance(l.posizione, punto.g))::integer end
  from public.luoghi l, q, punto
  where char_length(q.t) >= 2
    and (public.testo_norm(l.nome) like '%' || q.t || '%' or q.t operator(extensions.<%) public.testo_norm(l.nome))
  order by (public.testo_norm(l.nome) like q.t || '%') desc,
           extensions.word_similarity(q.t, public.testo_norm(l.nome)) desc,
           case when punto.g is null then 0 else extensions.st_distance(l.posizione, punto.g) end,
           l.nome
  limit least(greatest(coalesce(p_limite, 15), 1), 50)
$$;

grant execute on function public.testo_norm(text) to anon, authenticated;
grant execute on function public.luoghi_mappa(double precision, double precision, double precision, double precision, text[], integer) to anon, authenticated;
grant execute on function public.luoghi_vicini(double precision, double precision, integer, text[], integer) to anon, authenticated;
grant execute on function public.cerca_luoghi(text, double precision, double precision, integer) to anon, authenticated;
