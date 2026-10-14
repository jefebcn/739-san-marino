-- 739 San Marino · importazione della redazione (passo 0.6) e permessi completi della coda.
-- DA APPLICARE A MANO dall'SQL Editor di Supabase, DOPO la 0013 e la 0014 (cambia tabelle esistenti, contiene insert e update):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0019_importazione_redazione.sql
--
-- Cosa fa:
-- 1. la coda si apre a tutta la redazione (e_redattore(), 0015), non solo agli amministratori;
-- 2. importa_redazione(): gli elementi incollati in /admin/importa entrano nella coda (fonte «Redazione 739»);
-- 3. approva_bozza() pubblica anche luoghi (aggiornando la scheda se esiste già con lo stesso nome e castello),
--    avvisi e contenuti (questi ultimi come bozza in /admin/contenuti);
-- 4. la redazione può modificare e chiudere gli avvisi;
-- 5. nuove categorie di luoghi: 'ufficio' e 'salute' (uffici pubblici e centri sanitari, passo 0.9).

-- 5. Categorie
alter table public.luoghi drop constraint if exists luoghi_categoria_check;
alter table public.luoghi add constraint luoghi_categoria_check check (categoria in (
  'luogo', 'parcheggio', 'farmacia', 'impianto', 'trasporti', 'locale', 'servizio',
  'cultura', 'panorama', 'bagni', 'acqua', 'ricarica', 'ufficio', 'salute'
));

-- 4. Avvisi
drop policy if exists "la redazione modifica gli avvisi" on public.avvisi;
create policy "la redazione modifica gli avvisi" on public.avvisi
  for update to authenticated using (public.e_redattore()) with check (public.e_redattore());
drop policy if exists "la redazione elimina gli avvisi" on public.avvisi;
create policy "la redazione elimina gli avvisi" on public.avvisi
  for delete to authenticated using (public.e_redattore());
grant update, delete on public.avvisi to authenticated;

-- L'elemento creato all'approvazione ora può essere un evento, un luogo, un avviso o un contenuto
alter table public.importazioni drop constraint if exists importazioni_elemento_id_fkey;

-- «Il castello della settimana: Città!» → «il-castello-della-settimana-citta»
create or replace function public.slug_da(t text)
returns text language sql stable set search_path = '' as $$
  select left(trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '[^a-z0-9]+', '-', 'g')), 80)
$$;

