-- 0036: «Aggiungi la tua attività» (Fase 2, passo 2.3) e le sezioni di Lavorare.
-- Su OpenStreetMap a San Marino ci sono solo una ventina di aziende e quasi nessun professionista o artigiano:
-- le schede di Lavorare (e i locali e negozi che OSM non ha) le aggiungono i titolari con il loro SMR ID.
-- La redazione verifica come per «È la tua attività?» (di solito una telefonata) e approvando crea la scheda
-- già affidata al titolare, che da lì la aggiorna da solo (profilo base gratis, Pro a parte).
-- In più: un secondo tentativo notturno dell'aggiornamento da OpenStreetMap alle 4:53 UTC, solo se quello
-- delle 3:23 non è riuscito (i server pubblici di Overpass a volte non rispondono).
-- DA APPLICARE A MANO dall'SQL Editor (allarga il controllo delle categorie di `luoghi`, una tabella con dati):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0036_aggiungi_attivita.sql

-- Tre categorie nuove per l'area Lavorare
alter table public.luoghi drop constraint if exists luoghi_categoria_check;
alter table public.luoghi add constraint luoghi_categoria_check check (categoria in (
  'luogo', 'parcheggio', 'farmacia', 'impianto', 'trasporti', 'locale', 'servizio',
  'cultura', 'panorama', 'bagni', 'acqua', 'ricarica', 'ufficio', 'salute',
  'posta', 'banca', 'carburante', 'scuola', 'chiesa', 'negozio',
  'azienda', 'professionista', 'artigiano'
));

-- Anche aziende, professionisti e artigiani sono attività private: «È la tua attività?» vale anche per loro
create or replace function public.categoria_attivita(c text)
returns boolean language sql immutable set search_path = '' as $$
  select c in ('locale', 'negozio', 'carburante', 'azienda', 'professionista', 'artigiano')
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
  end
$$;

-- Le schede proposte dai titolari, in attesa della redazione
create table if not exists public.attivita_proposte (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users (id) on delete cascade,
  chi text not null check (char_length(chi) between 3 and 120),
  telefono_verifica text not null check (char_length(telefono_verifica) between 6 and 30), -- non si pubblica
  nota text check (char_length(nota) <= 500),
  nome text not null check (char_length(nome) between 2 and 120),
  categoria text not null check (categoria in ('locale', 'negozio', 'azienda', 'professionista', 'artigiano')),
  sottocategoria text not null,
  castello_id smallint references public.castelli (id),
  indirizzo text not null check (char_length(indirizzo) between 5 and 200),
  lat double precision not null check (lat between 43.89 and 43.995),
  lng double precision not null check (lng between 12.40 and 12.52),
  descrizione text check (char_length(descrizione) <= 1000),
  telefono text check (char_length(telefono) <= 30),
  email text check (char_length(email) <= 160),
  sito text check (sito ~ '^https://' and char_length(sito) <= 500),
  stato text not null default 'richiesta' check (stato in ('richiesta', 'approvata', 'rifiutata')),
  nota_redazione text check (char_length(nota_redazione) <= 500),
  luogo_id uuid references public.luoghi (id) on delete set null,
  deciso_da uuid references auth.users (id) on delete set null,
  deciso_il timestamptz,
  creato_il timestamptz not null default now()
);
create index if not exists attivita_proposte_per_utente on public.attivita_proposte (utente_id);
create index if not exists attivita_proposte_per_stato on public.attivita_proposte (stato, creato_il desc);
-- Nessuna regola: si usa solo con le funzioni qui sotto
alter table public.attivita_proposte enable row level security;

