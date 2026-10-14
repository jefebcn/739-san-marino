-- 0022: proponi un evento e organizzatori (passo 1.1); in più chiude il check-in senza codice (preparazione del passo 1.2).
-- Da applicare a mano dall'SQL Editor: aggiunge colonne a «eventi», sostituisce approva_bozza e toglie una regola di «checkin».
--
-- Cosa fa:
-- 1. eventi: chi l'ha proposto o pubblicato (autore), per chi è, prezzo, foto con credito, contatto per il pubblico, indirizzo libero.
-- 2. controlla_evento(): gli stessi controlli per proposte e organizzatori.
-- 3. proponi_evento(): aperta a tutti, mette la proposta nella coda delle bozze (canale «contributo»),
--    con limiti anti-spam: 3 al giorno per persona o rete, 30 l'ora in tutto senza accesso.
-- 4. salva_mio_evento() e miei_eventi(): gli organizzatori pubblicano subito e modificano solo i propri eventi.
-- 5. approva_bozza(): come nella 0019, ma copia anche i dettagli nuovi e l'autore della proposta.
-- 6. Foto degli eventi: cartella pubblica «eventi» in Storage, ognuno carica solo nella propria sottocartella (5 MB, solo immagini).
-- 7. checkin: tolta la regola che permetteva di registrare un check-in a mano (si prendevano metri senza codice);
--    dal passo 1.2 il check-in passa solo da una funzione col codice dell'evento. Un solo check-in per persona ed evento.

alter table public.eventi
  add column if not exists autore uuid references auth.users (id) on delete set null,
  add column if not exists per_chi text,
  add column if not exists prezzo text,
  add column if not exists foto_url text,
  add column if not exists foto_credito text,
  add column if not exists contatto text,
  add column if not exists indirizzo text;
create index if not exists eventi_autore on public.eventi (autore);

-- Controlli comuni: restituisce l'evento pronto (senza id) o un errore in italiano
create or replace function public.controlla_evento(d jsonb)
returns public.eventi language plpgsql stable security definer set search_path = '' as $$
declare
  e public.eventi;
  testo_lungo text;
begin
  e.titolo := nullif(trim(d->>'titolo'), '');
  if e.titolo is null or length(e.titolo) < 3 then raise exception 'Scrivi il titolo dell''evento.'; end if;
  if length(e.titolo) > 120 then raise exception 'Il titolo è troppo lungo (massimo 120 caratteri).'; end if;
  begin
    e.inizio := public.ora_san_marino(d->>'inizio');
    e.fine := public.ora_san_marino(nullif(d->>'fine', ''));
  exception when others then
    raise exception 'Data o ora non valida.';
  end;
  if e.inizio is null then raise exception 'Dicci quando comincia.'; end if;
  if e.fine is not null and e.fine < e.inizio then raise exception 'La fine è prima dell''inizio.'; end if;
  if e.inizio > now() + interval '2 years' then raise exception 'La data è troppo lontana.'; end if;
  begin
    e.luogo_id := nullif(d->>'luogo_id', '')::uuid;
    e.castello_id := nullif(d->>'castello_id', '')::smallint;
  exception when others then
    raise exception 'Luogo o castello non validi.';
  end;
  if e.luogo_id is not null and not exists (select 1 from public.luoghi where id = e.luogo_id) then raise exception 'Luogo non trovato.'; end if;
  if e.castello_id is not null and not exists (select 1 from public.castelli where id = e.castello_id) then raise exception 'Castello non trovato.'; end if;
  if e.castello_id is null and e.luogo_id is not null then
    select castello_id into e.castello_id from public.luoghi where id = e.luogo_id;
  end if;
  e.indirizzo := nullif(trim(d->>'indirizzo'), '');
  if e.luogo_id is null and e.indirizzo is null then raise exception 'Dicci dove: scegli un luogo o scrivi l''indirizzo.'; end if;
  e.descrizione := nullif(trim(d->>'descrizione'), '');
  e.per_chi := nullif(trim(d->>'per_chi'), '');
  e.prezzo := nullif(trim(d->>'prezzo'), '');
  e.contatto := nullif(trim(d->>'contatto'), '');
  e.organizzatore := nullif(trim(d->>'organizzatore'), '');
  e.foto_url := nullif(trim(d->>'foto_url'), '');
  e.foto_credito := nullif(trim(d->>'foto_credito'), '');
  if length(e.descrizione) > 3000 then raise exception 'La descrizione è troppo lunga (massimo 3000 caratteri).'; end if;
  testo_lungo := coalesce(case when length(e.per_chi) > 60 then 'per chi' end, case when length(e.prezzo) > 80 then 'prezzo' end,
    case when length(e.contatto) > 160 then 'contatto' end, case when length(e.indirizzo) > 160 then 'indirizzo' end,
    case when length(e.organizzatore) > 120 then 'organizzatore' end, case when length(e.foto_credito) > 120 then 'credito della foto' end);
  if testo_lungo is not null then raise exception 'Il campo «%» è troppo lungo.', testo_lungo; end if;
  if e.foto_url is not null and (e.foto_url !~ '^https://' or length(e.foto_url) > 500) then raise exception 'Il link della foto deve iniziare con https://'; end if;
  return e;
