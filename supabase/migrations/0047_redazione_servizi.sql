-- 0047: la redazione aggiorna da sola gli orari di funivia e bus e il calendario della raccolta dei rifiuti
-- (Fase 0, strumenti di redazione). Solo funzioni nuove: tabelle e regole esistenti non cambiano.
-- Le scritture passano da qui e vogliono e_redattore(). Niente cancellazioni: una corsa tolta prende
-- `al` = giorno prima di `dal` (non vale mai), una raccolta tolta resta con `giorni` vuoto, e le letture le saltano.

-- Aggiunge le corse di una direzione: un orario per ogni ora dell'elenco, negli stessi giorni e nello stesso periodo.
-- Le corse uguali già presenti (stessa ora, giorni e periodo) non si ripetono. Restituisce quante ne ha aggiunte.
create or replace function public.aggiungi_partenze(p_linea text, p_direzione text, p_ore text[], p_giorni smallint[], p_dal date, p_al date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_ora text;
  v_n integer := 0;
  v_dir text := trim(coalesce(p_direzione, ''));
  v_giorni smallint[];
begin
  if not public.e_redattore() then raise exception 'Solo la redazione aggiorna gli orari.'; end if;
  if not exists (select 1 from public.linee where id = p_linea) then raise exception 'Linea non trovata.'; end if;
  if char_length(v_dir) not between 2 and 80 then raise exception 'Scrivi la direzione, per esempio «Città».'; end if;
  if coalesce(array_length(p_ore, 1), 0) = 0 or array_length(p_ore, 1) > 200 then raise exception 'Scrivi da 1 a 200 orari.'; end if;
  select array_agg(distinct g order by g) into v_giorni from unnest(p_giorni) g;
  if v_giorni is null or exists (select 1 from unnest(v_giorni) g where g not between 1 and 7) then raise exception 'Scegli i giorni (da lunedì a domenica).'; end if;
  if p_dal is null or p_al is null or p_al < p_dal then raise exception 'Scrivi il periodo: dal giorno e fino al giorno.'; end if;
  if p_al > p_dal + 1100 then raise exception 'Un periodo dura al massimo tre anni.'; end if;
  foreach v_ora in array p_ore loop
    if trim(v_ora) !~ '^([01]?[0-9]|2[0-3])[:.][0-5][0-9]$' then raise exception 'Orario non valido: «%». Scrivi le ore come 07:30.', v_ora; end if;
    insert into public.partenze (linea_id, direzione, ora, giorni, dal, al)
    select p_linea, v_dir, replace(trim(v_ora), '.', ':')::time, v_giorni, p_dal, p_al
    where not exists (select 1 from public.partenze p where p.linea_id = p_linea and p.direzione = v_dir
                      and p.ora = replace(trim(v_ora), '.', ':')::time and p.giorni = v_giorni and p.dal = p_dal and p.al = p_al);
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;

-- Accorcia un gruppo di corse (stessa linea, direzione, giorni e periodo): finiscono il giorno `p_fino`.
-- Con `p_fino` prima dell'inizio il gruppo è tolto (non vale più in nessun giorno). Restituisce quante corse ha toccato.
create or replace function public.chiudi_partenze(p_linea text, p_direzione text, p_giorni smallint[], p_dal date, p_al date, p_fino date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  if not public.e_redattore() then raise exception 'Solo la redazione aggiorna gli orari.'; end if;
  if p_fino is null then raise exception 'Scegli fino a quando valgono.'; end if;
  update public.partenze p
     set al = case when p_fino < coalesce(p.dal, p_fino) then p.dal - 1 else p_fino end
   where p.linea_id = p_linea and p.direzione = p_direzione and p.giorni = p_giorni
     and p.dal is not distinct from p_dal and p.al is not distinct from p_al;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Segna una linea come controllata alla fonte (toglie «Da verificare») e ne aggiorna fonte e biglietto
create or replace function public.salva_linea(p_linea text, p_fonte text, p_biglietto text, p_verificata boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Solo la redazione aggiorna gli orari.'; end if;
  if char_length(coalesce(p_fonte, '')) > 300 or char_length(coalesce(p_biglietto, '')) > 300 then raise exception 'Testo troppo lungo: massimo 300 caratteri.'; end if;
  update public.linee set fonte = nullif(trim(coalesce(p_fonte, '')), ''), biglietto = nullif(trim(coalesce(p_biglietto, '')), ''),
         da_verificare = not coalesce(p_verificata, false)
   where id = p_linea;
  if not found then raise exception 'Linea non trovata.'; end if;
end $$;

-- Raccolta dei rifiuti: crea (p_id null) o modifica una riga (castello, zona, frazione, giorni, orario, note)
create or replace function public.salva_raccolta(p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := coalesce(p, '{}'::jsonb);
  v_id uuid;
  v_giorni smallint[];
begin
  if not public.e_redattore() then raise exception 'Solo la redazione aggiorna la raccolta.'; end if;
  if not exists (select 1 from public.castelli where id = (d->>'castello_id')::smallint) then raise exception 'Scegli il castello.'; end if;
  if coalesce(d->>'frazione', '') not in ('organico', 'carta', 'plastica', 'metalli', 'vetro', 'secco', 'verde') then raise exception 'Scegli la frazione.'; end if;
  select array_agg(distinct g::smallint order by g::smallint) into v_giorni from jsonb_array_elements_text(coalesce(d->'giorni', '[]'::jsonb)) g;
  if v_giorni is null or exists (select 1 from unnest(v_giorni) g where g not between 1 and 7) then raise exception 'Scegli almeno un giorno.'; end if;
  if char_length(trim(coalesce(d->>'zona', ''))) not between 2 and 120 then raise exception 'Scrivi la zona, o «Tutto il castello».'; end if;
  if char_length(coalesce(d->>'orario', '')) > 120 or char_length(coalesce(d->>'note', '')) > 300 then raise exception 'Testo troppo lungo.'; end if;
  if p_id is null then
    insert into public.raccolta_rifiuti (castello_id, zona, frazione, giorni, orario, note, da_verificare)
    values ((d->>'castello_id')::smallint, trim(d->>'zona'), d->>'frazione', v_giorni, nullif(trim(coalesce(d->>'orario', '')), ''),
            nullif(trim(coalesce(d->>'note', '')), ''), not coalesce((d->>'verificata')::boolean, false))
    returning id into v_id;
  else
    update public.raccolta_rifiuti set castello_id = (d->>'castello_id')::smallint, zona = trim(d->>'zona'), frazione = d->>'frazione',
           giorni = v_giorni, orario = nullif(trim(coalesce(d->>'orario', '')), ''), note = nullif(trim(coalesce(d->>'note', '')), ''),
           da_verificare = not coalesce((d->>'verificata')::boolean, false)
     where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Riga non trovata.'; end if;
  end if;
  return v_id;
end $$;

-- Toglie una riga della raccolta: resta senza giorni e le letture la saltano
create or replace function public.togli_raccolta(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_redattore() then raise exception 'Solo la redazione aggiorna la raccolta.'; end if;
  update public.raccolta_rifiuti set giorni = '{}' where id = p_id;
  if not found then raise exception 'Riga non trovata.'; end if;
end $$;

revoke execute on function public.aggiungi_partenze(text, text, text[], smallint[], date, date) from public, anon;
revoke execute on function public.chiudi_partenze(text, text, smallint[], date, date, date) from public, anon;
revoke execute on function public.salva_linea(text, text, text, boolean) from public, anon;
revoke execute on function public.salva_raccolta(uuid, jsonb) from public, anon;
revoke execute on function public.togli_raccolta(uuid) from public, anon;
grant execute on function public.aggiungi_partenze(text, text, text[], smallint[], date, date) to authenticated;
grant execute on function public.chiudi_partenze(text, text, smallint[], date, date, date) to authenticated;
grant execute on function public.salva_linea(text, text, text, boolean) to authenticated;
grant execute on function public.salva_raccolta(uuid, jsonb) to authenticated;
grant execute on function public.togli_raccolta(uuid) to authenticated;