-- «Aggiungi la tua attività»: il titolare propone la scheda
create or replace function public.proponi_attivita(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := coalesce(p, '{}'::jsonb);
  v_id uuid;
  v_categoria text := trim(coalesce(d->>'categoria', ''));
  v_tipo text := trim(coalesce(d->>'sottocategoria', ''));
  v_nome text := trim(coalesce(d->>'nome', ''));
  v_lat double precision;
  v_lng double precision;
  v_castello smallint;
  v_simile text;
begin
  if auth.uid() is null then raise exception 'Per aggiungere la tua attività entra con il tuo SMR ID.'; end if;
  if (select count(*) from public.attivita_proposte where utente_id = auth.uid() and creato_il > now() - interval '1 day') >= 3 then
    raise exception 'Hai già proposto tre attività oggi: riprova domani.';
  end if;
  if char_length(v_nome) < 2 or char_length(v_nome) > 120 then raise exception 'Scrivi il nome dell''attività.'; end if;
  if v_categoria not in ('locale', 'negozio', 'azienda', 'professionista', 'artigiano') then raise exception 'Scegli che tipo di attività è.'; end if;
  if not (v_tipo = any (public.tipi_attivita(v_categoria))) then raise exception 'Scegli il tipo dall''elenco.'; end if;
  begin
    v_lat := (d->>'lat')::double precision;
    v_lng := (d->>'lng')::double precision;
  exception when others then
    raise exception 'Segna sulla mappa dove si trova l''attività.';
  end;
  if v_lat is null or v_lng is null or v_lat not between 43.89 and 43.995 or v_lng not between 12.40 and 12.52 then
    raise exception 'Segna sulla mappa dove si trova l''attività, dentro San Marino.';
  end if;
  if nullif(d->>'castello_id', '') is not null then
    v_castello := (d->>'castello_id')::smallint;
    if not exists (select 1 from public.castelli where id = v_castello) then raise exception 'Castello non valido.'; end if;
  end if;
  if char_length(trim(coalesce(d->>'indirizzo', ''))) < 5 then raise exception 'Scrivi l''indirizzo dell''attività.'; end if;
  if char_length(trim(coalesce(d->>'chi', ''))) < 3 then raise exception 'Scrivi chi sei e che ruolo hai nell''attività.'; end if;
  if coalesce(d->>'telefono_verifica', '') !~ '^[+0-9 ./()-]{6,30}$' then raise exception 'Scrivi un numero di telefono valido per la verifica.'; end if;
  if nullif(trim(coalesce(d->>'telefono', '')), '') is not null and trim(d->>'telefono') !~ '^[+0-9 ./()-]{6,30}$' then
    raise exception 'Il telefono dell''attività non sembra un numero.';
  end if;
  if nullif(trim(coalesce(d->>'email', '')), '') is not null and trim(d->>'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'L''email dell''attività non sembra valida.';
  end if;
  if nullif(trim(coalesce(d->>'sito', '')), '') is not null and (trim(d->>'sito') !~ '^https://' or char_length(trim(d->>'sito')) > 500) then
    raise exception 'Il sito deve iniziare con https://';
  end if;
  if char_length(coalesce(d->>'descrizione', '')) > 1000 then raise exception 'La descrizione è troppo lunga (massimo 1000 caratteri).'; end if;
  -- Se la scheda c'è già (stesso nome a meno di 200 m), si chiede quella invece di farne un doppione
  select l.nome into v_simile from public.luoghi l
  where lower(l.nome) = lower(v_nome)
    and abs(l.lat - v_lat) < 0.0018 and abs(l.lng - v_lng) < 0.0025
  limit 1;
  if v_simile is not null then
    raise exception 'C''è già una scheda «%» qui vicino: cercala in 739, aprila e tocca «È la tua attività?».', v_simile;
  end if;
  if exists (select 1 from public.attivita_proposte where utente_id = auth.uid() and stato = 'richiesta' and lower(nome) = lower(v_nome)) then
    raise exception 'Hai già proposto questa attività: la redazione ti risponde appena l''ha verificata.';
  end if;
  insert into public.attivita_proposte (utente_id, chi, telefono_verifica, nota, nome, categoria, sottocategoria, castello_id,
                                        indirizzo, lat, lng, descrizione, telefono, email, sito)
  values (auth.uid(), trim(d->>'chi'), trim(d->>'telefono_verifica'), nullif(trim(coalesce(d->>'nota', '')), ''),
          v_nome, v_categoria, v_tipo, v_castello, trim(d->>'indirizzo'), v_lat, v_lng,
          nullif(trim(coalesce(d->>'descrizione', '')), ''), nullif(trim(coalesce(d->>'telefono', '')), ''),
          nullif(trim(coalesce(d->>'email', '')), ''), nullif(trim(coalesce(d->>'sito', '')), ''))
  returning id into v_id;
  return v_id;
end $$;

-- Le mie proposte (quelle approvate diventano schede e compaiono anche in mie_attivita)
create or replace function public.mie_proposte_attivita()
returns table (id uuid, nome text, categoria text, sottocategoria text, stato text, nota_redazione text, luogo_id uuid, creato_il timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nome, p.categoria, p.sottocategoria, p.stato, p.nota_redazione, p.luogo_id, p.creato_il
  from public.attivita_proposte p
  where p.utente_id = auth.uid() and p.stato <> 'approvata'
  order by p.creato_il desc
$$;

-- Redazione: le proposte da verificare (o già decise)
create or replace function public.proposte_attivita(p_stato text default 'richiesta')
returns table (id uuid, nome text, categoria text, sottocategoria text, castello_id smallint, indirizzo text, lat double precision, lng double precision,
               descrizione text, telefono text, email_attivita text, sito text, chi text, telefono_verifica text, nota text,
               email text, stato text, nota_redazione text, luogo_id uuid, creato_il timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  return query
    select p.id, p.nome, p.categoria, p.sottocategoria, p.castello_id, p.indirizzo, p.lat, p.lng, p.descrizione, p.telefono, p.email, p.sito,
           p.chi, p.telefono_verifica, p.nota, u.email::text, p.stato, p.nota_redazione, p.luogo_id, p.creato_il
    from public.attivita_proposte p
    left join auth.users u on u.id = p.utente_id
    where p.stato = coalesce(p_stato, 'richiesta')
    order by p.creato_il desc
    limit 200;
end $$;

-- Il numero nel profilo della redazione conta anche le schede nuove da verificare
create or replace function public.conteggio_richieste_attivita()
returns integer language sql stable security definer set search_path = '' as $$
  select case when public.e_redattore() then
    (select count(*)::int from public.attivita_gestori where stato = 'richiesta')
    + (select count(*)::int from public.attivita_proposte where stato = 'richiesta')
  end
$$;

-- Approva (crea la scheda già affidata al titolare) o rifiuta
create or replace function public.decidi_proposta_attivita(p_id uuid, p_stato text, p_nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  p public.attivita_proposte;
  v_luogo uuid;
begin
  if not public.e_redattore() then raise exception 'Riservato alla redazione.'; end if;
  if p_stato not in ('approvata', 'rifiutata') then raise exception 'Decisione non valida.'; end if;
  select * into p from public.attivita_proposte where id = p_id for update;
  if p.id is null then raise exception 'Proposta non trovata.'; end if;
  if p.stato <> 'richiesta' then raise exception 'Questa proposta è già stata decisa.'; end if;
  if p_stato = 'approvata' then
    insert into public.luoghi (nome, categoria, sottocategoria, area, descrizione, lat, lng, castello_id, indirizzo, telefono, email, sito,
                               fonte, fonte_nome, verificato_il, da_verificare, aggiornato_il)
    values (p.nome, p.categoria, p.sottocategoria,
            case when p.categoria in ('azienda', 'professionista', 'artigiano') then 'lavorare' else 'uscire' end,
            p.descrizione, p.lat, p.lng, p.castello_id, p.indirizzo, p.telefono, p.email, p.sito,
            'manuale', 'Il titolare dell''attività', (now() at time zone 'Europe/San_Marino')::date, false, now())
    returning id into v_luogo;
    insert into public.attivita_gestori (luogo_id, utente_id, chi, telefono, nota, stato, deciso_da, deciso_il)
    values (v_luogo, p.utente_id, p.chi, p.telefono_verifica, p.nota, 'approvata', auth.uid(), now());
  end if;
  update public.attivita_proposte set stato = p_stato, nota_redazione = nullif(trim(coalesce(p_nota, '')), ''),
    luogo_id = v_luogo, deciso_da = auth.uid(), deciso_il = now()
  where id = p_id;
  return v_luogo;
end $$;

revoke execute on function public.proponi_attivita(jsonb) from public, anon;
revoke execute on function public.mie_proposte_attivita() from public, anon;
revoke execute on function public.proposte_attivita(text) from public, anon;
revoke execute on function public.decidi_proposta_attivita(uuid, text, text) from public, anon;
grant execute on function public.proponi_attivita(jsonb) to authenticated;
grant execute on function public.mie_proposte_attivita() to authenticated;
grant execute on function public.proposte_attivita(text) to authenticated;
grant execute on function public.decidi_proposta_attivita(uuid, text, text) to authenticated;
grant execute on function public.tipi_attivita(text) to anon, authenticated;

-- Secondo tentativo notturno da OpenStreetMap: parte alle 4:53 UTC solo se alle 3:23 non è arrivato niente.
-- Gli utenti non aspettano mai OSM (l'app legge dal database): una notte saltata lascia solo i dati del giorno prima.
select cron.unschedule('aggiorna-luoghi-osm-2') where exists (select 1 from cron.job where jobname = 'aggiorna-luoghi-osm-2');
select cron.schedule('aggiorna-luoghi-osm-2', '53 4 * * *', $cron$
  select public.aggiorna_luoghi_osm()
  where not exists (select 1 from public.luoghi where fonte = 'osm' and aggiornato_il > now() - interval '3 hours')
$cron$);
