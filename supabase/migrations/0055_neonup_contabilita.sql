-- NeonUp fase 4: ciclo passivo e contabilità di gestione (22/10/2026, richiesta di Alex: «procedi con la fase 4, contabilità»;
-- vedi docs/neonup.md). Conti di cassa e banca con il saldo, prima nota (entrate, uscite, giroconti), acquisti (le fatture dei
-- fornitori, anche dall'HUB-SM), scadenzario di incassi e pagamenti, estratti conto importati e riconciliati.
-- Non è la contabilità obbligatoria: niente partita doppia, registri o bilancio, che restano al commercialista
-- (NeonUp gli prepara i file). Nessuna imposta calcolata.
-- Solo oggetti nuovi. Niente cancellazioni: un movimento sbagliato si annulla (annullato_il), un acquisto anche.
-- Leggono titolare, amministrazione e «lettura» (il commercialista); scrivono titolare e amministrazione. Vendite no.

create or replace function public.neon_vede_conti(p_azienda uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select ruolo in ('titolare', 'amministrazione', 'lettura') from public.neon_membri
    where azienda_id = p_azienda and utente_id = auth.uid()), false)
$$;

create table if not exists public.neon_conti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 60),
  tipo text not null default 'banca' check (tipo in ('cassa', 'banca', 'carta', 'altro')),
  iban text check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  saldo_iniziale numeric(14, 2) not null default 0,
  saldo_dal date not null,
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);
create unique index if not exists neon_conti_nome on public.neon_conti (azienda_id, lower(nome));

