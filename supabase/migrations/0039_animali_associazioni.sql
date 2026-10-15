-- 0039: Animali (veterinari, toelettature, rifugio) in Vivere; associazioni, volontariato e società sportive in Comunità e Sport.
-- Catalogo del piano: veterinari e volontariato (Fase 2), associazioni e società sportive (Fase 1).
-- Due categorie nuove di `luoghi`:
--   'animali'      area vivere:   veterinario, toelettatura, rifugio, addestramento, pensione, altro
--   'associazione' area comunita: culturale, volontariato, sportiva, ricreativa, religiosa, di categoria, altro
-- Le schede arrivano da Overture (scripts/overture.py, pubblicate da un amministratore in /admin/fonti) e da chi le
-- gestisce: «Aggiungi la tua attività» e «È la tua attività?» valgono anche per veterinari e associazioni.
-- In più il controllo dei doppioni di Overture trova lo stesso posto anche quando la fonte lo mette lontano
-- (stesso telefono e nome simile a qualunque distanza: il 15/10/2026 cinque doppioni erano a 1-5 km).
-- Non distruttiva: nessun dato cambia.
-- DA APPLICARE A MANO dall'SQL Editor (allarga i controlli delle categorie di `luoghi` e `attivita_proposte`, tabelle con dati):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0039_animali_associazioni.sql
--
-- Per tornare indietro: togliere i luoghi delle due categorie, poi rilanciare il testo della 0036 (controlli,
-- categoria_attivita, tipi_attivita, proponi_attivita, decidi_proposta_attivita) e della 0038 (confronta_candidati,
-- carica_candidati); area_categoria() si può lasciare.

alter table public.luoghi drop constraint if exists luoghi_categoria_check;
alter table public.luoghi add constraint luoghi_categoria_check check (categoria in (
  'luogo', 'parcheggio', 'farmacia', 'impianto', 'trasporti', 'locale', 'servizio',
  'cultura', 'panorama', 'bagni', 'acqua', 'ricarica', 'ufficio', 'salute',
  'posta', 'banca', 'carburante', 'scuola', 'chiesa', 'negozio',
  'azienda', 'professionista', 'artigiano', 'animali', 'associazione'
));

alter table public.attivita_proposte drop constraint if exists attivita_proposte_categoria_check;
alter table public.attivita_proposte add constraint attivita_proposte_categoria_check check (categoria in (
  'locale', 'negozio', 'azienda', 'professionista', 'artigiano', 'animali', 'associazione'
));

-- Anche veterinari, toelettature e associazioni possono gestire la propria scheda
create or replace function public.categoria_attivita(c text)
returns boolean language sql immutable set search_path = '' as $$
  select c in ('locale', 'negozio', 'carburante', 'azienda', 'professionista', 'artigiano', 'animali', 'associazione')
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
  end
$$;

-- L'area di 739 di una categoria che arriva dai titolari
create or replace function public.area_categoria(c text)
returns text language sql immutable set search_path = '' as $$
  select case
    when c in ('azienda', 'professionista', 'artigiano') then 'lavorare'
    when c = 'animali' then 'vivere'
    when c = 'associazione' then 'comunita'
    when c = 'impianto' then 'sport'
    else 'uscire'
  end
$$;

-- «Aggiungi la tua attività»: come nella 0036, con le categorie prese da tipi_attivita()
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
  if public.tipi_attivita(v_categoria) is null then raise exception 'Scegli che tipo di attività è.'; end if;
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

-- Approva o rifiuta una scheda proposta: come nella 0036, con l'area presa da area_categoria()
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
            public.area_categoria(p.categoria),
            p.descrizione, p.lat, p.lng, p.castello_id, p.indirizzo, p.telefono, p.email, p.sito,
            'manuale', case when p.categoria = 'associazione' then 'L''associazione' else 'Il titolare dell''attività' end, (now() at time zone 'Europe/San_Marino')::date, false, now())
    returning id into v_luogo;
    insert into public.attivita_gestori (luogo_id, utente_id, chi, telefono, nota, stato, deciso_da, deciso_il)
    values (v_luogo, p.utente_id, p.chi, p.telefono_verifica, p.nota, 'approvata', auth.uid(), now());
  end if;
  update public.attivita_proposte set stato = p_stato, nota_redazione = nullif(trim(coalesce(p_nota, '')), ''),
    luogo_id = v_luogo, deciso_da = auth.uid(), deciso_il = now()
  where id = p_id;
  return v_luogo;
