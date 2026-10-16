-- 0046: Prenotazioni di 739 (scelta di Alex del 16/10/2026, «punto 3»): per i centri che non hanno un sistema
-- di prenotazione (campi, palestre, parrucchieri, sale, tavoli…). Il gestore della scheda (titolare approvato,
-- 0034) prepara le sue risorse (campo 1, campo 2, una poltrona), gli orari e le regole; chi ha l'SMR ID sceglie
-- uno slot libero e il gestore conferma (o la conferma è automatica, se il gestore la sceglie).
-- Si paga sul posto: niente pagamenti in 739. Le regole di partenza le cambia ogni centro.
-- Applicata da Claude il 16/10/2026 in cinque pezzi (lo strumento chiede conferma per ogni delete: per questo un orario
-- chiuso si toglie con tolto_il e non si cancella). Solo oggetti nuovi, più la nuova categoria_attivita() che comprende gli impianti sportivi (una funzione,
-- nessuna tabella con dati cambia).

-- Anche gli impianti sportivi sono attività che un gestore può chiedere («È la tua attività?»)
create or replace function public.categoria_attivita(c text)
returns boolean language sql immutable set search_path = '' as $$
  select c in ('locale', 'negozio', 'carburante', 'azienda', 'professionista', 'artigiano', 'animali', 'associazione', 'dormire', 'impianto')
$$;

