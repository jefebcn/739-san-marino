-- 0048: la Bacheca (Comunità, Fase 3). Annunci di chi vive qui, con SMR ID: cerco, offro, regalo,
-- perso, trovato, iniziative. Ogni annuncio lo approva la redazione prima che esca (nessun contenuto
-- senza un occhio umano). Il contatto lo vede solo chi è entrato con l'SMR ID. Solo oggetti nuovi.

create table if not exists public.bacheca (
  id uuid primary key default gen_random_uuid(),
  autore uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('cerco', 'offro', 'regalo', 'perso', 'trovato', 'iniziativa')),
  titolo text not null check (char_length(titolo) between 5 and 80),
  testo text not null check (char_length(testo) between 10 and 600),
  castello_id smallint references public.castelli (id),
  contatto text not null check (char_length(contatto) between 5 and 120),
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'pubblicato', 'rifiutato', 'chiuso', 'ritirato')),
  nota_redazione text,
  scade date not null,
  creato_il timestamptz not null default now(),
  deciso_il timestamptz,
  deciso_da uuid references auth.users (id) on delete set null
);
create index if not exists bacheca_per_stato on public.bacheca (stato, scade);
create index if not exists bacheca_per_autore on public.bacheca (autore, creato_il);
alter table public.bacheca enable row level security;
-- Nessuna regola: si legge e si scrive solo con le funzioni qui sotto.

-- public.oggi_sm() esiste già (data di oggi a San Marino).

-- Pubblico: gli annunci pubblicati e non scaduti, i più nuovi prima. Il contatto solo a chi è entrato.
create or replace function public.annunci_bacheca(p_tipo text default null, p_castello smallint default null, p_limite integer default 100)
returns table (id uuid, tipo text, titolo text, testo text, castello_id smallint, contatto text, scade date, pubblicato_il timestamptz, mio boolean)
language sql stable security definer set search_path = '' as $$
  select b.id, b.tipo, b.titolo, b.testo, b.castello_id,
         case when auth.uid() is not null then b.contatto end,
         b.scade, coalesce(b.deciso_il, b.creato_il), b.autore = auth.uid()
  from public.bacheca b
  where b.stato = 'pubblicato' and b.scade >= public.oggi_sm()
    and (p_tipo is null or b.tipo = p_tipo) and (p_castello is null or b.castello_id = p_castello)
  order by coalesce(b.deciso_il, b.creato_il) desc
  limit least(greatest(coalesce(p_limite, 100), 1), 200)
$$;

