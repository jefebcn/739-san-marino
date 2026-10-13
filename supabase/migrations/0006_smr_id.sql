-- 739 San Marino · Core SMR ID: numero tessera e profilo creato alla registrazione.

-- Numero tessera nel formato 739-XXXX-XX, con un alfabeto senza caratteri ambigui (niente 0/O, 1/I).
create or replace function public.nuova_tessera()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codice text;
begin
  loop
    codice := '739-';
    for i in 1..4 loop codice := codice || substr(alfabeto, 1 + floor(random() * 32)::int, 1); end loop;
    codice := codice || '-';
    for i in 1..2 loop codice := codice || substr(alfabeto, 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from public.profili p where p.tessera = codice);
  end loop;
  return codice;
end; $$;
revoke execute on function public.nuova_tessera() from public, anon, authenticated;

alter table public.profili add column tessera text unique default public.nuova_tessera();
alter table public.profili alter column tessera set not null;
alter table public.profili add constraint profili_nome_lunghezza check (nome is null or char_length(nome) between 1 and 60);

-- Alla registrazione: nome e castello arrivano dai metadati scelti nel modulo di iscrizione.
create or replace function public.crea_profilo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c smallint;
begin
  begin
    c := (new.raw_user_meta_data->>'castello_id')::smallint;
  exception when others then
    c := null;
  end;
  if c is not null and not exists (select 1 from public.castelli k where k.id = c) then
    c := null;
  end if;
  insert into public.profili (id, nome, castello_id)
  values (new.id, nullif(left(trim(new.raw_user_meta_data->>'nome'), 60), ''), c);
  return new;
end; $$;
revoke execute on function public.crea_profilo() from public, anon, authenticated;

-- L'utente può cambiare solo nome, castello e lingua del proprio profilo: la tessera no.
revoke update on public.profili from anon, authenticated;
grant update (nome, castello_id, lingua) on public.profili to authenticated;