-- Orari della settimana nella forma di sempre: {"1": [["08:00","13:00"]], …}, 1 = lunedì
create or replace function public.orari_validi(o jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select o is null or (jsonb_typeof(o) = 'object' and not exists (
    select 1 from jsonb_each(o) g
    where g.key !~ '^[1-7]$' or jsonb_typeof(g.value) <> 'array'
       or exists (select 1 from jsonb_array_elements(g.value) f
                  where jsonb_typeof(f) <> 'array' or jsonb_array_length(f) <> 2
                     or (f->>0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (f->>1) !~ '^([01][0-9]|2[0-4]):[0-5][0-9]$'
                     or (f->>1) <= (f->>0))
  ))
$$;

-- Le regole del centro (una riga per scheda)
create table if not exists public.prenota_impostazioni (
  luogo_id uuid primary key references public.luoghi (id) on delete cascade,
  attiva boolean not null default false,
  conferma text not null default 'manuale' check (conferma in ('manuale', 'automatica')),
  orari jsonb check (public.orari_validi(orari)),          -- se manca valgono gli orari della scheda
  anticipo_ore integer not null default 2 check (anticipo_ore between 0 and 168),
  giorni_avanti integer not null default 14 check (giorni_avanti between 1 and 90),
  disdetta_ore integer not null default 24 check (disdetta_ore between 0 and 168),
  max_attive integer not null default 2 check (max_attive between 1 and 10),
  nota text check (char_length(nota) <= 300),             -- es. «Si paga alla reception. Racchette a noleggio.»
  aggiornato_il timestamptz not null default now()
);

-- Le risorse prenotabili: campo 1, campo 2, poltrona, sala…
create table if not exists public.prenota_risorse (
  id uuid primary key default gen_random_uuid(),
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 60),
  descrizione text check (char_length(descrizione) <= 200),
  durata_min integer not null default 60 check (durata_min between 10 and 480),
  orari jsonb check (public.orari_validi(orari)),          -- se manca valgono quelli del centro
  attiva boolean not null default true,
  ordine integer not null default 0,
  creato_il timestamptz not null default now()
);
create index if not exists prenota_risorse_per_luogo on public.prenota_risorse (luogo_id);

-- Orari chiusi dal gestore (corsi, manutenzione, ferie): su una risorsa o su tutto il centro
create table if not exists public.prenota_blocchi (
  id uuid primary key default gen_random_uuid(),
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  risorsa_id uuid references public.prenota_risorse (id) on delete cascade,
  dal timestamptz not null,
  al timestamptz not null check (al > dal),
  motivo text check (char_length(motivo) <= 120),
  tolto_il timestamptz,                                   -- tolto dal gestore (niente delete: resta lo storico)
  creato_il timestamptz not null default now()
);
create index if not exists prenota_blocchi_per_luogo on public.prenota_blocchi (luogo_id, dal);

create table if not exists public.prenotazioni (
  id uuid primary key default gen_random_uuid(),
  luogo_id uuid not null references public.luoghi (id) on delete cascade,
  risorsa_id uuid not null references public.prenota_risorse (id) on delete cascade,
  utente_id uuid not null references auth.users (id) on delete cascade,
  inizio timestamptz not null,
  fine timestamptz not null check (fine > inizio),
  stato text not null check (stato in ('richiesta', 'confermata', 'rifiutata', 'annullata', 'assente')),
  annullata_da text check (annullata_da in ('cliente', 'gestore')),
  telefono text check (char_length(telefono) <= 30),
  nota text check (char_length(nota) <= 300),
  nota_gestore text check (char_length(nota_gestore) <= 300),
  creato_il timestamptz not null default now(),
  deciso_il timestamptz
);
create index if not exists prenotazioni_per_risorsa on public.prenotazioni (risorsa_id, inizio);
create index if not exists prenotazioni_per_utente on public.prenotazioni (utente_id, inizio);
create index if not exists prenotazioni_per_luogo on public.prenotazioni (luogo_id, inizio);

-- Nessuna regola sulle quattro tabelle: si usano solo con le funzioni qui sotto
alter table public.prenota_impostazioni enable row level security;
alter table public.prenota_risorse enable row level security;
alter table public.prenota_blocchi enable row level security;
alter table public.prenotazioni enable row level security;

-- Una prenotazione occupa lo slot finché è richiesta o confermata
create or replace function public.prenotazione_attiva(s text)
returns boolean language sql immutable set search_path = '' as $$ select s in ('richiesta', 'confermata') $$;

-- Il centro accetta prenotazioni: impostazioni attive e un gestore approvato
create or replace function public.prenota_aperta(p_luogo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.prenota_impostazioni i where i.luogo_id = p_luogo and i.attiva)
     and exists (select 1 from public.attivita_gestori g where g.luogo_id = p_luogo and g.stato = 'approvata')
$$;

-- Gli slot di una risorsa in un giorno (ora di San Marino): dalle fasce degli orari, uno dopo l'altro, lunghi la durata
create or replace function public.prenota_slot(p_risorsa uuid, p_giorno date)
returns table (inizio timestamptz, fine timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.prenota_risorse;
  v_orari jsonb;
  fascia jsonb;
  m integer;
  m_fine integer;
begin
  select * into r from public.prenota_risorse where id = p_risorsa;
  if r.id is null then return; end if;
  select coalesce(r.orari, i.orari, l.orari_settimana) into v_orari
  from public.luoghi l left join public.prenota_impostazioni i on i.luogo_id = l.id
  where l.id = r.luogo_id;
  if v_orari is null then return; end if;
  for fascia in select value from jsonb_array_elements(coalesce(v_orari->(extract(isodow from p_giorno)::int::text), '[]'::jsonb)) loop
    m := split_part(fascia->>0, ':', 1)::int * 60 + split_part(fascia->>0, ':', 2)::int;
    m_fine := split_part(fascia->>1, ':', 1)::int * 60 + split_part(fascia->>1, ':', 2)::int;
    while m + r.durata_min <= m_fine loop
      inizio := (p_giorno::timestamp + make_interval(mins => m)) at time zone 'Europe/San_Marino';
      fine := inizio + make_interval(mins => r.durata_min);
      return next;
      m := m + r.durata_min;
    end loop;
  end loop;
end $$;

-- Pubblico: le regole e le risorse di un centro, se prenota (null altrimenti)
create or replace function public.prenota_info(p_luogo uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.prenota_aperta(p_luogo) then (
    select jsonb_build_object(
      'conferma', i.conferma, 'nota', i.nota, 'anticipo_ore', i.anticipo_ore, 'giorni_avanti', i.giorni_avanti,
      'disdetta_ore', i.disdetta_ore, 'max_attive', i.max_attive,
      'risorse', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nome', r.nome, 'descrizione', r.descrizione, 'durata_min', r.durata_min) order by r.ordine, r.nome)
                           from public.prenota_risorse r where r.luogo_id = p_luogo and r.attiva), '[]'::jsonb))
    from public.prenota_impostazioni i where i.luogo_id = p_luogo)
  end
$$;

-- Pubblico: gli slot di un giorno con lo stato (libero, occupato, passato). Mai chi ha prenotato.
create or replace function public.prenota_disponibilita(p_luogo uuid, p_giorno date)
returns table (risorsa_id uuid, inizio timestamptz, fine timestamptz, stato text)
language plpgsql stable security definer set search_path = '' as $$
declare
  i public.prenota_impostazioni;
  v_oggi date := (now() at time zone 'Europe/San_Marino')::date;
begin
  if not public.prenota_aperta(p_luogo) then return; end if;
  select * into i from public.prenota_impostazioni where luogo_id = p_luogo;
  if p_giorno < v_oggi or p_giorno > v_oggi + i.giorni_avanti then return; end if;
  return query
    select r.id, s.inizio, s.fine,
      case
        when s.inizio < now() + make_interval(hours => i.anticipo_ore) then 'passato'
        when exists (select 1 from public.prenotazioni p where p.risorsa_id = r.id and public.prenotazione_attiva(p.stato)
                     and p.inizio < s.fine and p.fine > s.inizio) then 'occupato'
        when exists (select 1 from public.prenota_blocchi b where b.luogo_id = p_luogo and b.tolto_il is null and (b.risorsa_id is null or b.risorsa_id = r.id)
                     and b.dal < s.fine and b.al > s.inizio) then 'occupato'
        else 'libero'
      end
    from public.prenota_risorse r
    cross join lateral public.prenota_slot(r.id, p_giorno) s
    where r.luogo_id = p_luogo and r.attiva
    order by r.ordine, r.nome, s.inizio;
end $$;

-- Prenota uno slot (con SMR ID). Controlla tutto e blocca la risorsa, così due persone non prendono lo stesso slot.
create or replace function public.prenota(p_risorsa uuid, p_inizio timestamptz, p_telefono text default null, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.prenota_risorse;
  i public.prenota_impostazioni;
  v_fine timestamptz;
  v_stato text;
  v_id uuid;
  v_giorno date := (p_inizio at time zone 'Europe/San_Marino')::date;
  v_oggi date := (now() at time zone 'Europe/San_Marino')::date;
  v_tel text := nullif(trim(coalesce(p_telefono, '')), '');
begin
  if auth.uid() is null then raise exception 'Per prenotare entra con il tuo SMR ID.'; end if;
  select * into r from public.prenota_risorse where id = p_risorsa and attiva for update;
  if r.id is null then raise exception 'Questa risorsa non si può più prenotare.'; end if;
  if not public.prenota_aperta(r.luogo_id) then raise exception 'Questo centro non accetta prenotazioni da 739 in questo momento.'; end if;
  select * into i from public.prenota_impostazioni where luogo_id = r.luogo_id;
  if v_tel is not null and v_tel !~ '^[+0-9 ./()-]{6,30}$' then raise exception 'Il telefono non sembra giusto.'; end if;
  if char_length(coalesce(p_nota, '')) > 300 then raise exception 'La nota è troppo lunga: massimo 300 caratteri.'; end if;
  if p_inizio < now() + make_interval(hours => i.anticipo_ore) then
    raise exception 'Questo orario è troppo vicino: si prenota almeno % ore prima.', i.anticipo_ore;
  end if;
  if v_giorno > v_oggi + i.giorni_avanti then raise exception 'Si prenota al massimo % giorni prima.', i.giorni_avanti; end if;
  select s.fine into v_fine from public.prenota_slot(r.id, v_giorno) s where s.inizio = p_inizio;
  if v_fine is null then raise exception 'Questo orario non è tra quelli prenotabili.'; end if;
  if exists (select 1 from public.prenotazioni p where p.risorsa_id = r.id and public.prenotazione_attiva(p.stato) and p.inizio < v_fine and p.fine > p_inizio)
     or exists (select 1 from public.prenota_blocchi b where b.luogo_id = r.luogo_id and b.tolto_il is null and (b.risorsa_id is null or b.risorsa_id = r.id) and b.dal < v_fine and b.al > p_inizio) then
    raise exception 'Questo orario è appena stato preso: scegline un altro.';
  end if;
  if (select count(*) from public.prenotazioni p where p.utente_id = auth.uid() and p.luogo_id = r.luogo_id
      and public.prenotazione_attiva(p.stato) and p.fine > now()) >= i.max_attive then
    raise exception 'Hai già % prenotazioni in arrivo in questo centro: aspetta che passino o annullane una.', i.max_attive;
  end if;
  if (select count(*) from public.prenotazioni p where p.utente_id = auth.uid() and p.stato = 'assente' and p.inizio > now() - interval '90 days') >= 2
     and (select max(p.inizio) from public.prenotazioni p where p.utente_id = auth.uid() and p.stato = 'assente') > now() - interval '30 days' then
    raise exception 'Non ti sei presentato a due prenotazioni: per un mese non puoi prenotare da 739.';
  end if;
  if (select count(*) from public.prenotazioni p where p.utente_id = auth.uid() and p.creato_il > now() - interval '1 day') >= 10 then
    raise exception 'Hai fatto troppe prenotazioni oggi: riprova domani.';
  end if;
  v_stato := case when i.conferma = 'automatica' then 'confermata' else 'richiesta' end;
  insert into public.prenotazioni (luogo_id, risorsa_id, utente_id, inizio, fine, stato, telefono, nota, deciso_il)
  values (r.luogo_id, r.id, auth.uid(), p_inizio, v_fine, v_stato, v_tel, nullif(trim(coalesce(p_nota, '')), ''),
          case when v_stato = 'confermata' then now() end)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'stato', v_stato);
end $$;

-- Le mie prenotazioni (le prossime e quelle degli ultimi 30 giorni)
create or replace function public.mie_prenotazioni()
returns table (id uuid, luogo_id uuid, luogo text, risorsa text, inizio timestamptz, fine timestamptz, stato text, annullata_da text,
               nota_gestore text, disdetta_ore integer, nota_centro text, telefono_centro text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.luogo_id, l.nome, r.nome, p.inizio, p.fine, p.stato, p.annullata_da, p.nota_gestore,
         coalesce(i.disdetta_ore, 24), i.nota, l.telefono
  from public.prenotazioni p
  join public.luoghi l on l.id = p.luogo_id
  join public.prenota_risorse r on r.id = p.risorsa_id
  left join public.prenota_impostazioni i on i.luogo_id = p.luogo_id
  where p.utente_id = auth.uid() and p.fine > now() - interval '30 days'
  order by (p.fine > now()) desc, case when p.fine > now() then p.inizio end asc, p.inizio desc
  limit 100
$$;

-- Annullo la mia prenotazione, se sono ancora nei tempi della disdetta
create or replace function public.annulla_prenotazione(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.prenotazioni;
  v_ore integer;
begin
  select * into p from public.prenotazioni where id = p_id and utente_id = auth.uid() for update;
  if p.id is null then raise exception 'Prenotazione non trovata.'; end if;
  if not public.prenotazione_attiva(p.stato) then raise exception 'Questa prenotazione non è più attiva.'; end if;
  select coalesce(disdetta_ore, 24) into v_ore from public.prenota_impostazioni where luogo_id = p.luogo_id;
  if p.stato = 'confermata' and p.inizio < now() + make_interval(hours => coalesce(v_ore, 24)) then
    raise exception 'È tardi per annullare da 739 (almeno % ore prima): chiama il centro.', coalesce(v_ore, 24);
  end if;
  update public.prenotazioni set stato = 'annullata', annullata_da = 'cliente', deciso_il = now() where id = p_id;
end $$;

-- ——— Il gestore (titolare approvato o redazione: e_mio_luogo, 0035) ———

create or replace function public.prenota_gestione(p_luogo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  return jsonb_build_object(
    'impostazioni', coalesce((select to_jsonb(i) - 'luogo_id' from public.prenota_impostazioni i where i.luogo_id = p_luogo),
                             jsonb_build_object('attiva', false, 'conferma', 'manuale', 'orari', null, 'anticipo_ore', 2, 'giorni_avanti', 14,
                                                'disdetta_ore', 24, 'max_attive', 2, 'nota', null)),
    'orari_scheda', (select orari_settimana from public.luoghi where id = p_luogo),
    'risorse', coalesce((select jsonb_agg(to_jsonb(r) - 'luogo_id' order by r.ordine, r.nome) from public.prenota_risorse r where r.luogo_id = p_luogo), '[]'::jsonb),
    'in_attesa', (select count(*) from public.prenotazioni p where p.luogo_id = p_luogo and p.stato = 'richiesta' and p.fine > now()),
    'oggi', (select count(*) from public.prenotazioni p where p.luogo_id = p_luogo and public.prenotazione_attiva(p.stato)
             and (p.inizio at time zone 'Europe/San_Marino')::date = (now() at time zone 'Europe/San_Marino')::date)
  );
end $$;

create or replace function public.salva_prenota_impostazioni(p_luogo uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := coalesce(p, '{}'::jsonb);
  v_orari jsonb := case when jsonb_typeof(d->'orari') = 'object' and d->'orari' <> '{}'::jsonb then d->'orari' end;
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  if not public.orari_validi(v_orari) then raise exception 'Gli orari vanno scritti come 08:30, e la fine dopo l''inizio.'; end if;
  if coalesce(d->>'conferma', 'manuale') not in ('manuale', 'automatica') then raise exception 'Scegli come confermare.'; end if;
  if coalesce((d->>'anticipo_ore')::int, 2) not between 0 and 168 then raise exception 'L''anticipo va da 0 a 168 ore.'; end if;
  if coalesce((d->>'giorni_avanti')::int, 14) not between 1 and 90 then raise exception 'Si può aprire da 1 a 90 giorni avanti.'; end if;
  if coalesce((d->>'disdetta_ore')::int, 24) not between 0 and 168 then raise exception 'La disdetta va da 0 a 168 ore.'; end if;
  if coalesce((d->>'max_attive')::int, 2) not between 1 and 10 then raise exception 'Le prenotazioni per persona vanno da 1 a 10.'; end if;
  if char_length(coalesce(d->>'nota', '')) > 300 then raise exception 'La nota è troppo lunga: massimo 300 caratteri.'; end if;
  if coalesce((d->>'attiva')::boolean, false) and not exists (select 1 from public.prenota_risorse where luogo_id = p_luogo and attiva) then
    raise exception 'Prima aggiungi almeno una cosa da prenotare (un campo, una sala, una poltrona).';
  end if;
  insert into public.prenota_impostazioni (luogo_id, attiva, conferma, orari, anticipo_ore, giorni_avanti, disdetta_ore, max_attive, nota, aggiornato_il)
  values (p_luogo, coalesce((d->>'attiva')::boolean, false), coalesce(d->>'conferma', 'manuale'), v_orari,
          coalesce((d->>'anticipo_ore')::int, 2), coalesce((d->>'giorni_avanti')::int, 14), coalesce((d->>'disdetta_ore')::int, 24),
          coalesce((d->>'max_attive')::int, 2), nullif(trim(coalesce(d->>'nota', '')), ''), now())
  on conflict (luogo_id) do update set attiva = excluded.attiva, conferma = excluded.conferma, orari = excluded.orari,
    anticipo_ore = excluded.anticipo_ore, giorni_avanti = excluded.giorni_avanti, disdetta_ore = excluded.disdetta_ore,
    max_attive = excluded.max_attive, nota = excluded.nota, aggiornato_il = now();
end $$;

create or replace function public.salva_risorsa(p_luogo uuid, p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := coalesce(p, '{}'::jsonb);
  v_id uuid;
  v_orari jsonb := case when jsonb_typeof(d->'orari') = 'object' and d->'orari' <> '{}'::jsonb then d->'orari' end;
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  if char_length(trim(coalesce(d->>'nome', ''))) not between 2 and 60 then raise exception 'Scrivi il nome, per esempio «Campo 1».'; end if;
  if coalesce((d->>'durata_min')::int, 60) not between 10 and 480 then raise exception 'La durata va da 10 minuti a 8 ore.'; end if;
  if char_length(coalesce(d->>'descrizione', '')) > 200 then raise exception 'La descrizione è troppo lunga: massimo 200 caratteri.'; end if;
  if not public.orari_validi(v_orari) then raise exception 'Gli orari vanno scritti come 08:30, e la fine dopo l''inizio.'; end if;
  if p_id is null then
    if (select count(*) from public.prenota_risorse where luogo_id = p_luogo) >= 20 then raise exception 'Al massimo 20 cose da prenotare per centro.'; end if;
    insert into public.prenota_risorse (luogo_id, nome, descrizione, durata_min, orari, attiva, ordine)
    values (p_luogo, trim(d->>'nome'), nullif(trim(coalesce(d->>'descrizione', '')), ''), coalesce((d->>'durata_min')::int, 60), v_orari,
            coalesce((d->>'attiva')::boolean, true), coalesce((select max(ordine) + 1 from public.prenota_risorse where luogo_id = p_luogo), 0))
    returning id into v_id;
  else
    update public.prenota_risorse set nome = trim(d->>'nome'), descrizione = nullif(trim(coalesce(d->>'descrizione', '')), ''),
           durata_min = coalesce((d->>'durata_min')::int, durata_min), orari = v_orari, attiva = coalesce((d->>'attiva')::boolean, attiva)
    where id = p_id and luogo_id = p_luogo
    returning id into v_id;
    if v_id is null then raise exception 'Risorsa non trovata.'; end if;
  end if;
  return v_id;
end $$;

-- Le prenotazioni del centro da un giorno per n giorni, con chi ha prenotato (solo per il gestore)
create or replace function public.prenotazioni_luogo(p_luogo uuid, p_da date, p_giorni integer default 7)
returns table (id uuid, risorsa_id uuid, risorsa text, inizio timestamptz, fine timestamptz, stato text, annullata_da text,
               nome text, email text, telefono text, nota text, nota_gestore text, creato_il timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  return query
    select p.id, p.risorsa_id, r.nome, p.inizio, p.fine, p.stato, p.annullata_da, pr.nome, u.email::text, p.telefono, p.nota, p.nota_gestore, p.creato_il
    from public.prenotazioni p
    join public.prenota_risorse r on r.id = p.risorsa_id
    left join public.profili pr on pr.id = p.utente_id
    left join auth.users u on u.id = p.utente_id
    where p.luogo_id = p_luogo
      and p.inizio >= (p_da::timestamp at time zone 'Europe/San_Marino')
      and p.inizio < ((p_da + least(greatest(coalesce(p_giorni, 7), 1), 62))::timestamp at time zone 'Europe/San_Marino')
    order by p.inizio, r.ordine;
end $$;

-- Il gestore conferma o rifiuta una richiesta, annulla una prenotazione o segna chi non si è presentato
create or replace function public.decidi_prenotazione(p_id uuid, p_stato text, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.prenotazioni;
begin
  select * into p from public.prenotazioni where id = p_id for update;
  if p.id is null then raise exception 'Prenotazione non trovata.'; end if;
  if not public.e_mio_luogo(p.luogo_id) then raise exception 'Questa prenotazione non è del tuo centro.'; end if;
  if char_length(coalesce(p_nota, '')) > 300 then raise exception 'La nota è troppo lunga.'; end if;
  if p_stato in ('confermata', 'rifiutata') and p.stato <> 'richiesta' then raise exception 'Questa richiesta è già stata decisa.'; end if;
  if p_stato = 'annullata' and not public.prenotazione_attiva(p.stato) then raise exception 'Questa prenotazione non è più attiva.'; end if;
  if p_stato = 'assente' and (p.stato <> 'confermata' or p.inizio > now()) then raise exception 'Si segna l''assenza solo dopo l''inizio di una prenotazione confermata.'; end if;
  if p_stato not in ('confermata', 'rifiutata', 'annullata', 'assente') then raise exception 'Decisione non valida.'; end if;
  update public.prenotazioni set stato = p_stato, deciso_il = now(),
         annullata_da = case when p_stato = 'annullata' then 'gestore' else annullata_da end,
         nota_gestore = coalesce(nullif(trim(coalesce(p_nota, '')), ''), nota_gestore)
  where id = p_id;
end $$;

create or replace function public.blocca_orario(p_luogo uuid, p_risorsa uuid, p_dal timestamptz, p_al timestamptz, p_motivo text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  if p_al <= p_dal then raise exception 'La fine deve venire dopo l''inizio.'; end if;
  if p_al - p_dal > interval '62 days' then raise exception 'Al massimo 62 giorni per volta.'; end if;
  if p_risorsa is not null and not exists (select 1 from public.prenota_risorse where id = p_risorsa and luogo_id = p_luogo) then
    raise exception 'Risorsa non trovata.';
  end if;
  insert into public.prenota_blocchi (luogo_id, risorsa_id, dal, al, motivo)
  values (p_luogo, p_risorsa, p_dal, p_al, nullif(trim(coalesce(p_motivo, '')), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.blocchi_luogo(p_luogo uuid)
returns table (id uuid, risorsa_id uuid, risorsa text, dal timestamptz, al timestamptz, motivo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_mio_luogo(p_luogo) then raise exception 'Questa scheda non la gestisci tu.'; end if;
  return query
    select b.id, b.risorsa_id, r.nome, b.dal, b.al, b.motivo
    from public.prenota_blocchi b left join public.prenota_risorse r on r.id = b.risorsa_id
    where b.luogo_id = p_luogo and b.al > now() and b.tolto_il is null
    order by b.dal;
end $$;

create or replace function public.togli_blocco(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_luogo uuid;
begin
  select luogo_id into v_luogo from public.prenota_blocchi where id = p_id and tolto_il is null;
  if v_luogo is null or not public.e_mio_luogo(v_luogo) then raise exception 'Blocco non trovato.'; end if;
  update public.prenota_blocchi set tolto_il = now() where id = p_id;
end $$;

revoke execute on function public.prenota_slot(uuid, date) from public, anon, authenticated;
revoke execute on function public.prenota(uuid, timestamptz, text, text) from public, anon;
revoke execute on function public.mie_prenotazioni() from public, anon;
revoke execute on function public.annulla_prenotazione(uuid) from public, anon;
revoke execute on function public.prenota_gestione(uuid) from public, anon;
revoke execute on function public.salva_prenota_impostazioni(uuid, jsonb) from public, anon;
revoke execute on function public.salva_risorsa(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.prenotazioni_luogo(uuid, date, integer) from public, anon;
revoke execute on function public.decidi_prenotazione(uuid, text, text) from public, anon;
revoke execute on function public.blocca_orario(uuid, uuid, timestamptz, timestamptz, text) from public, anon;
revoke execute on function public.blocchi_luogo(uuid) from public, anon;
revoke execute on function public.togli_blocco(uuid) from public, anon;
grant execute on function public.prenota(uuid, timestamptz, text, text) to authenticated;
grant execute on function public.mie_prenotazioni() to authenticated;
grant execute on function public.annulla_prenotazione(uuid) to authenticated;
grant execute on function public.prenota_gestione(uuid) to authenticated;
grant execute on function public.salva_prenota_impostazioni(uuid, jsonb) to authenticated;
grant execute on function public.salva_risorsa(uuid, uuid, jsonb) to authenticated;
grant execute on function public.prenotazioni_luogo(uuid, date, integer) to authenticated;
grant execute on function public.decidi_prenotazione(uuid, text, text) to authenticated;
grant execute on function public.blocca_orario(uuid, uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.blocchi_luogo(uuid) to authenticated;
grant execute on function public.togli_blocco(uuid) to authenticated;
grant execute on function public.prenota_info(uuid) to anon, authenticated;
grant execute on function public.prenota_disponibilita(uuid, date) to anon, authenticated;
grant execute on function public.prenota_aperta(uuid) to anon, authenticated;
