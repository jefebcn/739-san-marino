-- 0041: Dormire (Uscire): hotel, bed and breakfast, residence, campeggi e agriturismi.
-- Nel piano è della Fase 3 (turisti); arriva prima perché i dati veri ci sono già: 42 strutture da Overture Maps
-- (scripts/overture.py), pubblicate da un amministratore in /admin/fonti. Chi gestisce una struttura può chiederne
-- la scheda o aggiungerla («È la tua attività?», «Aggiungi la tua attività»), Pro compreso.
-- Non distruttiva: nessun dato cambia.
-- DA APPLICARE A MANO dall'SQL Editor (allarga i controlli delle categorie di `luoghi` e `attivita_proposte`, tabelle con dati):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0041_dormire.sql
--
-- Per tornare indietro: togliere i luoghi di categoria 'dormire', poi rilanciare il testo della 0039.

alter table public.luoghi drop constraint if exists luoghi_categoria_check;
alter table public.luoghi add constraint luoghi_categoria_check check (categoria in (
  'luogo', 'parcheggio', 'farmacia', 'impianto', 'trasporti', 'locale', 'servizio',
  'cultura', 'panorama', 'bagni', 'acqua', 'ricarica', 'ufficio', 'salute',
  'posta', 'banca', 'carburante', 'scuola', 'chiesa', 'negozio',
  'azienda', 'professionista', 'artigiano', 'animali', 'associazione', 'dormire'
));

alter table public.attivita_proposte drop constraint if exists attivita_proposte_categoria_check;
alter table public.attivita_proposte add constraint attivita_proposte_categoria_check check (categoria in (
  'locale', 'negozio', 'azienda', 'professionista', 'artigiano', 'animali', 'associazione', 'dormire'
));

-- Anche hotel, b&b e campeggi possono gestire la propria scheda
create or replace function public.categoria_attivita(c text)
returns boolean language sql immutable set search_path = '' as $$
  select c in ('locale', 'negozio', 'carburante', 'azienda', 'professionista', 'artigiano', 'animali', 'associazione', 'dormire')
$$;

-- I tipi che si possono scegliere, per categoria (gli stessi di modules/attivita/tipi.ts)
create or replace function public.tipi_attivita(c text)
returns text[] language sql immutable set search_path = '' as $$
  select case c
    when 'locale' then array['ristorante', 'pizzeria', 'piadineria', 'cibo veloce', 'bar', 'gelateria', 'pub']
    when 'negozio' then array['souvenir', 'gioielleria', 'armeria', 'alimentari', 'abbigliamento', 'profumeria', 'tabaccheria',
                              'centro commerciale', 'casa', 'elettronica', 'libri e giochi', 'auto', 'servizi', 'negozio']
    when 'azienda' then array['informatica', 'edilizia', 'industria', 'commercio', 'finanza', 'turismo',
                              'trasporti e logistica', 'comunicazione', 'consulenza', 'altro']
    when 'professionista' then array['commercialista', 'avvocato', 'notaio', 'architetto', 'ingegnere', 'geometra',
                                     'agenzia immobiliare', 'assicurazioni', 'studio medico', 'consulente', 'altro']
    when 'artigiano' then array['idraulico', 'elettricista', 'falegname', 'edile', 'fabbro', 'imbianchino',
                                'meccanico', 'parrucchiere', 'sartoria', 'giardiniere', 'altro']
    when 'animali' then array['veterinario', 'toelettatura', 'rifugio', 'addestramento', 'pensione', 'altro']
    when 'associazione' then array['culturale', 'volontariato', 'sportiva', 'ricreativa', 'religiosa', 'di categoria', 'altro']
    when 'dormire' then array['hotel', 'bed and breakfast', 'residence', 'campeggio', 'agriturismo', 'altro']
  end
$$;

-- area_categoria('dormire') è già 'uscire' (0039): non cambia.