end $$;
revoke execute on function public.controlla_evento(jsonb) from public, anon, authenticated;

-- Proposta pubblica: va nella coda, la redazione la completa e la pubblica
create or replace function public.proponi_evento(p_dati jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  ip text := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1);
  v_impronta text := md5(coalesce(nullif(trim(ip), ''), 'sconosciuto') || current_date::text);
  e public.eventi;
  nuova uuid;
begin
  e := public.controlla_evento(p_dati);
  if e.inizio < now() - interval '1 hour' then raise exception 'L''evento è già passato.'; end if;
  if e.contatto is null then raise exception 'Lasciaci un contatto: telefono, email o sito.'; end if;
  if (select count(*) from public.importazioni
      where tipo = 'evento' and canale = 'contributo' and creato_il > now() - interval '1 day'
        and (case when io is not null then segnalato_da = io else impronta = v_impronta end)) >= 3 then
    raise exception 'Hai già proposto tre eventi oggi: grazie, riprova domani.';
  end if;
  if io is null and (select count(*) from public.importazioni
      where tipo = 'evento' and canale = 'contributo' and segnalato_da is null and creato_il > now() - interval '1 hour') >= 30 then
    raise exception 'Troppe proposte in questo momento: riprova tra un po''.';
  end if;
  insert into public.importazioni (tipo, dati, fonte, canale, segnalato_da, impronta)
  values ('evento',
    jsonb_strip_nulls(jsonb_build_object(
      'titolo', e.titolo, 'descrizione', e.descrizione, 'inizio', p_dati->>'inizio', 'fine', nullif(p_dati->>'fine', ''),
      'luogo_id', e.luogo_id, 'castello_id', e.castello_id, 'indirizzo', e.indirizzo, 'per_chi', e.per_chi, 'prezzo', e.prezzo,
      'contatto', e.contatto, 'organizzatore', e.organizzatore, 'foto_url', e.foto_url, 'foto_credito', e.foto_credito)),
    'Proposta', 'contributo', io, v_impronta)
  returning id into nuova;
  return nuova;
end $$;
revoke execute on function public.proponi_evento(jsonb) from public;
grant execute on function public.proponi_evento(jsonb) to anon, authenticated;

