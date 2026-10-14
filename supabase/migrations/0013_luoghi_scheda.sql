-- 739 San Marino · la scheda unica (docs/piano.md): campi nuovi per ogni luogo.
-- DA APPLICARE A MANO dall'SQL Editor di Supabase: aggiunge colonne a `luoghi`, che ha già dati
-- (le colonne sono tutte facoltative e vuote: i dati esistenti non cambiano). Copiare il file da
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0013_luoghi_scheda.sql
-- L'importazione notturna da OpenStreetMap (0010) non tocca questi campi: quello che la redazione
-- scrive qui resta anche sui luoghi OSM.

alter table public.luoghi
  -- Area di 739 a cui appartiene (lib/aree.ts); vuota = si ricava dalla categoria
  add column if not exists area text,
  -- Tipo più preciso dentro la categoria (es. «anagrafe», «poliambulatorio»)
  add column if not exists sottocategoria text,
  add column if not exists sito text,
  add column if not exists email text,
  add column if not exists foto_url text,
  add column if not exists foto_credito text,
  add column if not exists fonte_nome text,
  add column if not exists fonte_link text,
  -- Data dell'ultimo controllo del dato alla fonte
  add column if not exists verificato_il date,
  -- Pratiche che si fanno lì: [{"titolo": "…", "testo": "…", "documenti": ["…"], "link": "https://…"}]
  add column if not exists cosa_fare jsonb;

alter table public.luoghi drop constraint if exists luoghi_area_check;
alter table public.luoghi add constraint luoghi_area_check
  check (area is null or area in ('vivere', 'uscire', 'sport', 'comunita', 'lavorare'));
alter table public.luoghi drop constraint if exists luoghi_cosa_fare_check;
alter table public.luoghi add constraint luoghi_cosa_fare_check
  check (cosa_fare is null or jsonb_typeof(cosa_fare) = 'array');