end $$;
-- Doppioni tra i candidati non ancora decisi. Come nella 0038 (nome simile entro 120 m, stesso telefono entro 400 m,
-- ripetuto nella fonte entro 60 m) e in più: stesso telefono e nome simile a qualunque distanza, perché la fonte
-- a volte mette lo stesso posto in due punti lontani (Mas O Meno a 1,4 km, il secondo Conad a 5 km).
create or replace function public.confronta_candidati()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.luoghi_candidati set stato = 'nuovo', simile_a = null, distanza_m = null, motivo = null
  where stato = 'doppione' and deciso_da is null;

  -- Due ricerche separate, perché ognuna usi il suo indice: per vicinanza (GiST sulla posizione) e per telefono
  with vicini as (
    select c.id, l.id as luogo, c.nome, l.nome as nome_luogo, c.posizione, l.posizione as posizione_luogo,
      public.cifre_telefono(c.telefono) is not null and public.cifre_telefono(c.telefono) = public.cifre_telefono(l.telefono) as stesso_tel
    from public.luoghi_candidati c
    join public.luoghi l
      on extensions.st_dwithin(c.posizione, l.posizione, 400)
     and not (l.fonte = c.fonte and l.id_esterno = c.id_esterno)
     and (
       (extensions.st_dwithin(c.posizione, l.posizione, 120) and public.nomi_simili(c.nome, l.nome))
       or (public.cifre_telefono(c.telefono) is not null and public.cifre_telefono(c.telefono) = public.cifre_telefono(l.telefono))
     )
    where c.stato = 'nuovo'
  ), lontani as (
    select c.id, l.id as luogo, c.nome, l.nome as nome_luogo, c.posizione, l.posizione as posizione_luogo, true as stesso_tel
    from (select x.*, public.cifre_telefono(x.telefono) as tel from public.luoghi_candidati x where x.stato = 'nuovo') c
    join (select y.*, public.cifre_telefono(y.telefono) as tel from public.luoghi y) l
      on l.tel = c.tel and not (l.fonte = c.fonte and l.id_esterno = c.id_esterno)
    where public.nomi_simili(c.nome, l.nome)
  ), somiglianze as (
    select distinct on (t.id) t.id, t.luogo, round(extensions.st_distance(t.posizione, t.posizione_luogo))::integer as metri,
      case when t.stesso_tel then 'stesso telefono' else 'nome simile' end as perche
    from (select * from vicini union all select * from lontani) t
    order by t.id, extensions.similarity(public.testo_norm(t.nome), public.testo_norm(t.nome_luogo)) desc, extensions.st_distance(t.posizione, t.posizione_luogo)
  )
  update public.luoghi_candidati x set stato = 'doppione', simile_a = s.luogo, distanza_m = s.metri,
    motivo = case s.perche when 'stesso telefono' then 'Stesso telefono di un luogo che c''è già, a ' || s.metri || ' m'
                           else 'Nome simile a un luogo che c''è già, a ' || s.metri || ' m' end
  from somiglianze s where s.id = x.id;

  -- Lo stesso posto due volte nella fonte (stesso nome entro 60 m, o stesso telefono e nome simile ovunque):
  -- resta quello con la qualità più alta
  update public.luoghi_candidati c set stato = 'doppione', motivo = 'Ripetuto nella fonte'
  where c.stato = 'nuovo' and exists (
    select 1 from public.luoghi_candidati d
    where d.id <> c.id and d.fonte = c.fonte and d.stato in ('nuovo', 'pubblicato')
      and public.testo_norm(d.nome) = public.testo_norm(c.nome) and extensions.st_dwithin(d.posizione, c.posizione, 60)
      and (coalesce(d.qualita, 0), d.id_esterno) > (coalesce(c.qualita, 0), c.id_esterno)
  );
  with t as (select x.id, x.fonte, x.nome, x.stato, x.qualita, x.id_esterno, public.cifre_telefono(x.telefono) as tel
             from public.luoghi_candidati x where x.stato in ('nuovo', 'pubblicato') and x.telefono is not null)
  update public.luoghi_candidati c set stato = 'doppione', motivo = 'Ripetuto nella fonte'
  from t
  where c.id = t.id and t.stato = 'nuovo' and exists (
    select 1 from t d
    where d.id <> t.id and d.fonte = t.fonte and d.tel = t.tel and public.nomi_simili(d.nome, t.nome)
      and (coalesce(d.qualita, 0), d.id_esterno) > (coalesce(t.qualita, 0), t.id_esterno)
  );

  select count(*) into n from public.luoghi_candidati where stato = 'doppione';
  return n;
end $$;

-- Carica i candidati: come nella 0038, con tutte le categorie che hanno un elenco di tipi (più gli impianti)
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

grant execute on function public.area_categoria(text) to anon, authenticated;