-- Gli acquisti: fatture dei fornitori (anche quelle arrivate dall'HUB-SM), note di credito, ricevute e spese
create table if not exists public.neon_acquisti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  tipo text not null default 'fattura' check (tipo in ('fattura', 'nota_credito', 'ricevuta')),
  soggetto_id uuid references public.neon_soggetti (id),
  fornitore text check (char_length(fornitore) <= 80),                 -- il nome, se non è in anagrafica
  passiva_id uuid references public.neon_passive (id),
  collegato_id uuid references public.neon_acquisti (id),             -- la fattura che una nota di credito riduce
  numero text check (char_length(numero) <= 40),
  data date not null,
  descrizione text check (char_length(descrizione) <= 300),
  categoria text check (char_length(categoria) <= 40),
  totale numeric(14, 2) not null check (totale >= 0),
  scadenza date,
  saldato_il date,                                                     -- segnato a mano, senza movimento
  annullato_il timestamptz,
  creato_da uuid references auth.users (id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index if not exists neon_acquisti_per_azienda on public.neon_acquisti (azienda_id, data desc);
create unique index if not exists neon_acquisti_passiva on public.neon_acquisti (passiva_id) where passiva_id is not null and annullato_il is null;

-- La prima nota: importo positivo entra, negativo esce
create table if not exists public.neon_prima_nota (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  conto_id uuid not null references public.neon_conti (id),
  data date not null,
  importo numeric(14, 2) not null check (importo <> 0),
  descrizione text not null check (char_length(descrizione) between 1 and 200),
  categoria text check (char_length(categoria) <= 40),
  soggetto_id uuid references public.neon_soggetti (id),
  documento_id uuid references public.neon_documenti (id),             -- incasso (o rimborso) di un documento di vendita
  acquisto_id uuid references public.neon_acquisti (id),               -- pagamento (o rimborso) di un acquisto
  giroconto uuid,                                                      -- le due metà di un giroconto hanno lo stesso valore
  annullato_il timestamptz,
  creato_da uuid references auth.users (id) on delete set null,
  creato_il timestamptz not null default now(),
  check (documento_id is null or acquisto_id is null)
);
create index if not exists neon_prima_nota_per_conto on public.neon_prima_nota (azienda_id, conto_id, data desc);
create index if not exists neon_prima_nota_per_documento on public.neon_prima_nota (documento_id) where documento_id is not null;
create index if not exists neon_prima_nota_per_acquisto on public.neon_prima_nota (acquisto_id) where acquisto_id is not null;

-- Le righe degli estratti conto importati, da riconciliare con la prima nota
create table if not exists public.neon_estratti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  conto_id uuid not null references public.neon_conti (id),
  data date not null,
  importo numeric(14, 2) not null,
  descrizione text check (char_length(descrizione) <= 300),
  impronta text not null,
  movimento_id uuid references public.neon_prima_nota (id),
  ignorato boolean not null default false,
  importato_il timestamptz not null default now(),
  unique (conto_id, impronta)
);
create unique index if not exists neon_estratti_movimento on public.neon_estratti (movimento_id) where movimento_id is not null;

alter table public.neon_conti enable row level security;
alter table public.neon_acquisti enable row level security;
alter table public.neon_prima_nota enable row level security;
alter table public.neon_estratti enable row level security;
create policy neon_conti_leggo on public.neon_conti for select to authenticated using (public.neon_vede_conti(azienda_id));
create policy neon_acquisti_leggo on public.neon_acquisti for select to authenticated using (public.neon_vede_conti(azienda_id));
create policy neon_prima_nota_leggo on public.neon_prima_nota for select to authenticated using (public.neon_vede_conti(azienda_id));
create policy neon_estratti_leggo on public.neon_estratti for select to authenticated using (public.neon_vede_conti(azienda_id));
revoke all on public.neon_conti, public.neon_acquisti, public.neon_prima_nota, public.neon_estratti from anon, authenticated;
grant select on public.neon_conti, public.neon_acquisti, public.neon_prima_nota, public.neon_estratti to authenticated;

-- Titolare e amministrazione: creo o modifico un conto
create or replace function public.neon_salva_conto(p_azienda uuid, p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_id;
  v_nome text := trim(coalesce(p->>'nome', ''));
  v_iban text := nullif(upper(regexp_replace(coalesce(p->>'iban', ''), '\s', '', 'g')), '');
  v_saldo numeric; v_dal date;
begin
  if not public.neon_puo(p_azienda, 'gestire') then raise exception 'Solo il titolare o l''amministrazione gestiscono i conti.'; end if;
  if char_length(v_nome) not between 2 and 60 then raise exception 'Il nome del conto va da 2 a 60 caratteri.'; end if;
  if coalesce(p->>'tipo', 'banca') not in ('cassa', 'banca', 'carta', 'altro') then raise exception 'Tipo di conto non valido.'; end if;
  if v_iban is not null and v_iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then raise exception 'L''IBAN non sembra giusto.'; end if;
  begin
    v_saldo := coalesce(nullif(p->>'saldo_iniziale', '')::numeric, 0);
    v_dal := coalesce(nullif(p->>'saldo_dal', '')::date, public.oggi_sm());
  exception when others then raise exception 'Saldo iniziale o data non validi.';
  end;
  if abs(v_saldo) >= 1e12 then raise exception 'Saldo iniziale troppo grande.'; end if;
  if v_dal > public.oggi_sm() then raise exception 'La data del saldo iniziale non può essere nel futuro.'; end if;
  if exists (select 1 from public.neon_conti where azienda_id = p_azienda and lower(nome) = lower(v_nome) and id is distinct from v_id) then
    raise exception 'C''è già un conto con questo nome.';
  end if;
  if v_id is null then
    if (select count(*) from public.neon_conti where azienda_id = p_azienda) >= 20 then raise exception 'Al massimo 20 conti.'; end if;
    insert into public.neon_conti (azienda_id, nome, saldo_dal) values (p_azienda, v_nome, v_dal) returning id into v_id;
  elsif not exists (select 1 from public.neon_conti where id = v_id and azienda_id = p_azienda) then
    raise exception 'Conto non trovato.';
  end if;
  if exists (select 1 from public.neon_prima_nota where conto_id = v_id and annullato_il is null and data < v_dal) then
    raise exception 'Ci sono movimenti prima di questa data: scegli una data del saldo iniziale precedente.';
  end if;
  update public.neon_conti set nome = v_nome, tipo = coalesce(p->>'tipo', 'banca'), iban = v_iban, saldo_iniziale = v_saldo, saldo_dal = v_dal,
    attivo = coalesce((p->>'attivo')::boolean, true)
  where id = v_id;
  return v_id;
end $$;

-- Interna: quanto resta da incassare (o rimborsare) di un documento di vendita e se è regolato
create or replace function public.neon_ricalcola_incasso(p_documento uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti; v_eff numeric; v_pag numeric; v_ultima date;
begin
  select * into d from public.neon_documenti where id = p_documento;
  if d.id is null or not exists (select 1 from public.neon_prima_nota where documento_id = d.id) then return; end if;
  v_eff := d.totale - case when d.tipo = 'nota_credito' then 0 else coalesce((select sum(n.totale) from public.neon_documenti n
    where n.collegato_id = d.id and n.tipo = 'nota_credito' and n.stato = 'emesso'), 0) end;
  select coalesce(sum(case when d.tipo = 'nota_credito' then -importo else importo end), 0), max(data) into v_pag, v_ultima
  from public.neon_prima_nota where documento_id = d.id and annullato_il is null;
  update public.neon_documenti set incassato_il = case when v_pag > 0 and v_pag >= v_eff - 0.005 then v_ultima end, aggiornato_il = now()
  where id = d.id;
end $$;

-- Interna: controlla il collegamento di un movimento a un documento di vendita o a un acquisto
create or replace function public.neon_controlla_collegamento(p_azienda uuid, p_documento uuid, p_acquisto uuid, p_soggetto uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_documento is not null and p_acquisto is not null then raise exception 'Un movimento va con un documento o con un acquisto, non con tutti e due.'; end if;
  if p_documento is not null and not exists (select 1 from public.neon_documenti where id = p_documento and azienda_id = p_azienda
      and stato = 'emesso' and tipo in ('fattura', 'acconto', 'nota_debito', 'nota_credito')) then
    raise exception 'Documento non trovato (solo fatture, acconti e note emessi).';
  end if;
  if p_acquisto is not null and not exists (select 1 from public.neon_acquisti where id = p_acquisto and azienda_id = p_azienda and annullato_il is null) then
    raise exception 'Acquisto non trovato.';
  end if;
  if p_soggetto is not null and not exists (select 1 from public.neon_soggetti where id = p_soggetto and azienda_id = p_azienda) then
    raise exception 'Cliente o fornitore non trovato.';
  end if;
end $$;

-- Titolare e amministrazione: un movimento di prima nota.
-- p = {conto_id, data, importo (+ entra, - esce), descrizione, categoria, soggetto_id, documento_id, acquisto_id}
create or replace function public.neon_movimento(p_azienda uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid; v_conto uuid; v_data date; v_imp numeric;
  v_doc uuid := nullif(p->>'documento_id', '')::uuid;
  v_acq uuid := nullif(p->>'acquisto_id', '')::uuid;
  v_sog uuid := nullif(p->>'soggetto_id', '')::uuid;
begin
  if not public.neon_puo(p_azienda, 'gestire') then raise exception 'La prima nota la scrivono il titolare o l''amministrazione.'; end if;
  begin
    v_conto := (p->>'conto_id')::uuid;
    v_data := coalesce(nullif(p->>'data', '')::date, public.oggi_sm());
    v_imp := round((p->>'importo')::numeric, 2);
  exception when others then raise exception 'Conto, data o importo non validi.';
  end;
  if not exists (select 1 from public.neon_conti where id = v_conto and azienda_id = p_azienda and attivo) then raise exception 'Scegli un conto attivo.'; end if;
  if v_imp is null or v_imp = 0 or abs(v_imp) >= 1e12 then raise exception 'Scrivi l''importo.'; end if;
  if v_data > public.oggi_sm() then raise exception 'La data non può essere nel futuro.'; end if;
  if v_data < (select saldo_dal from public.neon_conti where id = v_conto) then raise exception 'La data è prima del saldo iniziale del conto.'; end if;
  if char_length(trim(coalesce(p->>'descrizione', ''))) not between 1 and 200 then raise exception 'Scrivi una descrizione (al massimo 200 caratteri).'; end if;
  if char_length(coalesce(p->>'categoria', '')) > 40 then raise exception 'La categoria è al massimo 40 caratteri.'; end if;
  perform public.neon_controlla_collegamento(p_azienda, v_doc, v_acq, v_sog);
  if v_doc is not null and v_sog is null then select soggetto_id into v_sog from public.neon_documenti where id = v_doc; end if;
  if v_acq is not null and v_sog is null then select soggetto_id into v_sog from public.neon_acquisti where id = v_acq; end if;
  insert into public.neon_prima_nota (azienda_id, conto_id, data, importo, descrizione, categoria, soggetto_id, documento_id, acquisto_id, creato_da)
  values (p_azienda, v_conto, v_data, v_imp, trim(p->>'descrizione'), nullif(trim(coalesce(p->>'categoria', '')), ''), v_sog, v_doc, v_acq, auth.uid())
  returning id into v_id;
  if v_doc is not null then perform public.neon_ricalcola_incasso(v_doc); end if;
  return v_id;
end $$;

-- Titolare e amministrazione: giroconto tra due conti (es. versamento della cassa in banca)
create or replace function public.neon_giroconto(p_azienda uuid, p_da uuid, p_a uuid, p_data date, p_importo numeric, p_descrizione text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_g uuid := gen_random_uuid(); v_imp numeric := round(p_importo, 2); v_data date := coalesce(p_data, public.oggi_sm());
begin
  if not public.neon_puo(p_azienda, 'gestire') then raise exception 'La prima nota la scrivono il titolare o l''amministrazione.'; end if;
  if p_da = p_a or (select count(*) from public.neon_conti where id in (p_da, p_a) and azienda_id = p_azienda and attivo) <> 2 then
    raise exception 'Scegli due conti attivi diversi.';
  end if;
  if v_imp is null or v_imp <= 0 or v_imp >= 1e12 then raise exception 'L''importo del giroconto è positivo.'; end if;
  if v_data > public.oggi_sm() then raise exception 'La data non può essere nel futuro.'; end if;
  if v_data < (select max(saldo_dal) from public.neon_conti where id in (p_da, p_a)) then raise exception 'La data è prima del saldo iniziale di un conto.'; end if;
  if char_length(trim(coalesce(p_descrizione, ''))) > 200 then raise exception 'La descrizione è al massimo 200 caratteri.'; end if;
  insert into public.neon_prima_nota (azienda_id, conto_id, data, importo, descrizione, categoria, giroconto, creato_da) values
    (p_azienda, p_da, v_data, -v_imp, coalesce(nullif(trim(p_descrizione), ''), 'Giroconto'), 'Giroconto', v_g, auth.uid()),
    (p_azienda, p_a, v_data, v_imp, coalesce(nullif(trim(p_descrizione), ''), 'Giroconto'), 'Giroconto', v_g, auth.uid());
  return v_g;
end $$;

-- Titolare e amministrazione: annullo un movimento (un giroconto si annulla tutto); prima va tolto dalla riconciliazione
create or replace function public.neon_annulla_movimento(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.neon_prima_nota;
begin
  select * into m from public.neon_prima_nota where id = p_id for update;
  if m.id is null or not public.neon_puo(m.azienda_id, 'gestire') then raise exception 'Movimento non trovato.'; end if;
  if m.annullato_il is not null then raise exception 'Il movimento è già annullato.'; end if;
  if exists (select 1 from public.neon_estratti e join public.neon_prima_nota x on x.id = e.movimento_id
             where x.id = m.id or (m.giroconto is not null and x.giroconto = m.giroconto)) then
    raise exception 'Il movimento è abbinato all''estratto conto: prima togli l''abbinamento.';
  end if;
  update public.neon_prima_nota set annullato_il = now() where id = m.id or (m.giroconto is not null and giroconto = m.giroconto);
  if m.documento_id is not null then perform public.neon_ricalcola_incasso(m.documento_id); end if;
end $$;

-- Titolare e amministrazione: registro o modifico un acquisto.
-- p = {tipo, soggetto_id, fornitore, passiva_id, collegato_id, numero, data, descrizione, categoria, totale, scadenza}
create or replace function public.neon_salva_acquisto(p_azienda uuid, p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_id;
  v_tipo text := coalesce(p->>'tipo', 'fattura');
  v_sog uuid := nullif(p->>'soggetto_id', '')::uuid;
  v_pas uuid := nullif(p->>'passiva_id', '')::uuid;
  v_col uuid := nullif(p->>'collegato_id', '')::uuid;
  v_data date; v_scad date; v_tot numeric;
  v_forn text := nullif(trim(coalesce(p->>'fornitore', '')), '');
begin
  if not public.neon_puo(p_azienda, 'gestire') then raise exception 'Gli acquisti li registrano il titolare o l''amministrazione.'; end if;
  if v_tipo not in ('fattura', 'nota_credito', 'ricevuta') then raise exception 'Tipo non valido.'; end if;
  begin
    v_data := (p->>'data')::date;
    v_scad := nullif(p->>'scadenza', '')::date;
    v_tot := round((p->>'totale')::numeric, 2);
  exception when others then raise exception 'Data, scadenza o totale non validi.';
  end;
  if v_data is null then raise exception 'Scrivi la data del documento.'; end if;
  if v_data > public.oggi_sm() then raise exception 'La data non può essere nel futuro.'; end if;
  if v_tot is null or v_tot < 0 or v_tot >= 1e12 then raise exception 'Scrivi il totale (da 0 in su).'; end if;
  if v_scad is not null and v_scad < v_data then raise exception 'La scadenza non può essere prima della data.'; end if;
  if v_sog is null and v_forn is null then raise exception 'Scegli il fornitore o scrivine il nome.'; end if;
  if v_sog is not null and not exists (select 1 from public.neon_soggetti where id = v_sog and azienda_id = p_azienda) then raise exception 'Fornitore non trovato.'; end if;
  if char_length(coalesce(v_forn, '')) > 80 or char_length(coalesce(p->>'numero', '')) > 40 or char_length(coalesce(p->>'descrizione', '')) > 300
     or char_length(coalesce(p->>'categoria', '')) > 40 then raise exception 'Qualche campo è troppo lungo.'; end if;
  if v_pas is not null and not exists (select 1 from public.neon_passive where id = v_pas and azienda_id = p_azienda) then raise exception 'Fattura ricevuta non trovata.'; end if;
  if v_pas is not null and exists (select 1 from public.neon_acquisti where passiva_id = v_pas and annullato_il is null and id is distinct from v_id) then
    raise exception 'Questa fattura ricevuta è già registrata tra gli acquisti.';
  end if;
  if v_col is not null and (v_tipo <> 'nota_credito' or v_col = v_id or not exists (select 1 from public.neon_acquisti where id = v_col and azienda_id = p_azienda
      and tipo in ('fattura', 'ricevuta') and annullato_il is null)) then
    raise exception 'Una nota di credito si collega solo a una fattura dello stesso fornitore.';
  end if;
  if v_id is null then
    if (select count(*) from public.neon_acquisti where azienda_id = p_azienda and creato_il > now() - interval '1 day') >= 500 then
      raise exception 'Troppi acquisti registrati oggi.';
    end if;
    insert into public.neon_acquisti (azienda_id, data, totale, creato_da) values (p_azienda, v_data, v_tot, auth.uid()) returning id into v_id;
  elsif not exists (select 1 from public.neon_acquisti where id = v_id and azienda_id = p_azienda and annullato_il is null) then
    raise exception 'Acquisto non trovato.';
  end if;
  update public.neon_acquisti set tipo = v_tipo, soggetto_id = v_sog, fornitore = v_forn, passiva_id = v_pas, collegato_id = v_col,
    numero = nullif(trim(coalesce(p->>'numero', '')), ''), data = v_data, descrizione = nullif(trim(coalesce(p->>'descrizione', '')), ''),
    categoria = nullif(trim(coalesce(p->>'categoria', '')), ''), totale = v_tot, scadenza = v_scad, aggiornato_il = now()
  where id = v_id;
  if v_pas is not null then update public.neon_passive set stato = 'registrata' where id = v_pas and stato in ('nuova', 'vista'); end if;
  return v_id;
end $$;

-- Titolare e amministrazione: annullo un acquisto (solo senza pagamenti attivi)
create or replace function public.neon_annulla_acquisto(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.neon_acquisti;
begin
  select * into a from public.neon_acquisti where id = p_id for update;
  if a.id is null or not public.neon_puo(a.azienda_id, 'gestire') then raise exception 'Acquisto non trovato.'; end if;
  if exists (select 1 from public.neon_prima_nota where acquisto_id = p_id and annullato_il is null) then
    raise exception 'L''acquisto ha dei pagamenti: prima annulla quelli.';
  end if;
  if exists (select 1 from public.neon_acquisti where collegato_id = p_id and annullato_il is null) then
    raise exception 'C''è una nota di credito collegata: prima annulla quella.';
  end if;
  update public.neon_acquisti set annullato_il = now(), aggiornato_il = now() where id = p_id;
end $$;

-- Titolare e amministrazione: segno a mano un acquisto come pagato (es. pagato prima di usare NeonUp), o lo tolgo
create or replace function public.neon_saldo_acquisto(p_id uuid, p_data date)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.neon_acquisti;
begin
  select * into a from public.neon_acquisti where id = p_id for update;
  if a.id is null or not public.neon_puo(a.azienda_id, 'gestire') then raise exception 'Acquisto non trovato.'; end if;
  if p_data is not null and p_data > public.oggi_sm() then raise exception 'La data non può essere nel futuro.'; end if;
  update public.neon_acquisti set saldato_il = p_data, aggiornato_il = now() where id = p_id;
end $$;

-- Con l'SMR ID (chi vede i conti): saldo di ogni conto e data dell'ultimo movimento
create or replace function public.neon_saldi(p_azienda uuid)
returns table (conto_id uuid, saldo numeric, ultimo date, movimenti bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.saldo_iniziale + coalesce(sum(m.importo) filter (where m.annullato_il is null), 0),
    max(m.data) filter (where m.annullato_il is null), count(m.id) filter (where m.annullato_il is null)
  from public.neon_conti c left join public.neon_prima_nota m on m.conto_id = c.id
  where c.azienda_id = p_azienda and public.neon_vede_conti(p_azienda)
  group by c.id
$$;

-- Con l'SMR ID (chi vede i conti): lo scadenzario. «incasso» = soldi che devono entrare, «pagamento» = che devono uscire
create or replace function public.neon_scadenzario(p_azienda uuid)
returns table (lato text, documento_id uuid, acquisto_id uuid, soggetto_id uuid, soggetto text, riferimento text, data date,
               scadenza date, totale numeric, pagato numeric, residuo numeric)
language sql stable security definer set search_path = '' as $$
  with vendite as (
    select d.id, d.tipo, d.soggetto_id, d.cessionario->>'denominazione' as nome, d.numero, d.anno, d.data,
      nullif(d.pagamento->>'scadenza', '')::date as scadenza, d.incassato_il,
      d.totale - case when d.tipo = 'nota_credito' then 0 else coalesce((select sum(n.totale) from public.neon_documenti n
        where n.collegato_id = d.id and n.tipo = 'nota_credito' and n.stato = 'emesso'), 0) end as dovuto,
      coalesce((select sum(case when d.tipo = 'nota_credito' then -m.importo else m.importo end) from public.neon_prima_nota m
        where m.documento_id = d.id and m.annullato_il is null), 0) as pagato,
      exists (select 1 from public.neon_prima_nota m where m.documento_id = d.id) as con_movimenti
    from public.neon_documenti d
    where d.azienda_id = p_azienda and d.stato = 'emesso'
      and (d.tipo in ('fattura', 'acconto', 'nota_debito') or (d.tipo = 'nota_credito' and d.collegato_id is null))
  ), acquisti as (
    select a.id, a.tipo, a.soggetto_id, coalesce(s.denominazione, a.fornitore) as nome, a.numero, a.data, a.scadenza, a.saldato_il,
      a.totale - case when a.tipo = 'nota_credito' then 0 else coalesce((select sum(n.totale) from public.neon_acquisti n
        where n.collegato_id = a.id and n.tipo = 'nota_credito' and n.annullato_il is null), 0) end as dovuto,
      coalesce((select sum(case when a.tipo = 'nota_credito' then m.importo else -m.importo end) from public.neon_prima_nota m
        where m.acquisto_id = a.id and m.annullato_il is null), 0) as pagato,
      exists (select 1 from public.neon_prima_nota m where m.acquisto_id = a.id) as con_movimenti
    from public.neon_acquisti a left join public.neon_soggetti s on s.id = a.soggetto_id
    where a.azienda_id = p_azienda and a.annullato_il is null and (a.tipo <> 'nota_credito' or a.collegato_id is null)
  )
  select * from (
    select case when v.tipo = 'nota_credito' then 'pagamento' else 'incasso' end, v.id, null::uuid, v.soggetto_id, v.nome,
      case v.tipo when 'fattura' then 'Fattura ' when 'acconto' then 'Acconto ' when 'nota_debito' then 'Nota di debito ' else 'Nota di credito ' end || v.numero || '/' || v.anno,
      v.data, v.scadenza, v.dovuto, v.pagato,
      case when not v.con_movimenti and v.incassato_il is not null then 0 else greatest(v.dovuto - v.pagato, 0) end
    from vendite v
    union all
    select case when a.tipo = 'nota_credito' then 'incasso' else 'pagamento' end, null, a.id, a.soggetto_id, a.nome,
      case a.tipo when 'fattura' then 'Fattura ' when 'ricevuta' then 'Spesa ' else 'Nota di credito ' end || coalesce(a.numero, ''),
      a.data, a.scadenza, a.dovuto, a.pagato,
      case when not a.con_movimenti and a.saldato_il is not null then 0 else greatest(a.dovuto - a.pagato, 0) end
    from acquisti a
  ) x (lato, documento_id, acquisto_id, soggetto_id, soggetto, riferimento, data, scadenza, totale, pagato, residuo)
  where x.residuo > 0.005 and public.neon_vede_conti(p_azienda)
  order by x.scadenza nulls last, x.data
$$;

-- Titolare e amministrazione: importo le righe di un estratto conto. p_righe = [{data, importo, descrizione}].
-- La stessa riga importata due volte non si ripete (impronta di data, importo, descrizione e quante volte compare nel file).
create or replace function public.neon_importa_estratto(p_conto uuid, p_righe jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.neon_conti; r jsonb; v_n integer := 0; v_nuove integer := 0;
  v_data date; v_imp numeric; v_des text; v_chiave text; v_volte jsonb := '{}'::jsonb; v_k integer;
begin
  select * into c from public.neon_conti where id = p_conto;
  if c.id is null or not public.neon_puo(c.azienda_id, 'gestire') then raise exception 'Conto non trovato.'; end if;
  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then raise exception 'Il file non ha righe.'; end if;
  if jsonb_array_length(p_righe) > 3000 then raise exception 'Al massimo 3000 righe per volta.'; end if;
  for r in select value from jsonb_array_elements(p_righe) loop
    v_n := v_n + 1;
    begin
      v_data := (r->>'data')::date;
      v_imp := round((r->>'importo')::numeric, 2);
    exception when others then raise exception 'Riga %: data o importo non validi.', v_n;
    end;
    if v_data is null or v_imp is null or abs(v_imp) >= 1e12 then raise exception 'Riga %: data o importo mancanti.', v_n; end if;
    if v_data > public.oggi_sm() + 3 then raise exception 'Riga %: la data è nel futuro.', v_n; end if;
    if v_imp = 0 then continue; end if;
    v_des := left(regexp_replace(trim(coalesce(r->>'descrizione', '')), '\s+', ' ', 'g'), 300);
    v_chiave := v_data || '|' || v_imp || '|' || v_des;
    v_k := coalesce((v_volte->>v_chiave)::integer, 0) + 1;
    v_volte := v_volte || jsonb_build_object(v_chiave, v_k);
    insert into public.neon_estratti (azienda_id, conto_id, data, importo, descrizione, impronta)
    values (c.azienda_id, c.id, v_data, v_imp, nullif(v_des, ''), md5(v_chiave || '|' || v_k))
    on conflict (conto_id, impronta) do nothing;
    if found then v_nuove := v_nuove + 1; end if;
  end loop;
  return jsonb_build_object('righe', v_n, 'nuove', v_nuove);
end $$;

-- Titolare e amministrazione: abbino una riga dell'estratto a un movimento (stesso conto, stesso importo), o tolgo l'abbinamento
create or replace function public.neon_abbina(p_estratto uuid, p_movimento uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.neon_estratti; m public.neon_prima_nota;
begin
  select * into e from public.neon_estratti where id = p_estratto for update;
  if e.id is null or not public.neon_puo(e.azienda_id, 'gestire') then raise exception 'Riga dell''estratto non trovata.'; end if;
  if p_movimento is null then
    update public.neon_estratti set movimento_id = null where id = e.id;
    return;
  end if;
  select * into m from public.neon_prima_nota where id = p_movimento;
  if m.id is null or m.conto_id <> e.conto_id or m.annullato_il is not null then raise exception 'Movimento non trovato su questo conto.'; end if;
  if m.importo <> e.importo then raise exception 'Gli importi non sono uguali.'; end if;
  if exists (select 1 from public.neon_estratti where movimento_id = m.id and id <> e.id) then raise exception 'Il movimento è già abbinato a un''altra riga.'; end if;
  update public.neon_estratti set movimento_id = m.id, ignorato = false where id = e.id;
end $$;

-- Titolare e amministrazione: dalla riga dell'estratto creo il movimento di prima nota e lo abbino.
-- p = {descrizione, categoria, soggetto_id, documento_id, acquisto_id}
create or replace function public.neon_movimento_da_estratto(p_estratto uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare e public.neon_estratti; v_id uuid;
begin
  select * into e from public.neon_estratti where id = p_estratto for update;
  if e.id is null or not public.neon_puo(e.azienda_id, 'gestire') then raise exception 'Riga dell''estratto non trovata.'; end if;
  if e.movimento_id is not null then raise exception 'La riga è già abbinata.'; end if;
  v_id := public.neon_movimento(e.azienda_id, jsonb_build_object('conto_id', e.conto_id, 'data', least(e.data, public.oggi_sm()), 'importo', e.importo,
    'descrizione', coalesce(nullif(trim(coalesce(p->>'descrizione', '')), ''), left(coalesce(e.descrizione, 'Movimento di banca'), 200)),
    'categoria', p->>'categoria', 'soggetto_id', p->>'soggetto_id', 'documento_id', p->>'documento_id', 'acquisto_id', p->>'acquisto_id'));
  update public.neon_estratti set movimento_id = v_id, ignorato = false where id = e.id;
  return v_id;
end $$;

-- Titolare e amministrazione: una riga dell'estratto da non riconciliare (o da rimettere tra quelle da vedere)
create or replace function public.neon_ignora_estratto(p_estratto uuid, p_ignora boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.neon_estratti;
begin
  select * into e from public.neon_estratti where id = p_estratto for update;
  if e.id is null or not public.neon_puo(e.azienda_id, 'gestire') then raise exception 'Riga dell''estratto non trovata.'; end if;
  if e.movimento_id is not null then raise exception 'La riga è abbinata: prima togli l''abbinamento.'; end if;
  update public.neon_estratti set ignorato = coalesce(p_ignora, true) where id = e.id;
end $$;

revoke all on function public.neon_ricalcola_incasso(uuid), public.neon_controlla_collegamento(uuid, uuid, uuid, uuid) from anon, authenticated, public;
revoke all on function public.neon_vede_conti(uuid), public.neon_salva_conto(uuid, uuid, jsonb), public.neon_movimento(uuid, jsonb),
  public.neon_giroconto(uuid, uuid, uuid, date, numeric, text), public.neon_annulla_movimento(uuid), public.neon_salva_acquisto(uuid, uuid, jsonb),
  public.neon_annulla_acquisto(uuid), public.neon_saldo_acquisto(uuid, date), public.neon_saldi(uuid), public.neon_scadenzario(uuid),
  public.neon_importa_estratto(uuid, jsonb), public.neon_abbina(uuid, uuid), public.neon_movimento_da_estratto(uuid, jsonb),
  public.neon_ignora_estratto(uuid, boolean) from anon, public;
grant execute on function public.neon_vede_conti(uuid), public.neon_salva_conto(uuid, uuid, jsonb), public.neon_movimento(uuid, jsonb),
  public.neon_giroconto(uuid, uuid, uuid, date, numeric, text), public.neon_annulla_movimento(uuid), public.neon_salva_acquisto(uuid, uuid, jsonb),
  public.neon_annulla_acquisto(uuid), public.neon_saldo_acquisto(uuid, date), public.neon_saldi(uuid), public.neon_scadenzario(uuid),
  public.neon_importa_estratto(uuid, jsonb), public.neon_abbina(uuid, uuid), public.neon_movimento_da_estratto(uuid, jsonb),
  public.neon_ignora_estratto(uuid, boolean) to authenticated;