-- Scrive un annuncio (con SMR ID): va in attesa della redazione. Al massimo 3 al giorno e 5 attivi per persona.
create or replace function public.proponi_annuncio(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := coalesce(p, '{}'::jsonb);
  v_id uuid;
  v_giorni integer := coalesce((d->>'giorni')::int, 30);
begin
  if auth.uid() is null then raise exception 'Per scrivere in bacheca entra con il tuo SMR ID.'; end if;
  if coalesce(d->>'tipo', '') not in ('cerco', 'offro', 'regalo', 'perso', 'trovato', 'iniziativa') then raise exception 'Scegli il tipo di annuncio.'; end if;
  if char_length(trim(coalesce(d->>'titolo', ''))) not between 5 and 80 then raise exception 'Il titolo va da 5 a 80 caratteri.'; end if;
  if char_length(trim(coalesce(d->>'testo', ''))) not between 10 and 600 then raise exception 'Il testo va da 10 a 600 caratteri.'; end if;
  if char_length(trim(coalesce(d->>'contatto', ''))) not between 5 and 120 then raise exception 'Scrivi come contattarti: telefono o email.'; end if;
  if v_giorni not in (7, 15, 30, 60) then raise exception 'Scegli quanto resta in bacheca.'; end if;
  if d->>'castello_id' is not null and not exists (select 1 from public.castelli where id = (d->>'castello_id')::smallint) then raise exception 'Castello non valido.'; end if;
  if (select count(*) from public.bacheca where autore = auth.uid() and creato_il > now() - interval '1 day') >= 3 then
    raise exception 'Hai già scritto 3 annunci oggi: riprova domani.';
  end if;
  if (select count(*) from public.bacheca where autore = auth.uid() and stato in ('in_attesa', 'pubblicato') and scade >= public.oggi_sm()) >= 5 then
    raise exception 'Hai già 5 annunci attivi: chiudine uno prima di scriverne un altro.';
  end if;
  insert into public.bacheca (autore, tipo, titolo, testo, castello_id, contatto, scade)
  values (auth.uid(), d->>'tipo', trim(d->>'titolo'), trim(d->>'testo'), (d->>'castello_id')::smallint, trim(d->>'contatto'), public.oggi_sm() + v_giorni)
  returning id into v_id;
  return v_id;
end $$;

-- I miei annunci (tutti gli stati), i più nuovi prima
create or replace function public.miei_annunci()
returns table (id uuid, tipo text, titolo text, testo text, castello_id smallint, contatto text, stato text, nota_redazione text, scade date, creato_il timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.id, b.tipo, b.titolo, b.testo, b.castello_id, b.contatto, b.stato, b.nota_redazione, b.scade, b.creato_il
  from public.bacheca b where b.autore = auth.uid() order by b.creato_il desc limit 50
$$;

-- Chiudo il mio annuncio (trovato, venduto, finito)
create or replace function public.chiudi_annuncio(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.bacheca set stato = 'chiuso' where id = p_id and autore = auth.uid() and stato in ('in_attesa', 'pubblicato');
  if not found then raise exception 'Annuncio non trovato o già chiuso.'; end if;
end $$;

-- Redazione: gli annunci di uno stato (in attesa: i più vecchi prima)
create or replace function public.bacheca_redazione(p_stato text default 'in_attesa')
returns table (id uuid, tipo text, titolo text, testo text, castello_id smallint, contatto text, stato text, nota_redazione text, scade date, creato_il timestamptz, autore_nome text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Solo la redazione.'; end if;
  return query
    select b.id, b.tipo, b.titolo, b.testo, b.castello_id, b.contatto, b.stato, b.nota_redazione, b.scade, b.creato_il, pr.nome
    from public.bacheca b left join public.profili pr on pr.id = b.autore
    where b.stato = coalesce(p_stato, 'in_attesa')
    order by case when coalesce(p_stato, 'in_attesa') = 'in_attesa' then b.creato_il end asc, b.creato_il desc
    limit 200;
end $$;

create or replace function public.conteggio_bacheca()
returns integer language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_redattore() then return 0; end if;
  return (select count(*) from public.bacheca where stato = 'in_attesa' and scade >= public.oggi_sm());
end $$;

-- Redazione: pubblica, rifiuta o ritira un annuncio, con una nota per chi l'ha scritto
create or replace function public.decidi_annuncio(p_id uuid, p_stato text, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Solo la redazione.'; end if;
  if p_stato not in ('pubblicato', 'rifiutato', 'ritirato') then raise exception 'Decisione non valida.'; end if;
  if char_length(coalesce(p_nota, '')) > 300 then raise exception 'La nota è troppo lunga.'; end if;
  update public.bacheca set stato = p_stato, nota_redazione = nullif(trim(coalesce(p_nota, '')), ''), deciso_il = now(), deciso_da = auth.uid()
   where id = p_id;
  if not found then raise exception 'Annuncio non trovato.'; end if;
end $$;

revoke execute on function public.proponi_annuncio(jsonb) from public, anon;
revoke execute on function public.miei_annunci() from public, anon;
revoke execute on function public.chiudi_annuncio(uuid) from public, anon;
revoke execute on function public.bacheca_redazione(text) from public, anon;
revoke execute on function public.conteggio_bacheca() from public, anon;
revoke execute on function public.decidi_annuncio(uuid, text, text) from public, anon;
grant execute on function public.annunci_bacheca(text, smallint, integer) to anon, authenticated;
grant execute on function public.proponi_annuncio(jsonb) to authenticated;
grant execute on function public.miei_annunci() to authenticated;
grant execute on function public.chiudi_annuncio(uuid) to authenticated;
grant execute on function public.bacheca_redazione(text) to authenticated;
grant execute on function public.conteggio_bacheca() to authenticated;
grant execute on function public.decidi_annuncio(uuid, text, text) to authenticated;
