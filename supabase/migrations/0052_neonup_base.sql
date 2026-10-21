-- NeonUp, il gestionale di 739 per le aziende (21/10/2026, scelta di Alex: «gestionale completo», vedi docs/neonup.md).
-- Fase 1: azienda e collaboratori, clienti e fornitori, articoli, documenti di vendita (preventivo, ordine, DDT,
-- fattura, acconto, nota di credito e di debito) con numerazione ed emissione. Solo oggetti nuovi, niente cancellazioni:
-- le schede si disattivano, le bozze si tolgono con lo stato «eliminato».
--
-- Regole della fattura elettronica interna (FE-RSM) prese da: Documento A e Documento B dell'Ufficio Tributario
-- (versione 1.0 dell'8/9/2026), Regole tecniche e procedurali FE-RSM del 25/5/2026, Decreto Delegato 4/9/2026 n.133.
-- In breve: TipoDocumento TD01, TD02, TD04, TD05; un numero per anno per cedente su tutti i documenti fiscali;
-- data mai nel futuro; Tipo Merce (1, 2, 3, 4, 7) su ogni riga con importo; in una fattura solo beni (1, 4, 7)
-- oppure solo 2 oppure solo 3; DDT obbligatorio con i Tipi Merce 1, 2, 4, 7 (con più DDT ognuno dice le sue righe);
-- note di variazione collegate a una fattura, tranne «VariazioniContrattuali».

-- Le aziende: i dati del cedente/prestatore come andranno in fattura
create table if not exists public.neon_aziende (
  id uuid primary key default gen_random_uuid(),
  denominazione text not null check (char_length(denominazione) between 2 and 80),
  cod_oe text check (cod_oe ~ '^[0-9]{5}$'),                          -- codice operatore economico sammarinese
  indirizzo text check (char_length(indirizzo) <= 60),
  numero_civico text check (char_length(numero_civico) <= 8),
  cap text check (cap ~ '^[0-9]{5}$'),
  comune text check (char_length(comune) <= 60),
  castello_id smallint references public.castelli (id),
  telefono text check (char_length(telefono) <= 12),
  email text check (char_length(email) <= 120),
  domicilio_digitale text check (char_length(domicilio_digitale) <= 120),
  iban text check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  fe_dal date,                                                         -- «Data di inizio fatturazione elettronica RSM» su TribWEB
  luogo_id uuid references public.luoghi (id) on delete set null,      -- la scheda su 739, se c'è
  progressivo_file integer not null default 0,                         -- per il nome dei file SMxxxxx_yyyyy.xml
  creato_da uuid references auth.users (id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create table if not exists public.neon_membri (
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  utente_id uuid not null references auth.users (id) on delete cascade,
  ruolo text not null check (ruolo in ('titolare', 'amministrazione', 'vendite', 'lettura')),
  aggiunto_il timestamptz not null default now(),
  primary key (azienda_id, utente_id)
);
create index if not exists neon_membri_per_utente on public.neon_membri (utente_id);

-- Clienti e fornitori
create table if not exists public.neon_soggetti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  tipo text not null default 'cliente' check (tipo in ('cliente', 'fornitore', 'entrambi')),
  denominazione text not null check (char_length(denominazione) between 2 and 80),
  nazione text not null default 'SM' check (nazione ~ '^[A-Z]{2}$'),
  cod_oe text check (cod_oe ~ '^[0-9]{5}$'),
  partita_iva text check (char_length(partita_iva) <= 28),
  codice_fiscale text check (char_length(codice_fiscale) <= 16),
  indirizzo text check (char_length(indirizzo) <= 60),
  numero_civico text check (char_length(numero_civico) <= 8),
  cap text check (char_length(cap) <= 10),
  comune text check (char_length(comune) <= 60),
  provincia text check (provincia ~ '^[A-Z]{2}$'),
  email text check (char_length(email) <= 120),
  telefono text check (char_length(telefono) <= 30),
  pagamento text check (pagamento in ('MP01', 'MP02', 'MP05', 'MP08')),
  giorni_pagamento smallint check (giorni_pagamento between 0 and 365),
  note text check (char_length(note) <= 500),
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index if not exists neon_soggetti_per_azienda on public.neon_soggetti (azienda_id, denominazione);

create table if not exists public.neon_articoli (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  codice text check (char_length(codice) <= 35),
  descrizione text not null check (char_length(descrizione) between 1 and 1000),
  unita_misura text check (char_length(unita_misura) <= 10),
  prezzo numeric(19, 8) not null default 0,
  tipo_merce smallint check (tipo_merce in (1, 2, 3, 4, 7)),
  nomenclatura text check (nomenclatura ~ '^[0-9]{4}( [0-9]{2}){0,2}$'),
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index if not exists neon_articoli_per_azienda on public.neon_articoli (azienda_id, descrizione);

-- I documenti. Le righe stanno in `righe` (jsonb): [{codice, descrizione, quantita, unita_misura, prezzo, sconto,
-- tipo_merce, nonrimb, articolo_id}]; all'emissione si aggiunge `totale` a ogni riga, calcolato qui.
-- `ddt`: [{numero, data, righe: [n…]}]. `pagamento`: {modalita, scadenza}.
create table if not exists public.neon_documenti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  tipo text not null check (tipo in ('preventivo', 'ordine', 'ddt', 'fattura', 'acconto', 'nota_credito', 'nota_debito')),
  soggetto_id uuid references public.neon_soggetti (id),
  data date,                                                            -- nelle bozze si può lasciare vuota: all'emissione oggi
  righe jsonb not null default '[]'::jsonb,
  ddt jsonb not null default '[]'::jsonb,
  collegato_id uuid references public.neon_documenti (id),             -- la fattura che una nota varia
  causale text check (char_length(causale) <= 200),
  tipo_cessione smallint check (tipo_cessione between 1 and 99),        -- TC:nn, valori nel manuale di TribWEB
  pagamento jsonb,
  note text check (char_length(note) <= 1000),
  stato text not null default 'bozza' check (stato in ('bozza', 'emesso', 'annullato', 'eliminato')),
  -- Dati fissati all'emissione
  anno integer,
  numero text check (char_length(numero) <= 20),
  td text check (td in ('TD01', 'TD02', 'TD04', 'TD05')),
  elettronica boolean not null default false,
  cedente jsonb,
  cessionario jsonb,
  totale numeric(14, 2),
  emesso_il timestamptz,
  emesso_da uuid references auth.users (id) on delete set null,
  -- Fattura elettronica e incasso
  fe_stato text not null default '' check (fe_stato in ('', 'da_inviare', 'inviata', 'consegnata', 'scartata')),
  fe_file text,
  fe_nota text check (char_length(fe_nota) <= 500),
  fe_aggiornato_il timestamptz,
  incassato_il date,
  creato_da uuid references auth.users (id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index if not exists neon_documenti_per_azienda on public.neon_documenti (azienda_id, tipo, creato_il desc);
create unique index if not exists neon_documenti_numero_unico on public.neon_documenti (azienda_id, (case when tipo in ('fattura', 'acconto', 'nota_credito', 'nota_debito') then 'fiscale' else tipo end), anno, numero)
  where numero is not null;
create unique index if not exists neon_documenti_file_unico on public.neon_documenti (azienda_id, fe_file) where fe_file is not null;

-- I file già usati (anche gli scartati: il nome non si può più riusare)
create table if not exists public.neon_file_fe (
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  nome text not null,
  documento_id uuid not null references public.neon_documenti (id) on delete cascade,
  creato_il timestamptz not null default now(),
  primary key (azienda_id, nome)
);

create table if not exists public.neon_numeri (
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  serie text not null check (serie in ('fiscale', 'preventivo', 'ordine', 'ddt')),
  anno integer not null,
  ultimo integer not null default 0,
  ultima_data date,
  primary key (azienda_id, serie, anno)
);

alter table public.neon_aziende enable row level security;
alter table public.neon_membri enable row level security;
alter table public.neon_soggetti enable row level security;
alter table public.neon_articoli enable row level security;
alter table public.neon_documenti enable row level security;
alter table public.neon_file_fe enable row level security;
alter table public.neon_numeri enable row level security;

-- Il mio ruolo in un'azienda (null se non ne faccio parte)
create or replace function public.neon_ruolo(p_azienda uuid)
returns text language sql stable security definer set search_path = '' as $$
  select ruolo from public.neon_membri where azienda_id = p_azienda and utente_id = auth.uid()
$$;

-- Posso? 'leggere' tutti i membri, 'vendere' titolare, amministrazione e vendite, 'gestire' titolare e amministrazione
create or replace function public.neon_puo(p_azienda uuid, p_livello text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select case p_livello
    when 'leggere' then true
    when 'vendere' then m.ruolo in ('titolare', 'amministrazione', 'vendite')
    when 'gestire' then m.ruolo in ('titolare', 'amministrazione')
    when 'titolare' then m.ruolo = 'titolare'
    else false end
  from public.neon_membri m where m.azienda_id = p_azienda and m.utente_id = auth.uid()), false)
$$;

-- Regole: si legge solo dentro la propria azienda; le scritture dirette solo su clienti, articoli e bozze
create policy neon_aziende_leggo on public.neon_aziende for select to authenticated using (public.neon_puo(id, 'leggere'));
create policy neon_membri_leggo on public.neon_membri for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_soggetti_leggo on public.neon_soggetti for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_soggetti_scrivo on public.neon_soggetti for insert to authenticated with check (public.neon_puo(azienda_id, 'vendere'));
create policy neon_soggetti_cambio on public.neon_soggetti for update to authenticated
  using (public.neon_puo(azienda_id, 'vendere')) with check (public.neon_puo(azienda_id, 'vendere'));
create policy neon_articoli_leggo on public.neon_articoli for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_articoli_scrivo on public.neon_articoli for insert to authenticated with check (public.neon_puo(azienda_id, 'vendere'));
create policy neon_articoli_cambio on public.neon_articoli for update to authenticated
  using (public.neon_puo(azienda_id, 'vendere')) with check (public.neon_puo(azienda_id, 'vendere'));
create policy neon_documenti_leggo on public.neon_documenti for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_documenti_scrivo on public.neon_documenti for insert to authenticated
  with check (public.neon_puo(azienda_id, 'vendere') and stato = 'bozza');
create policy neon_documenti_cambio on public.neon_documenti for update to authenticated
  using (public.neon_puo(azienda_id, 'vendere') and stato = 'bozza') with check (public.neon_puo(azienda_id, 'vendere') and stato = 'bozza');

-- Colonne: il browser scrive solo i campi di chi lavora, mai numeri, stati e dati fissati all'emissione
revoke all on public.neon_aziende, public.neon_membri, public.neon_file_fe, public.neon_numeri from anon, authenticated;
revoke all on public.neon_soggetti, public.neon_articoli, public.neon_documenti from anon, authenticated;
grant select on public.neon_aziende, public.neon_membri, public.neon_soggetti, public.neon_articoli, public.neon_documenti to authenticated;
grant insert (azienda_id, tipo, denominazione, nazione, cod_oe, partita_iva, codice_fiscale, indirizzo, numero_civico, cap, comune, provincia,
              email, telefono, pagamento, giorni_pagamento, note, attivo) on public.neon_soggetti to authenticated;
grant update (tipo, denominazione, nazione, cod_oe, partita_iva, codice_fiscale, indirizzo, numero_civico, cap, comune, provincia,
              email, telefono, pagamento, giorni_pagamento, note, attivo, aggiornato_il) on public.neon_soggetti to authenticated;
grant insert (azienda_id, codice, descrizione, unita_misura, prezzo, tipo_merce, nomenclatura, attivo) on public.neon_articoli to authenticated;
grant update (codice, descrizione, unita_misura, prezzo, tipo_merce, nomenclatura, attivo, aggiornato_il) on public.neon_articoli to authenticated;
grant insert (azienda_id, tipo, soggetto_id, data, righe, ddt, collegato_id, causale, tipo_cessione, pagamento, note, creato_da) on public.neon_documenti to authenticated;
grant update (tipo, soggetto_id, data, righe, ddt, collegato_id, causale, tipo_cessione, pagamento, note, aggiornato_il) on public.neon_documenti to authenticated;

-- Con l'SMR ID: creo o modifico la mia azienda (chi la crea ne è il titolare; al massimo 3 per persona)
create or replace function public.neon_salva_azienda(p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_id;
  v_iban text := nullif(upper(regexp_replace(coalesce(p->>'iban', ''), '\s', '', 'g')), '');
  v_tel text := nullif(regexp_replace(coalesce(p->>'telefono', ''), '[^0-9+]', '', 'g'), '');
begin
  if auth.uid() is null then raise exception 'Per usare NeonUp serve l''SMR ID.'; end if;
  if char_length(trim(coalesce(p->>'denominazione', ''))) not between 2 and 80 then raise exception 'Scrivi la ragione sociale (al massimo 80 caratteri).'; end if;
  if nullif(p->>'cod_oe', '') is not null and (p->>'cod_oe') !~ '^[0-9]{5}$' then raise exception 'Il codice operatore economico ha 5 cifre (es. 01234).'; end if;
  if nullif(p->>'cap', '') is not null and (p->>'cap') !~ '^[0-9]{5}$' then raise exception 'Il CAP ha 5 cifre.'; end if;
  if v_tel is not null and char_length(v_tel) not between 5 and 12 then raise exception 'Il telefono deve avere da 5 a 12 cifre.'; end if;
  if v_iban is not null and v_iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then raise exception 'L''IBAN non sembra giusto.'; end if;
  if nullif(p->>'email', '') is not null and (p->>'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'L''email non sembra giusta.'; end if;
  if v_id is null then
    if (select count(*) from public.neon_membri where utente_id = auth.uid() and ruolo = 'titolare') >= 3 then
      raise exception 'Hai già 3 aziende su NeonUp: scrivici se te ne serve un''altra.';
    end if;
    insert into public.neon_aziende (denominazione, creato_da) values (trim(p->>'denominazione'), auth.uid()) returning id into v_id;
    insert into public.neon_membri (azienda_id, utente_id, ruolo) values (v_id, auth.uid(), 'titolare');
  elsif not public.neon_puo(v_id, 'gestire') then
    raise exception 'Solo il titolare o l''amministrazione possono cambiare i dati dell''azienda.';
  end if;
  update public.neon_aziende set
    denominazione = trim(p->>'denominazione'),
    cod_oe = nullif(p->>'cod_oe', ''),
    indirizzo = nullif(trim(coalesce(p->>'indirizzo', '')), ''),
    numero_civico = nullif(trim(coalesce(p->>'numero_civico', '')), ''),
    cap = nullif(p->>'cap', ''),
    comune = nullif(trim(coalesce(p->>'comune', '')), ''),
    castello_id = nullif(p->>'castello_id', '')::smallint,
    telefono = v_tel,
    email = nullif(trim(coalesce(p->>'email', '')), ''),
    domicilio_digitale = nullif(trim(coalesce(p->>'domicilio_digitale', '')), ''),
    iban = v_iban,
    fe_dal = nullif(p->>'fe_dal', '')::date,
    luogo_id = case when nullif(p->>'luogo_id', '') is not null and public.e_mio_luogo((p->>'luogo_id')::uuid) then (p->>'luogo_id')::uuid else luogo_id end,
    aggiornato_il = now()
  where id = v_id;
  return v_id;
end $$;

-- Con l'SMR ID: le mie aziende con il mio ruolo
create or replace function public.neon_mie_aziende()
returns table (id uuid, denominazione text, cod_oe text, ruolo text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.denominazione, a.cod_oe, m.ruolo
  from public.neon_membri m join public.neon_aziende a on a.id = m.azienda_id
  where m.utente_id = auth.uid()
  order by a.denominazione
$$;

-- Le persone dell'azienda (nome dal profilo, email solo a titolare e amministrazione)
create or replace function public.neon_persone(p_azienda uuid)
returns table (utente_id uuid, nome text, email text, ruolo text, aggiunto_il timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.utente_id, p.nome, case when public.neon_puo(p_azienda, 'gestire') then u.email::text end, m.ruolo, m.aggiunto_il
  from public.neon_membri m left join public.profili p on p.id = m.utente_id left join auth.users u on u.id = m.utente_id
  where m.azienda_id = p_azienda and public.neon_puo(p_azienda, 'leggere')
  order by m.aggiunto_il
$$;

-- Il titolare aggiunge una persona che ha già l'SMR ID (con la sua tessera, non con l'email) o le cambia il ruolo
create or replace function public.neon_aggiungi_persona(p_azienda uuid, p_tessera text, p_ruolo text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_utente uuid;
begin
  if not public.neon_puo(p_azienda, 'titolare') then raise exception 'Solo il titolare aggiunge le persone.'; end if;
  if p_ruolo not in ('amministrazione', 'vendite', 'lettura') then raise exception 'Ruolo non valido.'; end if;
  select id into v_utente from public.profili where tessera = upper(trim(p_tessera));
  if v_utente is null then raise exception 'Nessun SMR ID con questa tessera.'; end if;
  if v_utente = auth.uid() then raise exception 'Sei già il titolare.'; end if;
  if (select count(*) from public.neon_membri where azienda_id = p_azienda) >= 25 then raise exception 'Al massimo 25 persone per azienda.'; end if;
  insert into public.neon_membri (azienda_id, utente_id, ruolo) values (p_azienda, v_utente, p_ruolo)
  on conflict (azienda_id, utente_id) do update set ruolo = excluded.ruolo;
end $$;

-- Il nome del file: SM + codice OE + _ + progressivo in base 36 su 5 caratteri
create or replace function public.neon_base36(n bigint)
returns text language plpgsql immutable set search_path = '' as $$
declare s text := ''; c text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; v bigint := n;
begin
  if v = 0 then return '00000'; end if;
  while v > 0 loop s := substr(c, (v % 36)::integer + 1, 1) || s; v := v / 36; end loop;
  return lpad(s, 5, '0');
end $$;

-- Emetto un documento: controlli, numero, data, righe e totali calcolati qui, dati di azienda e cliente fissati
create or replace function public.neon_emetti(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  d public.neon_documenti;
  a public.neon_aziende;
  s public.neon_soggetti;
  v_fiscale boolean;
  v_serie text;
  v_data date;
  v_anno integer;
  v_num integer;
  v_righe jsonb := '[]'::jsonb;
  r jsonb;
  v_n integer := 0;
  v_q numeric; v_p numeric; v_sc numeric; v_tot numeric; v_somma numeric := 0;
  v_tm smallint;
  v_tms smallint[] := '{}';
  v_beni boolean; v_ddt_serve boolean := false;
  v_elettronica boolean := false;
  v_td text;
  c public.neon_documenti;
  x jsonb;
  v_ultima date;
begin
  select * into d from public.neon_documenti where id = p_id for update;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.stato <> 'bozza' then raise exception 'Il documento è già stato emesso.'; end if;
  select * into a from public.neon_aziende where id = d.azienda_id for update;
  if d.soggetto_id is null then raise exception 'Scegli il cliente.'; end if;
  select * into s from public.neon_soggetti where id = d.soggetto_id and azienda_id = d.azienda_id;
  if s.id is null then raise exception 'Il cliente non è di questa azienda.'; end if;

  v_fiscale := d.tipo in ('fattura', 'acconto', 'nota_credito', 'nota_debito');
  v_serie := case when v_fiscale then 'fiscale' else d.tipo end;
  v_data := coalesce(d.data, public.oggi_sm());
  if v_data > public.oggi_sm() then raise exception 'La data non può essere nel futuro.'; end if;
  v_anno := extract(year from v_data)::integer;
  v_td := case d.tipo when 'fattura' then 'TD01' when 'acconto' then 'TD02' when 'nota_credito' then 'TD04' when 'nota_debito' then 'TD05' end;

  -- Righe
  if jsonb_typeof(d.righe) <> 'array' or jsonb_array_length(d.righe) = 0 then raise exception 'Aggiungi almeno una riga.'; end if;
  if jsonb_array_length(d.righe) > 500 then raise exception 'Al massimo 500 righe per documento.'; end if;
  for r in select value from jsonb_array_elements(d.righe) loop
    v_n := v_n + 1;
    if char_length(trim(coalesce(r->>'descrizione', ''))) not between 1 and 1000 then raise exception 'Riga %: scrivi la descrizione.', v_n; end if;
    begin
      v_q := coalesce(nullif(r->>'quantita', '')::numeric, 1);
      v_p := coalesce(nullif(r->>'prezzo', '')::numeric, 0);
      v_sc := coalesce(nullif(r->>'sconto', '')::numeric, 0);
    exception when others then raise exception 'Riga %: quantità, prezzo o sconto non sono numeri.', v_n;
    end;
    if v_q <= 0 or v_q >= 1e12 then raise exception 'Riga %: la quantità deve essere maggiore di zero.', v_n; end if;
    if abs(v_p) >= 1e11 then raise exception 'Riga %: prezzo troppo grande.', v_n; end if;
    if v_sc < 0 or v_sc > 100 then raise exception 'Riga %: lo sconto va da 0 a 100.', v_n; end if;
    v_tot := round(v_p * (1 - v_sc / 100) * v_q, 2);
    v_tm := nullif(r->>'tipo_merce', '')::smallint;
    if v_tm is not null and v_tm not in (1, 2, 3, 4, 7) then raise exception 'Riga %: tipo merce non valido.', v_n; end if;
    if v_tm is not null and not v_tm = any (v_tms) then v_tms := v_tms || v_tm; end if;
    if char_length(coalesce(r->>'unita_misura', '')) > 10 or char_length(coalesce(r->>'codice', '')) > 35 then
      raise exception 'Riga %: codice (35) o unità di misura (10) troppo lunghi.', v_n;
    end if;
    v_somma := v_somma + v_tot;
    v_righe := v_righe || jsonb_build_object(
      'n', v_n, 'codice', nullif(trim(coalesce(r->>'codice', '')), ''), 'descrizione', trim(r->>'descrizione'),
      'quantita', v_q, 'unita_misura', nullif(trim(coalesce(r->>'unita_misura', '')), ''), 'prezzo', v_p, 'sconto', v_sc,
      'totale', v_tot, 'tipo_merce', v_tm, 'nonrimb', coalesce((r->>'nonrimb')::boolean, false),
      'articolo_id', nullif(r->>'articolo_id', ''));
  end loop;

  -- Fattura elettronica: azienda e cliente sammarinesi con il codice operatore, dalla data scelta su TribWEB
  v_elettronica := v_fiscale and a.cod_oe is not null and s.nazione = 'SM' and s.cod_oe is not null
                   and a.fe_dal is not null and v_data >= a.fe_dal;

  if v_fiscale then
    if s.nazione = 'SM' and s.cod_oe is null then
      -- fattura cartacea a un privato o a chi non ha il codice: va bene, ma non elettronica
      null;
    end if;
    if d.tipo in ('nota_credito', 'nota_debito') and coalesce(d.causale, '') <> 'VariazioniContrattuali' then
      if d.collegato_id is null then raise exception 'Scegli la fattura che questa nota varia.'; end if;
      select * into c from public.neon_documenti where id = d.collegato_id and azienda_id = d.azienda_id and stato = 'emesso'
        and tipo in ('fattura', 'acconto');
      if c.id is null then raise exception 'La fattura collegata non è stata trovata.'; end if;
      if c.data > v_data then raise exception 'La nota non può avere una data precedente alla fattura che varia.'; end if;
    end if;
    if v_elettronica then
      if a.indirizzo is null or a.cap is null or a.comune is null then raise exception 'Completa indirizzo, CAP e comune dell''azienda.'; end if;
      if s.indirizzo is null or s.cap is null or s.comune is null then raise exception 'Completa indirizzo, CAP e comune del cliente.'; end if;
      if s.cap !~ '^[0-9]{5}$' then raise exception 'Il CAP del cliente ha 5 cifre.'; end if;
      for r in select value from jsonb_array_elements(v_righe) loop
        if (r->>'totale')::numeric <> 0 and (r->>'tipo_merce') is null then
          raise exception 'Riga %: indica il tipo merce (obbligatorio nella fattura elettronica).', r->>'n';
        end if;
      end loop;
      v_beni := v_tms <@ array[1, 4, 7]::smallint[];
      if not (v_beni or v_tms <@ array[2]::smallint[] or v_tms <@ array[3]::smallint[]) then
        raise exception 'In una fattura vanno solo beni (tipi merce 1, 4, 7), oppure solo il tipo 2, oppure solo il tipo 3.';
      end if;
      v_ddt_serve := v_tms && array[1, 2, 4, 7]::smallint[];
      if v_ddt_serve and jsonb_array_length(d.ddt) = 0 then
        raise exception 'Con i tipi merce 1, 2, 4 e 7 serve almeno un DDT (numero e data).';
      end if;
      for x in select value from jsonb_array_elements(d.ddt) loop
        if char_length(coalesce(x->>'numero', '')) not between 1 and 20 or nullif(x->>'data', '') is null then
          raise exception 'Ogni DDT ha numero e data.';
        end if;
        if jsonb_array_length(d.ddt) > 1 and coalesce(jsonb_array_length(x->'righe'), 0) = 0 then
          raise exception 'Con più DDT indica a quali righe si riferisce ciascuno.';
        end if;
      end loop;
    end if;
  end if;

  -- Numero: uno per anno e serie; la data non torna indietro rispetto all'ultimo documento della serie
  insert into public.neon_numeri (azienda_id, serie, anno) values (d.azienda_id, v_serie, v_anno) on conflict do nothing;
  select ultimo, ultima_data into v_num, v_ultima from public.neon_numeri
  where azienda_id = d.azienda_id and serie = v_serie and anno = v_anno for update;
  if v_fiscale and v_ultima is not null and v_data < v_ultima then
    raise exception 'L''ultimo documento fiscale è del %: la data non può essere precedente.', to_char(v_ultima, 'DD/MM/YYYY');
  end if;
  v_num := v_num + 1;
  update public.neon_numeri set ultimo = v_num, ultima_data = greatest(coalesce(ultima_data, v_data), v_data)
  where azienda_id = d.azienda_id and serie = v_serie and anno = v_anno;

  update public.neon_documenti set
    stato = 'emesso', data = v_data, anno = v_anno, numero = v_num::text, td = v_td, righe = v_righe,
    totale = v_somma, elettronica = v_elettronica,
    cedente = jsonb_build_object('denominazione', a.denominazione, 'cod_oe', a.cod_oe, 'indirizzo', a.indirizzo,
      'numero_civico', a.numero_civico, 'cap', a.cap, 'comune', a.comune, 'telefono', a.telefono, 'email', a.email, 'iban', a.iban),
    cessionario = jsonb_build_object('denominazione', s.denominazione, 'nazione', s.nazione, 'cod_oe', s.cod_oe,
      'partita_iva', s.partita_iva, 'codice_fiscale', s.codice_fiscale, 'indirizzo', s.indirizzo, 'numero_civico', s.numero_civico,
      'cap', s.cap, 'comune', s.comune, 'provincia', s.provincia, 'email', s.email),
    emesso_il = now(), emesso_da = auth.uid(), aggiornato_il = now()
  where id = p_id;
  return jsonb_build_object('numero', v_num, 'data', v_data, 'elettronica', v_elettronica);
end $$;

-- Il nome del file per l'HUB-SM: nuovo la prima volta e dopo uno scarto (un nome scartato non si riusa)
create or replace function public.neon_file_fattura(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti; a public.neon_aziende; v_nome text; v_prog integer;
begin
  select * into d from public.neon_documenti where id = p_id for update;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.stato <> 'emesso' or not d.elettronica then raise exception 'Questo documento non è una fattura elettronica.'; end if;
  if d.fe_file is not null and d.fe_stato <> 'scartata' then return d.fe_file; end if;
  update public.neon_aziende set progressivo_file = progressivo_file + 1 where id = d.azienda_id returning * into a;
  v_prog := a.progressivo_file;
  if v_prog >= 60466176 then raise exception 'Progressivo dei file esaurito: scrivici.'; end if;
  v_nome := 'SM' || a.cod_oe || '_' || public.neon_base36(v_prog);
  insert into public.neon_file_fe (azienda_id, nome, documento_id) values (d.azienda_id, v_nome, p_id);
  update public.neon_documenti set fe_file = v_nome, fe_stato = 'da_inviare', fe_nota = null, fe_aggiornato_il = now() where id = p_id;
  return v_nome;
end $$;

-- L'esito, segnato a mano finché l'invio passa da TribWEB
create or replace function public.neon_esito_fattura(p_id uuid, p_stato text, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti;
begin
  select * into d from public.neon_documenti where id = p_id for update;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.fe_file is null then raise exception 'Prima prepara il file della fattura.'; end if;
  if p_stato not in ('da_inviare', 'inviata', 'consegnata', 'scartata') then raise exception 'Stato non valido.'; end if;
  if char_length(coalesce(p_nota, '')) > 500 then raise exception 'La nota è troppo lunga.'; end if;
  update public.neon_documenti set fe_stato = p_stato, fe_nota = nullif(trim(coalesce(p_nota, '')), ''), fe_aggiornato_il = now() where id = p_id;
end $$;

-- Incassato o da incassare
create or replace function public.neon_incasso(p_id uuid, p_data date)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti;
begin
  select * into d from public.neon_documenti where id = p_id for update;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.stato <> 'emesso' then raise exception 'Solo un documento emesso si può segnare come incassato.'; end if;
  if p_data is not null and p_data > public.oggi_sm() then raise exception 'La data dell''incasso non può essere nel futuro.'; end if;
  update public.neon_documenti set incassato_il = p_data, aggiornato_il = now() where id = p_id;
end $$;

-- Tolgo una bozza o annullo un preventivo, un ordine o un DDT; una fattura emessa si corregge con una nota di credito
create or replace function public.neon_annulla(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti;
begin
  select * into d from public.neon_documenti where id = p_id for update;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.stato = 'bozza' then
    update public.neon_documenti set stato = 'eliminato', aggiornato_il = now() where id = p_id;
  elsif d.stato = 'emesso' and d.tipo in ('preventivo', 'ordine', 'ddt') then
    update public.neon_documenti set stato = 'annullato', aggiornato_il = now() where id = p_id;
  else
    raise exception 'Una fattura emessa non si annulla: fai una nota di credito.';
  end if;
end $$;

revoke all on function public.neon_salva_azienda(uuid, jsonb), public.neon_mie_aziende(), public.neon_persone(uuid),
  public.neon_aggiungi_persona(uuid, text, text), public.neon_emetti(uuid), public.neon_file_fattura(uuid),
  public.neon_esito_fattura(uuid, text, text), public.neon_incasso(uuid, date), public.neon_annulla(uuid) from anon, public;
grant execute on function public.neon_salva_azienda(uuid, jsonb), public.neon_mie_aziende(), public.neon_persone(uuid),
  public.neon_aggiungi_persona(uuid, text, text), public.neon_emetti(uuid), public.neon_file_fattura(uuid),
  public.neon_esito_fattura(uuid, text, text), public.neon_incasso(uuid, date), public.neon_annulla(uuid) to authenticated;