-- Organizzatori: pubblicano subito e modificano i propri eventi (la redazione può modificarli tutti)
create or replace function public.salva_mio_evento(p_id uuid, p_dati jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.eventi;
  v_id uuid;
  v_pubblicato boolean := coalesce((p_dati->>'pubblicato')::boolean, true);
begin
  if not public.e_organizzatore() then
    raise exception 'Pubblicano direttamente solo gli organizzatori: usa «Proponi un evento».';
  end if;
  e := public.controlla_evento(p_dati);
  if p_id is null then
    if e.inizio < now() - interval '1 hour' then raise exception 'L''evento è già passato.'; end if;
    insert into public.eventi (titolo, descrizione, inizio, fine, luogo_id, castello_id, organizzatore, metri, pubblicato, fonte,
                               per_chi, prezzo, foto_url, foto_credito, contatto, indirizzo, autore)
    values (e.titolo, e.descrizione, e.inizio, e.fine, e.luogo_id, e.castello_id, e.organizzatore, 20, v_pubblicato, 'Organizzatore',
            e.per_chi, e.prezzo, e.foto_url, e.foto_credito, e.contatto, e.indirizzo, auth.uid())
    returning id into v_id;
  else
    update public.eventi set
      titolo = e.titolo, descrizione = e.descrizione, inizio = e.inizio, fine = e.fine, luogo_id = e.luogo_id,
      castello_id = e.castello_id, organizzatore = e.organizzatore, pubblicato = v_pubblicato, per_chi = e.per_chi,
      prezzo = e.prezzo, foto_url = e.foto_url, foto_credito = e.foto_credito, contatto = e.contatto, indirizzo = e.indirizzo
    where id = p_id and (autore = auth.uid() or public.e_redattore())
    returning id into v_id;
    if v_id is null then raise exception 'Puoi modificare solo i tuoi eventi.'; end if;
  end if;
  return v_id;
end $$;
revoke execute on function public.salva_mio_evento(uuid, jsonb) from public, anon;
grant execute on function public.salva_mio_evento(uuid, jsonb) to authenticated;

create or replace function public.miei_eventi()
returns table (id uuid, titolo text, descrizione text, inizio timestamptz, fine timestamptz, luogo_id uuid, castello_id smallint,
               organizzatore text, pubblicato boolean, per_chi text, prezzo text, foto_url text, foto_credito text, contatto text, indirizzo text, metri integer)
language sql stable security definer set search_path = '' as $$
  select e.id, e.titolo, e.descrizione, e.inizio, e.fine, e.luogo_id, e.castello_id, e.organizzatore, e.pubblicato,
         e.per_chi, e.prezzo, e.foto_url, e.foto_credito, e.contatto, e.indirizzo, e.metri
  from public.eventi e
  where auth.uid() is not null and e.autore = auth.uid()
  order by e.inizio desc
  limit 200;
$$;
revoke execute on function public.miei_eventi() from public, anon;
grant execute on function public.miei_eventi() to authenticated;

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
    -- Dalla 0022: anche i dettagli delle proposte (per chi, prezzo, foto, contatto, indirizzo) e chi l'ha proposto
    insert into public.eventi (titolo, descrizione, inizio, fine, luogo_id, castello_id, organizzatore, metri, fonte, link_fonte,
                               per_chi, prezzo, foto_url, foto_credito, contatto, indirizzo, autore)
    values (v_titolo, nullif(trim(d->>'descrizione'), ''), v_inizio, v_fine, v_luogo, v_castello,
            nullif(trim(d->>'organizzatore'), ''), v_metri,
            coalesce(nullif(d->>'fonte_nome', ''), b.fonte), coalesce(nullif(d->>'fonte_link', ''), b.link_fonte),
            nullif(trim(d->>'per_chi'), ''), nullif(trim(d->>'prezzo'), ''), nullif(trim(d->>'foto_url'), ''),
            nullif(trim(d->>'foto_credito'), ''), nullif(trim(d->>'contatto'), ''), nullif(trim(d->>'indirizzo'), ''),
            b.segnalato_da)
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

-- Foto degli eventi: cartella pubblica, ognuno carica solo in <suo id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eventi', 'eventi', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "carico le foto dei miei eventi" on storage.objects;
create policy "carico le foto dei miei eventi" on storage.objects for insert to authenticated
  with check (bucket_id = 'eventi' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Check-in: solo dalla funzione col codice (passo 1.2), uno per persona ed evento
drop policy if exists "faccio check-in" on public.checkin;
create unique index if not exists checkin_uno_per_evento on public.checkin (utente_id, evento_id);