-- 2. Importazione della redazione: ogni elemento ha "tipo" (luogo, evento, avviso, contenuto) e i suoi campi
-- (formato in docs/formato-importazione.md). La validazione completa la fa la pagina /admin/importa;
-- qui si controllano i minimi e il ruolo. Restituisce quanti elementi sono entrati in coda.
create or replace function public.importa_redazione(p_elementi jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  n integer := 0;
  t text;
begin
  if not public.e_redattore() then raise exception 'L''importazione è riservata alla redazione di 739.'; end if;
  if jsonb_typeof(p_elementi) <> 'array' then raise exception 'Serve un elenco di elementi.'; end if;
  if jsonb_array_length(p_elementi) > 200 then raise exception 'Al massimo 200 elementi per volta.'; end if;
  for e in select * from jsonb_array_elements(p_elementi) loop
    t := e->>'tipo';
    if t not in ('luogo', 'evento', 'avviso', 'contenuto') then
      raise exception 'Tipo non valido: %', coalesce(t, 'mancante');
    end if;
    if coalesce(nullif(trim(e->>'titolo'), ''), nullif(trim(e->>'nome'), '')) is null then
      raise exception 'Un elemento di tipo % non ha né titolo né nome.', t;
    end if;
    insert into public.importazioni (tipo, dati, fonte, canale)
    values (t, (e - 'tipo') || jsonb_build_object('titolo', coalesce(e->>'titolo', e->>'nome')), 'Redazione 739', 'contributo');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.importa_redazione(jsonb) from public, anon;
grant execute on function public.importa_redazione(jsonb) to authenticated;

-- 1. Coda: ora per la redazione, con il doppione anche per i luoghi
drop function if exists public.coda_bozze(text);
create function public.coda_bozze(p_stato text default 'nuovo')
returns table (
  id uuid, tipo text, dati jsonb, fonte text, link_fonte text, canale text, stato text, nota text,
  creato_il timestamptz, deciso_il timestamptz, elemento_id uuid,
  simile_id uuid, simile_titolo text, simile_inizio timestamptz,
  luogo_id uuid, evento_id uuid, segnalato_da text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.e_redattore() then
    raise exception 'La coda è riservata alla redazione di 739.';
  end if;
  return query
  select b.id, b.tipo, b.dati, b.fonte, b.link_fonte, b.canale, b.stato, b.nota,
         b.creato_il, b.deciso_il, b.elemento_id,
         coalesce(s.id, sl.id), coalesce(s.titolo, sl.nome), s.inizio,
         b.luogo_id, b.evento_id,
         case when b.segnalato_da is null then null
              else coalesce(nullif(p.nome, ''), 'SMR ID ' || p.tessera, 'SMR ID') end
  from public.importazioni b
  left join public.profili p on p.id = b.segnalato_da
  left join lateral (
    select e.id, e.titolo, e.inizio
    from public.eventi e
    where e.id = b.simile_a
       or (b.stato = 'nuovo' and b.tipo = 'evento' and e.inizio > now() - interval '1 day'
           and public.normalizza(e.titolo) = public.normalizza(b.dati->>'titolo'))
    order by (e.id = b.simile_a) desc
    limit 1
  ) s on true
  -- Un luogo con lo stesso nome nello stesso castello: l'approvazione aggiorna quella scheda
  left join lateral (
    select l.id, l.nome
    from public.luoghi l
    where b.tipo = 'luogo' and b.stato = 'nuovo'
      and public.normalizza(l.nome) = public.normalizza(b.dati->>'nome')
      and l.castello_id is not distinct from nullif(b.dati->>'castello_id', '')::smallint
    limit 1
  ) sl on true
  where case p_stato
    when 'nuovo' then b.stato = 'nuovo' and b.tipo <> 'segnalazione'
    when 'segnalazioni' then b.stato = 'nuovo' and b.tipo = 'segnalazione'
    when 'scartato' then b.stato in ('scartato', 'duplicato')
    else b.stato = p_stato
  end
  order by coalesce(b.deciso_il, b.creato_il) desc
  limit 200;
end $$;
revoke execute on function public.coda_bozze(text) from public, anon;
grant execute on function public.coda_bozze(text) to authenticated;

create or replace function public.conteggio_bozze()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then
    raise exception 'La coda è riservata alla redazione di 739.';
  end if;
  return (
    select jsonb_build_object(
      'nuovo', count(*) filter (where stato = 'nuovo' and tipo <> 'segnalazione'),
      'segnalazioni', count(*) filter (where stato = 'nuovo' and tipo = 'segnalazione'),
      'approvato', count(*) filter (where stato = 'approvato'),
      'scartato', count(*) filter (where stato in ('scartato', 'duplicato'))
    )
    from public.importazioni
  );
end $$;

-- 3. Approvazione di ogni tipo. Restituisce l'id dell'elemento creato o aggiornato.
create or replace function public.approva_bozza(p_id uuid, p_dati jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  b public.importazioni;
  d jsonb;
  v_titolo text;
  v_inizio timestamptz;
  v_fine timestamptz;
  v_luogo uuid;
  v_castello smallint;
  v_metri integer;
  rl public.luoghi;
  ra public.avvisi;
  rc public.contenuti;
  v_slug text;
  esistente uuid;
  nuovo uuid;
begin
  if not public.e_redattore() then
    raise exception 'La coda è riservata alla redazione di 739.';
  end if;
  select * into b from public.importazioni where id = p_id for update;
  if b.id is null then raise exception 'Bozza non trovata.'; end if;
  if b.stato <> 'nuovo' then raise exception 'Questa bozza è già stata decisa.'; end if;
  d := b.dati || coalesce(p_dati, '{}'::jsonb);

  if b.tipo = 'evento' then
    v_titolo := nullif(trim(d->>'titolo'), '');
    if v_titolo is null then raise exception 'Manca il titolo.'; end if;
    begin
      v_inizio := public.ora_san_marino(d->>'inizio');
      v_fine := public.ora_san_marino(d->>'fine');
    exception when others then
      raise exception 'Data o ora non valida.';
    end;
    if v_inizio is null then raise exception 'Manca la data di inizio.'; end if;
    if v_fine is not null and v_fine < v_inizio then raise exception 'La fine è prima dell''inizio.'; end if;
    begin
      v_luogo := nullif(d->>'luogo_id', '')::uuid;
      v_castello := nullif(d->>'castello_id', '')::smallint;
      v_metri := coalesce(nullif(d->>'metri', '')::integer, 20);
    exception when others then
      raise exception 'Luogo, castello o metri non validi.';
    end;
    if v_luogo is not null and not exists (select 1 from public.luoghi where id = v_luogo) then raise exception 'Luogo non trovato.'; end if;
    if v_castello is not null and not exists (select 1 from public.castelli where id = v_castello) then raise exception 'Castello non trovato.'; end if;
    if v_metri < 0 or v_metri > 500 then raise exception 'I metri vanno da 0 a 500.'; end if;
    if v_castello is null and v_luogo is not null then
      select castello_id into v_castello from public.luoghi where id = v_luogo;
    end if;
    insert into public.eventi (titolo, descrizione, inizio, fine, luogo_id, castello_id, organizzatore, metri, fonte, link_fonte)
    values (v_titolo, nullif(trim(d->>'descrizione'), ''), v_inizio, v_fine, v_luogo, v_castello,
            nullif(trim(d->>'organizzatore'), ''), v_metri,
            coalesce(nullif(d->>'fonte_nome', ''), b.fonte), coalesce(nullif(d->>'fonte_link', ''), b.link_fonte))
    returning id into nuovo;

  elsif b.tipo = 'luogo' then
    begin
      rl := jsonb_populate_record(null::public.luoghi, d);
    exception when others then
      raise exception 'Dati del luogo non validi: %', sqlerrm;
    end;
    if nullif(trim(rl.nome), '') is null then raise exception 'Manca il nome del luogo.'; end if;
    if rl.categoria is null then raise exception 'Manca la categoria del luogo.'; end if;
    select id into esistente from public.luoghi
    where public.normalizza(nome) = public.normalizza(rl.nome) and castello_id is not distinct from rl.castello_id
    limit 1;
    if esistente is not null then
      -- Aggiorna la scheda esistente: cambia solo quello che l'importazione porta
      update public.luoghi l set
        categoria = coalesce(rl.categoria, l.categoria),
        descrizione = coalesce(rl.descrizione, l.descrizione),
        lat = coalesce(rl.lat, l.lat), lng = coalesce(rl.lng, l.lng),
        indirizzo = coalesce(rl.indirizzo, l.indirizzo),
        telefono = coalesce(rl.telefono, l.telefono),
        orari = coalesce(rl.orari, l.orari),
        orari_settimana = coalesce(rl.orari_settimana, l.orari_settimana),
        tariffa = coalesce(rl.tariffa, l.tariffa),
        posti = coalesce(rl.posti, l.posti),
        da_verificare = coalesce((d->>'da_verificare')::boolean, l.da_verificare),
        area = coalesce(rl.area, l.area),
        sottocategoria = coalesce(rl.sottocategoria, l.sottocategoria),
        sito = coalesce(rl.sito, l.sito),
        email = coalesce(rl.email, l.email),
        foto_url = coalesce(rl.foto_url, l.foto_url),
        foto_credito = coalesce(rl.foto_credito, l.foto_credito),
        fonte_nome = coalesce(rl.fonte_nome, l.fonte_nome),
        fonte_link = coalesce(rl.fonte_link, l.fonte_link),
        verificato_il = coalesce(rl.verificato_il, l.verificato_il),
        cosa_fare = coalesce(rl.cosa_fare, l.cosa_fare)
      where l.id = esistente;
      nuovo := esistente;
    else
      if rl.lat is null or rl.lng is null then raise exception 'Mancano le coordinate del luogo.'; end if;
      insert into public.luoghi (nome, categoria, descrizione, lat, lng, castello_id, indirizzo, telefono, orari, orari_settimana,
        tariffa, posti, da_verificare, area, sottocategoria, sito, email, foto_url, foto_credito, fonte_nome, fonte_link,
        verificato_il, cosa_fare)
      values (trim(rl.nome), rl.categoria, rl.descrizione, rl.lat, rl.lng, rl.castello_id, rl.indirizzo, rl.telefono, rl.orari,
        rl.orari_settimana, rl.tariffa, rl.posti, coalesce((d->>'da_verificare')::boolean, true), rl.area, rl.sottocategoria,
        rl.sito, rl.email, rl.foto_url, rl.foto_credito, rl.fonte_nome, rl.fonte_link, rl.verificato_il, rl.cosa_fare)
      returning id into nuovo;
    end if;

  elsif b.tipo = 'avviso' then
    begin
      ra := jsonb_populate_record(null::public.avvisi, (d - 'tipo') || jsonb_build_object('tipo', coalesce(d->>'tipo_avviso', 'altro')));
    exception when others then
      raise exception 'Dati dell''avviso non validi: %', sqlerrm;
    end;
    insert into public.avvisi (titolo, testo, tipo, castello_id, luogo_id, lat, lng, dal, al, gravita, fonte_nome, fonte_link)
    values (ra.titolo, ra.testo, ra.tipo, ra.castello_id, ra.luogo_id, ra.lat, ra.lng,
      coalesce(public.ora_san_marino(d->>'dal'), now()), public.ora_san_marino(d->>'al'),
      coalesce(ra.gravita, 'info'), ra.fonte_nome, ra.fonte_link)
    returning id into nuovo;

  elsif b.tipo = 'contenuto' then
    begin
      rc := jsonb_populate_record(null::public.contenuti, (d - 'tipo') || jsonb_build_object('tipo', d->>'tipo_contenuto'));
    exception when others then
      raise exception 'Dati del contenuto non validi: %', sqlerrm;
    end;
    -- Slug libero: se è già usato si aggiunge un numero
    v_slug := coalesce(nullif(rc.slug, ''), public.slug_da(rc.titolo));
    if exists (select 1 from public.contenuti where slug = v_slug) then
      v_slug := v_slug || '-' || (select count(*) + 2 from public.contenuti where slug like v_slug || '-%');
    end if;
    -- Entra sempre come bozza: si rilegge e si pubblica da /admin/contenuti
    insert into public.contenuti (tipo, titolo, slug, sommario, corpo, area, castello_id, foto_url, foto_credito, luoghi, eventi,
      stato, pubblicato_il, fonte_nome, fonte_link, autore)
    values (rc.tipo, rc.titolo, v_slug, rc.sommario, coalesce(rc.corpo, ''), rc.area, rc.castello_id, rc.foto_url, rc.foto_credito,
      coalesce(rc.luoghi, '{}'), coalesce(rc.eventi, '{}'), 'bozza', rc.pubblicato_il, rc.fonte_nome, rc.fonte_link, auth.uid())
    returning id into nuovo;

  else
    raise exception 'Questo tipo di bozza non si approva: si chiude dalla scheda Segnalazioni.';
  end if;

  update public.importazioni
  set stato = 'approvato', dati = d, elemento_id = nuovo, deciso_il = now(), deciso_da = auth.uid()
  where id = b.id;
  return nuovo;
end $$;

create or replace function public.scarta_bozza(p_id uuid, p_nota text default null, p_doppione_di uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_redattore() then
    raise exception 'La coda è riservata alla redazione di 739.';
  end if;
  update public.importazioni
  set stato = case when p_doppione_di is null then 'scartato' else 'duplicato' end,
      simile_a = case when tipo = 'evento' then coalesce(p_doppione_di, simile_a) else simile_a end,
      nota = nullif(trim(p_nota), ''),
      deciso_il = now(), deciso_da = auth.uid()
  where id = p_id and stato = 'nuovo';
  if not found then raise exception 'Bozza non trovata o già decisa.'; end if;
end $$;

create or replace function public.ripristina_bozza(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_redattore() then
    raise exception 'La coda è riservata alla redazione di 739.';
  end if;
  update public.importazioni
  set stato = 'nuovo', nota = null, deciso_il = null, deciso_da = null
  where id = p_id and stato in ('scartato', 'duplicato');
  if not found then raise exception 'Si possono rimettere in coda solo le bozze scartate.'; end if;
end $$;

create or replace function public.chiudi_segnalazione(p_id uuid, p_corretta boolean, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b public.importazioni;
begin
  if not public.e_redattore() then
    raise exception 'La coda è riservata alla redazione di 739.';
  end if;
  select * into b from public.importazioni where id = p_id and tipo = 'segnalazione' and stato = 'nuovo' for update;
  if b.id is null then raise exception 'Segnalazione non trovata o già chiusa.'; end if;
  update public.importazioni
  set stato = case when p_corretta then 'approvato' else 'scartato' end,
      nota = nullif(trim(p_nota), ''), deciso_il = now(), deciso_da = auth.uid()
  where id = b.id;
  if p_corretta and b.luogo_id is not null then
    update public.luoghi set verificato_il = current_date where id = b.luogo_id;
  end if;
end $$;
