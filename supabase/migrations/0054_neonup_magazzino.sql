-- NeonUp fase 3: il magazzino (22/10/2026, richiesta di Alex: «procedi con la fase 3, magazzino»; vedi docs/neonup.md).
-- Depositi, articoli gestiti a magazzino (scorta minima, varianti, lotti con scadenza), operazioni di magazzino
-- (carico, scarico, rettifica, trasferimento, inventario) e i movimenti che nascono da soli dai documenti di vendita:
-- il DDT scarica, la fattura scarica le righe che nessun DDT di NeonUp ha già scaricato, la nota di credito ricarica
-- le righe segnate «rientra in magazzino». Annullare un DDT storna il suo scarico.
-- Oggetti nuovi più due funzioni sostituite (neon_emetti, neon_annulla: il 22/10/2026 le tabelle di NeonUp sono vuote).
-- Niente cancellazioni: un'operazione sbagliata si corregge con lo storno, che scrive i movimenti opposti.

create table if not exists public.neon_depositi (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 60),
  predefinito boolean not null default false,
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);
create unique index if not exists neon_depositi_predefinito on public.neon_depositi (azienda_id) where predefinito;
create unique index if not exists neon_depositi_nome on public.neon_depositi (azienda_id, lower(nome));

-- Come si gestisce un articolo a magazzino (gli articoli senza questa riga non muovono niente)
create table if not exists public.neon_mag_articoli (
  articolo_id uuid primary key references public.neon_articoli (id) on delete cascade,
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  gestito boolean not null default true,
  scorta_minima numeric(14, 3) check (scorta_minima >= 0),
  varianti text[] not null default '{}' check (cardinality(varianti) <= 50),
  lotti boolean not null default false,
  aggiornato_il timestamptz not null default now()
);

create table if not exists public.neon_mag_operazioni (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  tipo text not null check (tipo in ('carico', 'scarico', 'rettifica', 'trasferimento', 'inventario', 'vendita', 'reso', 'storno')),
  data date not null,
  soggetto_id uuid references public.neon_soggetti (id),
  riferimento text check (char_length(riferimento) <= 60),             -- es. il DDT del fornitore
  documento_id uuid references public.neon_documenti (id),             -- il documento di vendita che l'ha generata
  passiva_id uuid references public.neon_passive (id),                 -- la fattura ricevuta da cui è nato il carico
  storno_di uuid references public.neon_mag_operazioni (id),
  stornata boolean not null default false,
  nota text check (char_length(nota) <= 300),
  creato_da uuid references auth.users (id) on delete set null,
  creato_il timestamptz not null default now()
);
create index if not exists neon_mag_operazioni_per_azienda on public.neon_mag_operazioni (azienda_id, data desc, creato_il desc);
create index if not exists neon_mag_operazioni_per_documento on public.neon_mag_operazioni (documento_id) where documento_id is not null;
create unique index if not exists neon_mag_storno_unico on public.neon_mag_operazioni (storno_di) where storno_di is not null;

create table if not exists public.neon_mag_movimenti (
  id bigint generated always as identity primary key,
  operazione_id uuid not null references public.neon_mag_operazioni (id) on delete cascade,
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  deposito_id uuid not null references public.neon_depositi (id),
  articolo_id uuid not null references public.neon_articoli (id),
  variante text not null default '' check (char_length(variante) <= 40),
  lotto text not null default '' check (char_length(lotto) <= 40),
  scadenza date,
  quantita numeric(14, 3) not null check (quantita <> 0),             -- positiva entra, negativa esce
  costo numeric(19, 6) check (costo >= 0),                             -- costo unitario, nei carichi
  riga smallint
);
create index if not exists neon_mag_movimenti_per_articolo on public.neon_mag_movimenti (azienda_id, articolo_id, deposito_id);
create index if not exists neon_mag_movimenti_per_operazione on public.neon_mag_movimenti (operazione_id);

alter table public.neon_depositi enable row level security;
alter table public.neon_mag_articoli enable row level security;
alter table public.neon_mag_operazioni enable row level security;
alter table public.neon_mag_movimenti enable row level security;

create policy neon_depositi_leggo on public.neon_depositi for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_mag_articoli_leggo on public.neon_mag_articoli for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_mag_operazioni_leggo on public.neon_mag_operazioni for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_mag_movimenti_leggo on public.neon_mag_movimenti for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));

revoke all on public.neon_depositi, public.neon_mag_articoli, public.neon_mag_operazioni, public.neon_mag_movimenti from anon, authenticated;
grant select on public.neon_depositi, public.neon_mag_articoli, public.neon_mag_operazioni, public.neon_mag_movimenti to authenticated;

