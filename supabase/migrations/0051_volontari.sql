-- Volontari per le associazioni (19/10/2026, scelta di Alex; Comunità, volontariato in docs/piano.md). Solo oggetti nuovi, niente cancellazioni.
--
-- Chi gestisce la scheda di un'associazione (e_mio_luogo; la redazione per qualunque scheda) pubblica una chiamata:
-- cosa serve, quando, dove, quante persone. Chi ha l'SMR ID si iscrive (anche con un telefono, facoltativo) e si
-- può ritirare fino all'inizio. Dopo l'inizio l'associazione segna chi c'era: solo allora arrivano i metri
-- (METRI_TURNO, 40 m, motivo 'volontariato'), al massimo 120 m al mese per persona dal volontariato.
-- Avvisi personali (0049): all'associazione per ogni iscritto nuovo, agli iscritti se la chiamata viene annullata,
-- al volontario quando riceve i metri.

create table if not exists public.volontari_chiamate (
  id uuid primary key default gen_random_uuid(),
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  titolo text not null check (char_length(titolo) between 5 and 80),        -- es. «Pulizia del parco di Montecchio»
  descrizione text not null check (char_length(descrizione) between 10 and 800),
  inizio timestamptz not null,
  fine timestamptz not null check (fine > inizio and fine <= inizio + interval '12 hours'),
  dove text check (char_length(dove) <= 160),                               -- se non è la sede dell'associazione
  posti integer not null check (posti between 1 and 100),
  stato text not null default 'aperta' check (stato in ('aperta', 'chiusa', 'annullata')),
  creato_da uuid references auth.users (id) on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index if not exists volontari_chiamate_per_inizio on public.volontari_chiamate (inizio);
create index if not exists volontari_chiamate_per_luogo on public.volontari_chiamate (luogo_id);

create table if not exists public.volontari_iscrizioni (
  id uuid primary key default gen_random_uuid(),
  chiamata_id uuid not null references public.volontari_chiamate (id) on delete cascade,
  utente_id uuid not null references auth.users (id) on delete cascade,
  stato text not null default 'iscritto' check (stato in ('iscritto', 'ritirato', 'presente', 'assente')),
  telefono text check (char_length(telefono) <= 30),
  nota text check (char_length(nota) <= 200),
  metri integer not null default 0,
  creato_il timestamptz not null default now(),
  deciso_il timestamptz,
  unique (chiamata_id, utente_id)
);
create index if not exists volontari_iscrizioni_per_utente on public.volontari_iscrizioni (utente_id);

-- Nessuna regola sulle due tabelle: si usano solo con le funzioni qui sotto
alter table public.volontari_chiamate enable row level security;
alter table public.volontari_iscrizioni enable row level security;

-- I metri di un turno, in un posto solo
create or replace function public.metri_turno()
returns integer language sql immutable set search_path = '' as $$ select 40 $$;

-- Pubblica: le chiamate aperte da oggi in avanti (o in corso), con i posti liberi; con l'SMR ID anche la mia iscrizione
create or replace function public.chiamate_volontari(p_limite integer default 60)
returns table (id uuid, luogo_id uuid, luogo text, castello_id smallint, titolo text, descrizione text, inizio timestamptz, fine timestamptz,
               dove text, posti integer, iscritti integer, mio_stato text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.luogo_id, l.nome, l.castello_id, c.titolo, c.descrizione, c.inizio, c.fine, c.dove, c.posti,
         (select count(*) from public.volontari_iscrizioni i where i.chiamata_id = c.id and i.stato in ('iscritto', 'presente'))::integer,
         (select i.stato from public.volontari_iscrizioni i where i.chiamata_id = c.id and i.utente_id = auth.uid())
  from public.volontari_chiamate c join public.luoghi l on l.id = c.luogo_id
  where c.stato = 'aperta' and c.fine > now()
  order by c.inizio
  limit least(greatest(coalesce(p_limite, 60), 1), 200);
$$;

-- Pubblica: una chiamata (anche chiusa o passata, mai le annullate), con la mia iscrizione
create or replace function public.chiamata_volontari(p_id uuid)
returns table (id uuid, luogo_id uuid, luogo text, castello_id smallint, indirizzo text, titolo text, descrizione text, inizio timestamptz, fine timestamptz,
               dove text, posti integer, iscritti integer, stato text, mio_stato text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.luogo_id, l.nome, l.castello_id, l.indirizzo, c.titolo, c.descrizione, c.inizio, c.fine, c.dove, c.posti,
         (select count(*) from public.volontari_iscrizioni i where i.chiamata_id = c.id and i.stato in ('iscritto', 'presente'))::integer,
         c.stato,
         (select i.stato from public.volontari_iscrizioni i where i.chiamata_id = c.id and i.utente_id = auth.uid())
  from public.volontari_chiamate c join public.luoghi l on l.id = c.luogo_id
  where c.id = p_id and c.stato <> 'annullata';
$$;

-- Con l'SMR ID: mi iscrivo (o torno iscritto dopo essermi ritirato)
create or replace function public.iscriviti_volontario(p_id uuid, p_telefono text default null, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.volontari_chiamate;
  v_tel text := nullif(regexp_replace(coalesce(p_telefono, ''), '[^0-9+ ]', '', 'g'), '');
  g record;
begin
  if auth.uid() is null then raise exception 'Per iscriverti serve l''SMR ID.'; end if;
  select * into c from public.volontari_chiamate where id = p_id for update;
  if c.id is null or c.stato <> 'aperta' then raise exception 'Questa chiamata non è più aperta.'; end if;
  if c.inizio <= now() then raise exception 'Il turno è già cominciato: senti direttamente l''associazione.'; end if;
  if char_length(coalesce(p_nota, '')) > 200 then raise exception 'La nota è troppo lunga (al massimo 200 caratteri).'; end if;
  if v_tel is not null and char_length(v_tel) not between 6 and 30 then raise exception 'Il telefono non sembra giusto.'; end if;
  if exists (select 1 from public.volontari_iscrizioni where chiamata_id = p_id and utente_id = auth.uid() and stato = 'iscritto') then return; end if;
  if (select count(*) from public.volontari_iscrizioni where chiamata_id = p_id and stato in ('iscritto', 'presente')) >= c.posti then
    raise exception 'I posti sono finiti: grazie lo stesso.';
  end if;
  if (select count(*) from public.volontari_iscrizioni i join public.volontari_chiamate x on x.id = i.chiamata_id
      where i.utente_id = auth.uid() and i.stato = 'iscritto' and x.inizio > now()) >= 10 then
    raise exception 'Sei già iscritto a 10 turni in arrivo: aspetta che passino.';
  end if;
  insert into public.volontari_iscrizioni (chiamata_id, utente_id, telefono, nota)
  values (p_id, auth.uid(), v_tel, nullif(trim(coalesce(p_nota, '')), ''))
  on conflict (chiamata_id, utente_id) do update set stato = 'iscritto', telefono = excluded.telefono, nota = excluded.nota, deciso_il = null;
  for g in select distinct a.utente_id from public.attivita_gestori a where a.luogo_id = c.luogo_id and a.stato = 'approvata' loop
    perform public.metti_avviso(g.utente_id, 'vol:' || p_id || ':' || auth.uid() || ':' || g.utente_id || ':' || extract(epoch from now())::bigint,
      'Nuovo volontario', c.titolo || ': ' || (select count(*) from public.volontari_iscrizioni where chiamata_id = p_id and stato = 'iscritto') || ' su ' || c.posti || '.',
      '/profile/attivita/' || c.luogo_id || '/volontari');
  end loop;
end $$;

-- Con l'SMR ID: mi ritiro, fino all'inizio del turno
create or replace function public.ritirati_volontario(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.volontari_chiamate where id = p_id and inizio > now()) then
    raise exception 'Il turno è già cominciato: avvisa direttamente l''associazione.';
  end if;
  update public.volontari_iscrizioni set stato = 'ritirato', deciso_il = now()
  where chiamata_id = p_id and utente_id = auth.uid() and stato = 'iscritto';
end $$;

-- Con l'SMR ID: i miei turni (in arrivo e degli ultimi 60 giorni)
create or replace function public.miei_turni()
returns table (chiamata_id uuid, titolo text, luogo_id uuid, luogo text, inizio timestamptz, fine timestamptz, stato_chiamata text, stato text, metri integer)
language sql stable security definer set search_path = '' as $$
  select c.id, c.titolo, c.luogo_id, l.nome, c.inizio, c.fine, c.stato, i.stato, i.metri
  from public.volontari_iscrizioni i
  join public.volontari_chiamate c on c.id = i.chiamata_id
  join public.luoghi l on l.id = c.luogo_id
  where i.utente_id = auth.uid() and c.fine > now() - interval '60 days'
  order by c.inizio desc;
$$;

-- Chi gestisce: le chiamate della sua scheda, con i numeri
create or replace function public.chiamate_luogo(p_luogo uuid)
returns table (id uuid, titolo text, descrizione text, inizio timestamptz, fine timestamptz, dove text, posti integer, stato text,
               iscritti integer, presenti integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  return query
    select c.id, c.titolo, c.descrizione, c.inizio, c.fine, c.dove, c.posti, c.stato,
           (select count(*) from public.volontari_iscrizioni i where i.chiamata_id = c.id and i.stato in ('iscritto', 'presente', 'assente'))::integer,
           (select count(*) from public.volontari_iscrizioni i where i.chiamata_id = c.id and i.stato = 'presente')::integer
    from public.volontari_chiamate c where c.luogo_id = p_luogo
    order by (c.fine > now()) desc, c.inizio desc
    limit 50;
end $$;

-- Chi gestisce: crea, modifica, chiude o annulla una chiamata (al massimo 5 aperte in arrivo per scheda)
create or replace function public.salva_chiamata(p_luogo uuid, p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_titolo text := trim(coalesce(p->>'titolo', ''));
  v_descr text := trim(coalesce(p->>'descrizione', ''));
  v_inizio timestamptz := (p->>'inizio')::timestamptz;
  v_fine timestamptz := (p->>'fine')::timestamptz;
  v_dove text := nullif(trim(coalesce(p->>'dove', '')), '');
  v_posti integer := coalesce((p->>'posti')::integer, 0);
  v_stato text := coalesce(p->>'stato', 'aperta');
  v_prima text;
  v_cat text;
  r record;
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  select categoria into v_cat from public.luoghi where id = p_luogo;
  if v_cat <> 'associazione' and not public.e_redattore() then raise exception 'Le chiamate di volontari sono per le associazioni.'; end if;
  if char_length(v_titolo) not between 5 and 80 then raise exception 'Il titolo va da 5 a 80 caratteri.'; end if;
  if char_length(v_descr) not between 10 and 800 then raise exception 'Scrivi cosa c''è da fare, da 10 a 800 caratteri.'; end if;
  if v_inizio is null or v_fine is null or v_fine <= v_inizio then raise exception 'La fine deve venire dopo l''inizio.'; end if;
  if v_fine > v_inizio + interval '12 hours' then raise exception 'Un turno dura al massimo 12 ore: per più giorni fai più chiamate.'; end if;
  if v_posti not between 1 and 100 then raise exception 'Le persone che servono vanno da 1 a 100.'; end if;
  if char_length(coalesce(v_dove, '')) > 160 then raise exception 'Il luogo è troppo lungo.'; end if;
  if v_stato not in ('aperta', 'chiusa', 'annullata') then raise exception 'Stato non valido.'; end if;
  if p_id is null then
    if v_inizio < now() + interval '1 hour' then raise exception 'Il turno deve cominciare almeno tra un''ora.'; end if;
    if v_inizio > now() + interval '180 days' then raise exception 'Si pubblica al massimo 6 mesi prima.'; end if;
    if (select count(*) from public.volontari_chiamate where luogo_id = p_luogo and stato = 'aperta' and fine > now()) >= 5 then
      raise exception 'Hai già 5 chiamate aperte: chiudine una prima di pubblicarne un''altra.';
    end if;
    if (select count(*) from public.volontari_chiamate where creato_da = auth.uid() and creato_il > now() - interval '1 day') >= 10 then
      raise exception 'Hai pubblicato troppe chiamate oggi: riprova domani.';
    end if;
    insert into public.volontari_chiamate (luogo_id, titolo, descrizione, inizio, fine, dove, posti, creato_da)
    values (p_luogo, v_titolo, v_descr, v_inizio, v_fine, v_dove, v_posti, auth.uid())
    returning id into v_id;
  else
    select stato into v_prima from public.volontari_chiamate where id = p_id and luogo_id = p_luogo for update;
    if v_prima is null then raise exception 'Chiamata non trovata.'; end if;
    update public.volontari_chiamate set titolo = v_titolo, descrizione = v_descr, inizio = v_inizio, fine = v_fine, dove = v_dove,
           posti = v_posti, stato = v_stato, aggiornato_il = now()
    where id = p_id returning id into v_id;
    -- Annullata: avvisa chi era iscritto
    if v_stato = 'annullata' and v_prima <> 'annullata' then
      for r in select i.utente_id from public.volontari_iscrizioni i where i.chiamata_id = p_id and i.stato = 'iscritto' loop
        perform public.metti_avviso(r.utente_id, 'vol-annullata:' || p_id || ':' || r.utente_id, 'Turno annullato',
          v_titolo || ': l''associazione l''ha annullato. Grazie lo stesso.', '/comunita/volontari');
      end loop;
    end if;
  end if;
  return v_id;
end $$;

-- Chi gestisce: gli iscritti di una chiamata (nome, email, telefono e nota: solo per organizzare il turno)
create or replace function public.volontari_chiamata(p_id uuid)
returns table (iscrizione_id uuid, nome text, email text, telefono text, nota text, stato text, metri integer, creato_il timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_luogo uuid;
begin
  select luogo_id into v_luogo from public.volontari_chiamate where id = p_id;
  if v_luogo is null or not public.e_mio_luogo(v_luogo) then raise exception 'Questa chiamata non è della tua scheda.'; end if;
  return query
    select i.id, pr.nome, u.email::text, i.telefono, i.nota, i.stato, i.metri, i.creato_il
    from public.volontari_iscrizioni i
    join auth.users u on u.id = i.utente_id
    left join public.profili pr on pr.id = i.utente_id
    where i.chiamata_id = p_id and i.stato <> 'ritirato'
    order by i.creato_il;
end $$;

-- Chi gestisce: dopo l'inizio segna chi c'era (metri, entro il tetto del mese) e chi no. Si può correggere fino a 7 giorni dopo.
create or replace function public.segna_volontario(p_iscrizione uuid, p_presente boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  i public.volontari_iscrizioni;
  c public.volontari_chiamate;
  v_mese integer;
  v_metri integer := 0;
begin
  select * into i from public.volontari_iscrizioni where id = p_iscrizione for update;
  if i.id is null or i.stato = 'ritirato' then raise exception 'Iscrizione non trovata.'; end if;
  select * into c from public.volontari_chiamate where id = i.chiamata_id;
  if not public.e_mio_luogo(c.luogo_id) then raise exception 'Questa chiamata non è della tua scheda.'; end if;
  if c.stato = 'annullata' then raise exception 'La chiamata è annullata.'; end if;
  if c.inizio > now() then raise exception 'Le presenze si segnano dall''inizio del turno.'; end if;
  if c.fine < now() - interval '7 days' then raise exception 'Le presenze si segnano entro 7 giorni dal turno.'; end if;
  if i.utente_id = auth.uid() then raise exception 'La tua presenza la segna un altro dell''associazione o la redazione.'; end if;

  if p_presente and i.stato <> 'presente' then
    -- Il tetto: al massimo 120 m al mese dal volontariato
    select coalesce(sum(m.metri), 0) into v_mese from public.metri_movimenti m
    where m.utente_id = i.utente_id and m.motivo = 'volontariato'
      and m.creato_il >= (date_trunc('month', now() at time zone 'Europe/San_Marino') at time zone 'Europe/San_Marino');
    v_metri := greatest(0, least(public.metri_turno(), 120 - v_mese));
    if v_metri > 0 then
      insert into public.metri_movimenti (utente_id, metri, motivo, riferimento) values (i.utente_id, v_metri, 'volontariato', c.id);
    end if;
    update public.volontari_iscrizioni set stato = 'presente', metri = v_metri, deciso_il = now() where id = i.id;
    perform public.metti_avviso(i.utente_id, 'vol-presente:' || i.id || ':' || extract(epoch from now())::bigint, 'Grazie del tuo turno',
      c.titolo || case when v_metri > 0 then ': +' || v_metri || ' m per te e il tuo castello.' else '. Questo mese hai già il massimo dei metri dal volontariato.' end,
      '/profile');
  elsif not p_presente and i.stato <> 'assente' then
    -- Era segnato presente per sbaglio: i metri si tolgono con un movimento opposto
    if i.stato = 'presente' and i.metri > 0 then
      insert into public.metri_movimenti (utente_id, metri, motivo, riferimento) values (i.utente_id, -i.metri, 'volontariato', c.id);
    end if;
    update public.volontari_iscrizioni set stato = 'assente', metri = 0, deciso_il = now() where id = i.id;
  end if;
  return v_metri;
end $$;

revoke execute on function public.iscriviti_volontario(uuid, text, text) from public, anon;
revoke execute on function public.ritirati_volontario(uuid) from public, anon;
revoke execute on function public.miei_turni() from public, anon;
revoke execute on function public.chiamate_luogo(uuid) from public, anon;
revoke execute on function public.salva_chiamata(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.volontari_chiamata(uuid) from public, anon;
revoke execute on function public.segna_volontario(uuid, boolean) from public, anon;

grant execute on function public.chiamate_volontari(integer) to anon, authenticated;
grant execute on function public.chiamata_volontari(uuid) to anon, authenticated;
grant execute on function public.iscriviti_volontario(uuid, text, text) to authenticated;
grant execute on function public.ritirati_volontario(uuid) to authenticated;
grant execute on function public.miei_turni() to authenticated;
grant execute on function public.chiamate_luogo(uuid) to authenticated;
grant execute on function public.salva_chiamata(uuid, uuid, jsonb) to authenticated;
grant execute on function public.volontari_chiamata(uuid) to authenticated;
grant execute on function public.segna_volontario(uuid, boolean) to authenticated;