-- Il deposito predefinito dell'azienda (lo crea la prima volta: «Magazzino»)
create or replace function public.neon_mag_deposito(p_azienda uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.neon_depositi where azienda_id = p_azienda and predefinito;
  if v_id is null then
    insert into public.neon_depositi (azienda_id, nome, predefinito) values (p_azienda, 'Magazzino', true)
    on conflict do nothing returning id into v_id;
    if v_id is null then select id into v_id from public.neon_depositi where azienda_id = p_azienda and predefinito; end if;
  end if;
  return v_id;
end $$;

-- Con l'SMR ID: apro il magazzino (crea il deposito predefinito se manca)
create or replace function public.neon_mag_avvia(p_azienda uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.neon_puo(p_azienda, 'vendere') then raise exception 'Non puoi usare il magazzino di questa azienda.'; end if;
  return public.neon_mag_deposito(p_azienda);
end $$;

-- Titolare e amministrazione: creo o modifico un deposito
create or replace function public.neon_salva_deposito(p_azienda uuid, p_id uuid, p_nome text, p_predefinito boolean, p_attivo boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_id; v_nome text := trim(coalesce(p_nome, ''));
begin
  if not public.neon_puo(p_azienda, 'gestire') then raise exception 'Solo il titolare o l''amministrazione gestiscono i depositi.'; end if;
  if char_length(v_nome) not between 2 and 60 then raise exception 'Il nome del deposito va da 2 a 60 caratteri.'; end if;
  if exists (select 1 from public.neon_depositi where azienda_id = p_azienda and lower(nome) = lower(v_nome) and id is distinct from v_id) then
    raise exception 'C''è già un deposito con questo nome.';
  end if;
  if coalesce(p_predefinito, false) and not coalesce(p_attivo, true) then raise exception 'Il deposito predefinito deve restare attivo.'; end if;
  if v_id is null then
    if (select count(*) from public.neon_depositi where azienda_id = p_azienda) >= 20 then raise exception 'Al massimo 20 depositi.'; end if;
    insert into public.neon_depositi (azienda_id, nome) values (p_azienda, v_nome) returning id into v_id;
  else
    if not exists (select 1 from public.neon_depositi where id = v_id and azienda_id = p_azienda) then raise exception 'Deposito non trovato.'; end if;
    if not coalesce(p_attivo, true) and exists (select 1 from public.neon_depositi where id = v_id and predefinito) and not coalesce(p_predefinito, false) then
      raise exception 'Prima scegli un altro deposito predefinito.';
    end if;
  end if;
  if coalesce(p_predefinito, false) then
    update public.neon_depositi set predefinito = false where azienda_id = p_azienda and predefinito and id <> v_id;
  end if;
  update public.neon_depositi set nome = v_nome, attivo = coalesce(p_attivo, true),
    predefinito = case when coalesce(p_predefinito, false) then true else predefinito end
  where id = v_id;
  return v_id;
end $$;

-- Come gestisco un articolo: a magazzino o no, scorta minima, varianti (es. taglie), lotti con scadenza
create or replace function public.neon_salva_mag_articolo(p_articolo uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_az uuid;
  v_var text[] := '{}';
  v text;
  v_scorta numeric;
begin
  select azienda_id into v_az from public.neon_articoli where id = p_articolo;
  if v_az is null or not public.neon_puo(v_az, 'vendere') then raise exception 'Articolo non trovato.'; end if;
  if jsonb_typeof(p->'varianti') = 'array' then
    for v in select trim(value) from jsonb_array_elements_text(p->'varianti') loop
      if v = '' then continue; end if;
      if char_length(v) > 40 then raise exception 'Ogni variante al massimo 40 caratteri.'; end if;
      if not v = any (v_var) then v_var := v_var || v; end if;
    end loop;
  end if;
  if cardinality(v_var) > 50 then raise exception 'Al massimo 50 varianti per articolo.'; end if;
  begin
    v_scorta := nullif(p->>'scorta_minima', '')::numeric;
  exception when others then raise exception 'La scorta minima è un numero.';
  end;
  if v_scorta is not null and (v_scorta < 0 or v_scorta >= 1e11) then raise exception 'La scorta minima va da 0 in su.'; end if;
  -- Varianti già usate nei movimenti non si tolgono: la giacenza resterebbe senza nome
  if exists (select 1 from public.neon_mag_movimenti m where m.articolo_id = p_articolo and m.variante <> '' and not m.variante = any (v_var)) then
    raise exception 'Una variante con movimenti non si può togliere.';
  end if;
  if cardinality(v_var) = 0 and exists (select 1 from public.neon_mag_movimenti m where m.articolo_id = p_articolo and m.variante <> '') then
    raise exception 'L''articolo ha movimenti con le varianti: lasciale.';
  end if;
  insert into public.neon_mag_articoli (articolo_id, azienda_id, gestito, scorta_minima, varianti, lotti)
  values (p_articolo, v_az, coalesce((p->>'gestito')::boolean, true), v_scorta, v_var, coalesce((p->>'lotti')::boolean, false))
  on conflict (articolo_id) do update set gestito = excluded.gestito, scorta_minima = excluded.scorta_minima,
    varianti = excluded.varianti, lotti = excluded.lotti, aggiornato_il = now();
end $$;

-- Quanto c'è adesso di un articolo in un deposito (variante e lotto: null = tutti)
create or replace function public.neon_mag_giacenza(p_articolo uuid, p_deposito uuid, p_variante text default null, p_lotto text default null)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(quantita), 0) from public.neon_mag_movimenti
  where articolo_id = p_articolo and deposito_id = p_deposito
    and (p_variante is null or variante = p_variante) and (p_lotto is null or lotto = p_lotto)
$$;

-- Scrive un movimento. Un'uscita di un articolo a lotti senza lotto scelto scarica prima i lotti che scadono prima;
-- quello che manca resta «senza lotto» (in negativo, da sistemare con un carico o una rettifica).
create or replace function public.neon_mag_muovi(p_op uuid, p_azienda uuid, p_deposito uuid, p_articolo uuid, p_variante text, p_lotto text,
  p_scadenza date, p_quantita numeric, p_costo numeric, p_riga smallint, p_lotti boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_resto numeric := -p_quantita;
  l record;
  v_q numeric;
  v_scad date := p_scadenza;
begin
  if p_quantita = 0 then return; end if;
  if p_quantita < 0 and p_lotti and coalesce(p_lotto, '') = '' then
    for l in
      select m.lotto, min(m.scadenza) as scadenza, sum(m.quantita) as q from public.neon_mag_movimenti m
      where m.articolo_id = p_articolo and m.deposito_id = p_deposito and m.variante = coalesce(p_variante, '') and m.lotto <> ''
      group by m.lotto having sum(m.quantita) > 0
      order by min(m.scadenza) nulls last, m.lotto
    loop
      exit when v_resto <= 0;
      v_q := least(v_resto, l.q);
      insert into public.neon_mag_movimenti (operazione_id, azienda_id, deposito_id, articolo_id, variante, lotto, scadenza, quantita, riga)
      values (p_op, p_azienda, p_deposito, p_articolo, coalesce(p_variante, ''), l.lotto, l.scadenza, -v_q, p_riga);
      v_resto := v_resto - v_q;
    end loop;
    if v_resto > 0 then
      insert into public.neon_mag_movimenti (operazione_id, azienda_id, deposito_id, articolo_id, variante, lotto, quantita, riga)
      values (p_op, p_azienda, p_deposito, p_articolo, coalesce(p_variante, ''), '', -v_resto, p_riga);
    end if;
    return;
  end if;
  -- La scadenza di un lotto è quella del suo primo carico
  if coalesce(p_lotto, '') <> '' and v_scad is null then
    select min(scadenza) into v_scad from public.neon_mag_movimenti
    where articolo_id = p_articolo and lotto = p_lotto and scadenza is not null;
  end if;
  insert into public.neon_mag_movimenti (operazione_id, azienda_id, deposito_id, articolo_id, variante, lotto, scadenza, quantita, costo, riga)
  values (p_op, p_azienda, p_deposito, p_articolo, coalesce(p_variante, ''), coalesce(p_lotto, ''), v_scad, p_quantita,
    case when p_quantita > 0 then p_costo end, p_riga);
end $$;

-- Controlla variante e lotto di una riga per un articolo gestito
create or replace function public.neon_mag_controlla(p_n integer, p_cfg public.neon_mag_articoli, p_variante text, p_lotto text, p_lotto_serve boolean)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if cardinality(p_cfg.varianti) > 0 and (coalesce(p_variante, '') = '' or not p_variante = any (p_cfg.varianti)) then
    raise exception 'Riga %: scegli la variante (%).', p_n, array_to_string(p_cfg.varianti, ', ');
  end if;
  if cardinality(p_cfg.varianti) = 0 and coalesce(p_variante, '') <> '' then
    raise exception 'Riga %: questo articolo non ha varianti.', p_n;
  end if;
  if not p_cfg.lotti and coalesce(p_lotto, '') <> '' then raise exception 'Riga %: questo articolo non è gestito a lotti.', p_n; end if;
  if p_cfg.lotti and p_lotto_serve and coalesce(p_lotto, '') = '' then raise exception 'Riga %: scrivi il lotto.', p_n; end if;
  if char_length(coalesce(p_lotto, '')) > 40 or char_length(coalesce(p_variante, '')) > 40 then
    raise exception 'Riga %: variante e lotto al massimo 40 caratteri.', p_n;
  end if;
end $$;

-- Con l'SMR ID: registro un'operazione a mano. p = {tipo: carico|scarico|rettifica|trasferimento, data, deposito_id,
-- deposito_a (trasferimento), soggetto_id, riferimento, passiva_id, nota, righe: [{articolo_id, variante, lotto, scadenza, quantita, costo}]}
create or replace function public.neon_mag_registra(p_azienda uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_tipo text := p->>'tipo';
  v_data date;
  v_dep uuid; v_dep_a uuid;
  v_sog uuid := nullif(p->>'soggetto_id', '')::uuid;
  v_pas uuid := nullif(p->>'passiva_id', '')::uuid;
  v_op uuid;
  r jsonb;
  v_n integer := 0;
  v_art uuid;
  cfg public.neon_mag_articoli;
  v_q numeric; v_costo numeric; v_scad date;
  v_var text; v_lot text;
begin
  if not public.neon_puo(p_azienda, 'vendere') then raise exception 'Non puoi registrare movimenti in questa azienda.'; end if;
  if coalesce(v_tipo, '') not in ('carico', 'scarico', 'rettifica', 'trasferimento') then raise exception 'Tipo di operazione non valido.'; end if;
  begin
    v_data := coalesce(nullif(p->>'data', '')::date, public.oggi_sm());
  exception when others then raise exception 'La data non è valida.';
  end;
  if v_data > public.oggi_sm() then raise exception 'La data non può essere nel futuro.'; end if;
  if v_data < public.oggi_sm() - 3660 then raise exception 'La data è troppo lontana.'; end if;
  v_dep := coalesce(nullif(p->>'deposito_id', '')::uuid, public.neon_mag_deposito(p_azienda));
  if not exists (select 1 from public.neon_depositi where id = v_dep and azienda_id = p_azienda and attivo) then raise exception 'Scegli un deposito attivo.'; end if;
  if v_tipo = 'trasferimento' then
    v_dep_a := nullif(p->>'deposito_a', '')::uuid;
    if v_dep_a is null or v_dep_a = v_dep or not exists (select 1 from public.neon_depositi where id = v_dep_a and azienda_id = p_azienda and attivo) then
      raise exception 'Scegli il deposito di arrivo, diverso da quello di partenza.';
    end if;
  end if;
  if v_sog is not null and not exists (select 1 from public.neon_soggetti where id = v_sog and azienda_id = p_azienda) then raise exception 'Fornitore non trovato.'; end if;
  if v_pas is not null and not exists (select 1 from public.neon_passive where id = v_pas and azienda_id = p_azienda) then raise exception 'Fattura ricevuta non trovata.'; end if;
  if char_length(coalesce(p->>'riferimento', '')) > 60 then raise exception 'Il riferimento è al massimo 60 caratteri.'; end if;
  if char_length(coalesce(p->>'nota', '')) > 300 then raise exception 'La nota è al massimo 300 caratteri.'; end if;
  if jsonb_typeof(p->'righe') <> 'array' or jsonb_array_length(p->'righe') = 0 then raise exception 'Aggiungi almeno un articolo.'; end if;
  if jsonb_array_length(p->'righe') > 300 then raise exception 'Al massimo 300 righe per operazione.'; end if;

  insert into public.neon_mag_operazioni (azienda_id, tipo, data, soggetto_id, riferimento, passiva_id, nota, creato_da)
  values (p_azienda, v_tipo, v_data, v_sog, nullif(trim(coalesce(p->>'riferimento', '')), ''), v_pas, nullif(trim(coalesce(p->>'nota', '')), ''), auth.uid())
  returning id into v_op;

  for r in select value from jsonb_array_elements(p->'righe') loop
    v_n := v_n + 1;
    begin
      v_art := (r->>'articolo_id')::uuid;
      v_q := (r->>'quantita')::numeric;
      v_costo := nullif(r->>'costo', '')::numeric;
      v_scad := nullif(r->>'scadenza', '')::date;
    exception when others then raise exception 'Riga %: articolo, quantità, costo o scadenza non sono validi.', v_n;
    end;
    if v_art is null or not exists (select 1 from public.neon_articoli where id = v_art and azienda_id = p_azienda) then raise exception 'Riga %: scegli un articolo.', v_n; end if;
    if v_q is null or v_q = 0 or abs(v_q) >= 1e10 then raise exception 'Riga %: scrivi la quantità.', v_n; end if;
    if v_tipo <> 'rettifica' and v_q < 0 then raise exception 'Riga %: la quantità è positiva.', v_n; end if;
    if v_costo is not null and (v_costo < 0 or v_costo >= 1e11) then raise exception 'Riga %: il costo non è valido.', v_n; end if;
    -- Il primo carico mette l'articolo a magazzino
    select * into cfg from public.neon_mag_articoli where articolo_id = v_art;
    if cfg.articolo_id is null then
      insert into public.neon_mag_articoli (articolo_id, azienda_id) values (v_art, p_azienda) returning * into cfg;
    elsif not cfg.gestito then
      raise exception 'Riga %: l''articolo non è gestito a magazzino (si cambia negli Articoli).', v_n;
    end if;
    v_var := nullif(trim(coalesce(r->>'variante', '')), '');
    v_lot := nullif(trim(coalesce(r->>'lotto', '')), '');
    perform public.neon_mag_controlla(v_n, cfg, v_var, v_lot, v_tipo = 'carico' or (v_tipo = 'rettifica' and v_q > 0));
    if v_tipo = 'carico' then
      perform public.neon_mag_muovi(v_op, p_azienda, v_dep, v_art, v_var, v_lot, v_scad, v_q, v_costo, v_n::smallint, cfg.lotti);
    elsif v_tipo = 'scarico' then
      perform public.neon_mag_muovi(v_op, p_azienda, v_dep, v_art, v_var, v_lot, null, -v_q, null, v_n::smallint, cfg.lotti);
    elsif v_tipo = 'rettifica' then
      perform public.neon_mag_muovi(v_op, p_azienda, v_dep, v_art, v_var, v_lot, v_scad, v_q, null, v_n::smallint, cfg.lotti);
    else
      -- Trasferimento: esce dal deposito di partenza (lotto per lotto) ed entra nell'altro con gli stessi lotti
      perform public.neon_mag_muovi(v_op, p_azienda, v_dep, v_art, v_var, v_lot, null, -v_q, null, v_n::smallint, cfg.lotti);
      insert into public.neon_mag_movimenti (operazione_id, azienda_id, deposito_id, articolo_id, variante, lotto, scadenza, quantita, riga)
      select v_op, p_azienda, v_dep_a, m.articolo_id, m.variante, m.lotto, m.scadenza, -m.quantita, m.riga
      from public.neon_mag_movimenti m where m.operazione_id = v_op and m.riga = v_n and m.deposito_id = v_dep;
    end if;
  end loop;
  return v_op;
end $$;

-- Titolare e amministrazione: l'inventario di un deposito. p_righe = [{articolo_id, variante, lotto, contati}]:
-- per ogni riga la differenza tra quello che si è contato e quello che risulta diventa una rettifica.
create or replace function public.neon_mag_inventario(p_azienda uuid, p_deposito uuid, p_righe jsonb, p_nota text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_op uuid;
  r jsonb;
  v_n integer := 0; v_diff integer := 0;
  v_art uuid; v_contati numeric; v_ora numeric;
  cfg public.neon_mag_articoli;
  v_var text; v_lot text;
begin
  if not public.neon_puo(p_azienda, 'gestire') then raise exception 'L''inventario lo registrano il titolare o l''amministrazione.'; end if;
  if not exists (select 1 from public.neon_depositi where id = p_deposito and azienda_id = p_azienda and attivo) then raise exception 'Scegli un deposito attivo.'; end if;
  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then raise exception 'Conta almeno un articolo.'; end if;
  if jsonb_array_length(p_righe) > 3000 then raise exception 'Al massimo 3000 righe per inventario.'; end if;
  if char_length(coalesce(p_nota, '')) > 300 then raise exception 'La nota è al massimo 300 caratteri.'; end if;
  insert into public.neon_mag_operazioni (azienda_id, tipo, data, nota, creato_da)
  values (p_azienda, 'inventario', public.oggi_sm(), nullif(trim(coalesce(p_nota, '')), ''), auth.uid()) returning id into v_op;
  for r in select value from jsonb_array_elements(p_righe) loop
    v_n := v_n + 1;
    begin
      v_art := (r->>'articolo_id')::uuid;
      v_contati := (r->>'contati')::numeric;
    exception when others then raise exception 'Riga %: articolo o quantità contata non validi.', v_n;
    end;
    if v_contati is null or v_contati < 0 or v_contati >= 1e10 then raise exception 'Riga %: la quantità contata va da 0 in su.', v_n; end if;
    select * into cfg from public.neon_mag_articoli where articolo_id = v_art and azienda_id = p_azienda and gestito;
    if cfg.articolo_id is null then raise exception 'Riga %: l''articolo non è gestito a magazzino.', v_n; end if;
    v_var := coalesce(nullif(trim(coalesce(r->>'variante', '')), ''), '');
    v_lot := coalesce(nullif(trim(coalesce(r->>'lotto', '')), ''), '');
    perform public.neon_mag_controlla(v_n, cfg, nullif(v_var, ''), nullif(v_lot, ''), false);
    v_ora := public.neon_mag_giacenza(v_art, p_deposito, v_var, v_lot);
    if v_contati <> v_ora then
      insert into public.neon_mag_movimenti (operazione_id, azienda_id, deposito_id, articolo_id, variante, lotto, scadenza, quantita, riga)
      values (v_op, p_azienda, p_deposito, v_art, v_var, v_lot,
        case when v_lot <> '' then (select min(scadenza) from public.neon_mag_movimenti where articolo_id = v_art and lotto = v_lot) end,
        v_contati - v_ora, v_n);
      v_diff := v_diff + 1;
    end if;
  end loop;
  update public.neon_mag_operazioni set riferimento = v_n || ' righe contate, ' || v_diff || ' differenze' where id = v_op;
  return v_diff;
end $$;

-- Storno: scrive i movimenti opposti di un'operazione fatta a mano (quelle dei documenti si stornano annullando il documento)
create or replace function public.neon_mag_storna(p_operazione uuid, p_nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare o public.neon_mag_operazioni; v_op uuid;
begin
  select * into o from public.neon_mag_operazioni where id = p_operazione for update;
  if o.id is null or not public.neon_puo(o.azienda_id, case when o.tipo = 'inventario' then 'gestire' else 'vendere' end) then raise exception 'Operazione non trovata.'; end if;
  if o.stornata then raise exception 'Questa operazione è già stata stornata.'; end if;
  if o.tipo in ('vendita', 'reso', 'storno') then raise exception 'Questa operazione viene da un documento: si corregge dal documento.'; end if;
  if char_length(coalesce(p_nota, '')) > 300 then raise exception 'La nota è al massimo 300 caratteri.'; end if;
  insert into public.neon_mag_operazioni (azienda_id, tipo, data, storno_di, nota, creato_da)
  values (o.azienda_id, 'storno', public.oggi_sm(), o.id, nullif(trim(coalesce(p_nota, '')), ''), auth.uid()) returning id into v_op;
  insert into public.neon_mag_movimenti (operazione_id, azienda_id, deposito_id, articolo_id, variante, lotto, scadenza, quantita, riga)
  select v_op, m.azienda_id, m.deposito_id, m.articolo_id, m.variante, m.lotto, m.scadenza, -m.quantita, m.riga
  from public.neon_mag_movimenti m where m.operazione_id = o.id;
  update public.neon_mag_operazioni set stornata = true where id = o.id;
  return v_op;
end $$;

-- Interna: i movimenti di un documento appena emesso
create or replace function public.neon_mag_da_documento(p_documento uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  d public.neon_documenti;
  x jsonb; r jsonb;
  v_coperte integer[] := '{}';
  v_tutte boolean := false;
  v_segno integer;
  v_op uuid;
  cfg public.neon_mag_articoli;
  v_dep uuid;
  v_n integer;
  v_q numeric;
begin
  select * into d from public.neon_documenti where id = p_documento;
  if d.stato <> 'emesso' or d.tipo not in ('ddt', 'fattura', 'nota_credito') then return; end if;
  v_segno := case d.tipo when 'nota_credito' then 1 else -1 end;
  -- Una fattura non scarica le righe che un DDT di NeonUp ha già scaricato
  if d.tipo = 'fattura' then
    for x in select value from jsonb_array_elements(d.ddt) loop
      if exists (select 1 from public.neon_documenti t where t.azienda_id = d.azienda_id and t.tipo = 'ddt' and t.stato = 'emesso'
                 and t.numero = trim(x->>'numero') and t.data = nullif(x->>'data', '')::date) then
        if jsonb_array_length(d.ddt) = 1 or coalesce(jsonb_array_length(x->'righe'), 0) = 0 then
          v_tutte := true;
        else
          v_coperte := v_coperte || array(select (value)::integer from jsonb_array_elements_text(x->'righe'));
        end if;
      end if;
    end loop;
    if v_tutte then return; end if;
  end if;

  for r in select value from jsonb_array_elements(d.righe) loop
    v_n := (r->>'n')::integer;
    if nullif(r->>'articolo_id', '') is null or v_n = any (v_coperte) then continue; end if;
    if d.tipo = 'nota_credito' and not coalesce((r->>'rientra')::boolean, false) then continue; end if;
    select * into cfg from public.neon_mag_articoli where articolo_id = (r->>'articolo_id')::uuid and azienda_id = d.azienda_id and gestito;
    if cfg.articolo_id is null then continue; end if;
    perform public.neon_mag_controlla(v_n, cfg, nullif(r->>'variante', ''), nullif(r->>'lotto', ''), false);
    v_dep := (select id from public.neon_depositi where id = nullif(r->>'deposito_id', '')::uuid and azienda_id = d.azienda_id and attivo);
    v_dep := coalesce(v_dep, public.neon_mag_deposito(d.azienda_id));
    if v_op is null then
      insert into public.neon_mag_operazioni (azienda_id, tipo, data, soggetto_id, riferimento, documento_id, creato_da)
      values (d.azienda_id, case d.tipo when 'nota_credito' then 'reso' else 'vendita' end, d.data, d.soggetto_id,
        case d.tipo when 'ddt' then 'DDT ' when 'fattura' then 'Fattura ' else 'Nota di credito ' end || d.numero || '/' || d.anno, d.id, auth.uid())
      returning id into v_op;
    end if;
    v_q := (r->>'quantita')::numeric;
    perform public.neon_mag_muovi(v_op, d.azienda_id, v_dep, cfg.articolo_id, nullif(r->>'variante', ''), nullif(r->>'lotto', ''),
      null, v_segno * v_q, null, v_n::smallint, cfg.lotti);
  end loop;
end $$;

-- Con l'SMR ID: giacenze per articolo, deposito, variante e lotto (solo dove non è zero)
create or replace function public.neon_mag_giacenze(p_azienda uuid)
returns table (articolo_id uuid, deposito_id uuid, variante text, lotto text, scadenza date, quantita numeric)
language sql stable security definer set search_path = '' as $$
  select m.articolo_id, m.deposito_id, m.variante, m.lotto, min(m.scadenza), sum(m.quantita)
  from public.neon_mag_movimenti m
  where m.azienda_id = p_azienda and public.neon_puo(p_azienda, 'leggere')
  group by m.articolo_id, m.deposito_id, m.variante, m.lotto
  having sum(m.quantita) <> 0
$$;

-- Con l'SMR ID: costo medio dei carichi (non stornati) e data dell'ultimo movimento per articolo
create or replace function public.neon_mag_costi(p_azienda uuid)
returns table (articolo_id uuid, costo_medio numeric, ultimo date)
language sql stable security definer set search_path = '' as $$
  select m.articolo_id,
    round(sum(m.quantita * m.costo) filter (where o.tipo = 'carico' and not o.stornata and m.costo is not null and m.quantita > 0)
      / nullif(sum(m.quantita) filter (where o.tipo = 'carico' and not o.stornata and m.costo is not null and m.quantita > 0), 0), 4),
    max(o.data)
  from public.neon_mag_movimenti m join public.neon_mag_operazioni o on o.id = m.operazione_id
  where m.azienda_id = p_azienda and public.neon_puo(p_azienda, 'leggere')
  group by m.articolo_id
$$;

-- neon_emetti della 0052 con due cambi: le righe tengono variante, lotto, deposito e «rientra in magazzino»,
-- e dopo l'emissione nascono i movimenti di magazzino
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
    if char_length(coalesce(r->>'variante', '')) > 40 or char_length(coalesce(r->>'lotto', '')) > 40 then
      raise exception 'Riga %: variante e lotto al massimo 40 caratteri.', v_n;
    end if;
    if nullif(r->>'deposito_id', '') is not null and not exists (select 1 from public.neon_depositi where id::text = r->>'deposito_id' and azienda_id = d.azienda_id) then
      raise exception 'Riga %: deposito non trovato.', v_n;
    end if;
    v_somma := v_somma + v_tot;
    v_righe := v_righe || (jsonb_build_object(
      'n', v_n, 'codice', nullif(trim(coalesce(r->>'codice', '')), ''), 'descrizione', trim(r->>'descrizione'),
      'quantita', v_q, 'unita_misura', nullif(trim(coalesce(r->>'unita_misura', '')), ''), 'prezzo', v_p, 'sconto', v_sc,
      'totale', v_tot, 'tipo_merce', v_tm, 'nonrimb', coalesce((r->>'nonrimb')::boolean, false),
      'articolo_id', nullif(r->>'articolo_id', ''))
      || jsonb_strip_nulls(jsonb_build_object(
      'variante', nullif(trim(coalesce(r->>'variante', '')), ''), 'lotto', nullif(trim(coalesce(r->>'lotto', '')), ''),
      'deposito_id', nullif(r->>'deposito_id', ''),
      'rientra', case when d.tipo = 'nota_credito' and coalesce((r->>'rientra')::boolean, false) then true end)));
  end loop;

  -- Fattura elettronica: azienda e cliente sammarinesi con il codice operatore, dalla data scelta su TribWEB
  v_elettronica := v_fiscale and a.cod_oe is not null and s.nazione = 'SM' and s.cod_oe is not null
                   and a.fe_dal is not null and v_data >= a.fe_dal;

  if v_fiscale then
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

  -- Magazzino: DDT e fatture scaricano, le note di credito ricaricano le righe che rientrano
  perform public.neon_mag_da_documento(p_id);
  return jsonb_build_object('numero', v_num, 'data', v_data, 'elettronica', v_elettronica);
end $$;

-- neon_annulla della 0052: annullando un DDT si storna anche il suo scarico
create or replace function public.neon_annulla(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti; o public.neon_mag_operazioni; v_op uuid;
begin
  select * into d from public.neon_documenti where id = p_id for update;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.stato = 'bozza' then
    update public.neon_documenti set stato = 'eliminato', aggiornato_il = now() where id = p_id;
  elsif d.stato = 'emesso' and d.tipo in ('preventivo', 'ordine', 'ddt') then
    update public.neon_documenti set stato = 'annullato', aggiornato_il = now() where id = p_id;
    for o in select * from public.neon_mag_operazioni where documento_id = p_id and not stornata and storno_di is null loop
      insert into public.neon_mag_operazioni (azienda_id, tipo, data, soggetto_id, riferimento, documento_id, storno_di, nota, creato_da)
      values (o.azienda_id, 'storno', public.oggi_sm(), o.soggetto_id, o.riferimento, p_id, o.id, 'Documento annullato', auth.uid())
      returning id into v_op;
      insert into public.neon_mag_movimenti (operazione_id, azienda_id, deposito_id, articolo_id, variante, lotto, scadenza, quantita, riga)
      select v_op, m.azienda_id, m.deposito_id, m.articolo_id, m.variante, m.lotto, m.scadenza, -m.quantita, m.riga
      from public.neon_mag_movimenti m where m.operazione_id = o.id;
      update public.neon_mag_operazioni set stornata = true where id = o.id;
    end loop;
  else
    raise exception 'Una fattura emessa non si annulla: fai una nota di credito.';
  end if;
end $$;

revoke all on function public.neon_mag_deposito(uuid), public.neon_mag_giacenza(uuid, uuid, text, text),
  public.neon_mag_muovi(uuid, uuid, uuid, uuid, text, text, date, numeric, numeric, smallint, boolean),
  public.neon_mag_controlla(integer, public.neon_mag_articoli, text, text, boolean), public.neon_mag_da_documento(uuid) from anon, authenticated, public;
revoke all on function public.neon_mag_avvia(uuid), public.neon_salva_deposito(uuid, uuid, text, boolean, boolean),
  public.neon_salva_mag_articolo(uuid, jsonb), public.neon_mag_registra(uuid, jsonb), public.neon_mag_inventario(uuid, uuid, jsonb, text),
  public.neon_mag_storna(uuid, text), public.neon_mag_giacenze(uuid), public.neon_mag_costi(uuid) from anon, public;
grant execute on function public.neon_mag_avvia(uuid), public.neon_salva_deposito(uuid, uuid, text, boolean, boolean),
  public.neon_salva_mag_articolo(uuid, jsonb), public.neon_mag_registra(uuid, jsonb), public.neon_mag_inventario(uuid, uuid, jsonb, text),
  public.neon_mag_storna(uuid, text), public.neon_mag_giacenze(uuid), public.neon_mag_costi(uuid) to authenticated;
