-- 739 San Marino · Modulo Sport: azioni che modificano partite e rating
-- (ritirarsi, annullare, formare le squadre bilanciate, registrare il risultato con Glicko-2).
-- File separato da 0007 perché Supabase chiede una conferma manuale per le funzioni che contengono update/delete.

create or replace function public.ritirati_partita(p_partita uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  p public.partite;
begin
  if io is null then raise exception 'Accedi con il tuo SMR ID.'; end if;
  select * into p from public.partite where id = p_partita for update;
  if p.id is null then raise exception 'Partita non trovata.'; end if;
  if p.organizzatore_id = io then raise exception 'Sei l''organizzatore: se non si gioca, annulla la partita.'; end if;
  if p.stato not in ('aperta', 'squadre') or p.inizio <= now() then raise exception 'Non puoi più ritirarti da questa partita.'; end if;
  delete from public.iscrizioni where partita_id = p.id and utente_id = io;
  -- Se le squadre erano già fatte, vanno rifatte
  if p.stato = 'squadre' then
    update public.partite set stato = 'aperta' where id = p.id;
    update public.iscrizioni set squadra = null where partita_id = p.id;
  end if;
end; $$;

create or replace function public.annulla_partita(p_partita uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.partite set stato = 'annullata'
  where id = p_partita and organizzatore_id = auth.uid() and stato in ('aperta', 'squadre');
  if not found then raise exception 'Solo l''organizzatore può annullare una partita in programma.'; end if;
end; $$;

-- Squadre bilanciate: i giocatori, dal rating più alto, vanno nella squadra con la somma più bassa.
create or replace function public.forma_squadre(p_partita uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.partite;
  n integer;
  somma_a double precision := 0; somma_b double precision := 0;
  conta_a integer := 0; conta_b integer := 0;
  g record;
begin
  select * into p from public.partite where id = p_partita for update;
  if p.id is null or p.organizzatore_id is distinct from auth.uid() then raise exception 'Solo l''organizzatore può formare le squadre.'; end if;
  if p.stato not in ('aperta', 'squadre') then raise exception 'La partita è già chiusa.'; end if;
  select count(*) into n from public.iscrizioni where partita_id = p.id;
  if n < 2 or n % 2 = 1 then raise exception 'Servono un numero pari di giocatori (almeno 2).'; end if;

  for g in
    select i.utente_id, coalesce(r.rating, 1500) as rating
    from public.iscrizioni i
    left join public.rating_sport r on r.utente_id = i.utente_id and r.sport_id = p.sport_id
    where i.partita_id = p.id
    order by coalesce(r.rating, 1500) desc, random()
  loop
    if conta_a < n / 2 and (somma_a <= somma_b or conta_b >= n / 2) then
      update public.iscrizioni set squadra = 'A' where partita_id = p.id and utente_id = g.utente_id;
      somma_a := somma_a + g.rating; conta_a := conta_a + 1;
    else
      update public.iscrizioni set squadra = 'B' where partita_id = p.id and utente_id = g.utente_id;
      somma_b := somma_b + g.rating; conta_b := conta_b + 1;
    end if;
  end loop;
  update public.partite set stato = 'squadre' where id = p.id;
end; $$;

-- Risultato finale: aggiorna il Glicko-2 di ogni giocatore contro la squadra avversaria (media di rating e RD).
create or replace function public.registra_risultato(p_partita uuid, p_punti_a integer, p_punti_b integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.partite;
  g record;
  avv_r double precision; avv_rd double precision;
  media_a_r double precision; media_a_rd double precision; media_b_r double precision; media_b_rd double precision;
  esito double precision;
  nuovo record;
begin
  select * into p from public.partite where id = p_partita for update;
  if p.id is null or p.organizzatore_id is distinct from auth.uid() then raise exception 'Solo l''organizzatore può registrare il risultato.'; end if;
  if p.stato <> 'squadre' then raise exception 'Prima vanno formate le squadre.'; end if;
  if p.inizio > now() then raise exception 'Il risultato si registra dopo l''inizio della partita.'; end if;
  if p_punti_a is null or p_punti_b is null or p_punti_a < 0 or p_punti_b < 0 or p_punti_a > 999 or p_punti_b > 999 then
    raise exception 'Punteggio non valido.';
  end if;

  -- Rating medi delle due squadre, calcolati prima di cambiare qualcosa
  select avg(coalesce(r.rating, 1500)) filter (where i.squadra = 'A'),
         sqrt(avg(coalesce(r.rd, 350) ^ 2) filter (where i.squadra = 'A')),
         avg(coalesce(r.rating, 1500)) filter (where i.squadra = 'B'),
         sqrt(avg(coalesce(r.rd, 350) ^ 2) filter (where i.squadra = 'B'))
  into media_a_r, media_a_rd, media_b_r, media_b_rd
  from public.iscrizioni i
  left join public.rating_sport r on r.utente_id = i.utente_id and r.sport_id = p.sport_id
  where i.partita_id = p.id;

  -- Il ciclo legge i rating com'erano all'apertura: gli aggiornamenti fatti dentro non lo influenzano
  for g in
    select i.utente_id, i.squadra, coalesce(r.rating, 1500) as rating, coalesce(r.rd, 350) as rd, coalesce(r.volatilita, 0.06) as sigma
    from public.iscrizioni i
    left join public.rating_sport r on r.utente_id = i.utente_id and r.sport_id = p.sport_id
    where i.partita_id = p.id and i.squadra is not null
  loop
    if g.squadra = 'A' then avv_r := media_b_r; avv_rd := media_b_rd; else avv_r := media_a_r; avv_rd := media_a_rd; end if;
    esito := case
      when p_punti_a = p_punti_b then 0.5
      when (p_punti_a > p_punti_b) = (g.squadra = 'A') then 1
      else 0
    end;
    select * into nuovo from public.glicko2(g.rating, g.rd, g.sigma, array[avv_r], array[avv_rd], array[esito]);

    insert into public.rating_sport (utente_id, sport_id, rating, rd, volatilita, partite, vittorie, aggiornato_il)
    values (g.utente_id, p.sport_id, nuovo.nuovo_r, nuovo.nuovo_rd, nuovo.nuova_sigma, 1, case when esito = 1 then 1 else 0 end, now())
    on conflict (utente_id, sport_id) do update set
      rating = excluded.rating, rd = excluded.rd, volatilita = excluded.volatilita,
      partite = public.rating_sport.partite + 1,
      vittorie = public.rating_sport.vittorie + excluded.vittorie,
      aggiornato_il = now();

    update public.iscrizioni set rating_prima = g.rating, rating_dopo = nuovo.nuovo_r
    where partita_id = p.id and utente_id = g.utente_id;
  end loop;

  update public.partite set stato = 'giocata', punteggio_a = p_punti_a, punteggio_b = p_punti_b where id = p.id;
end; $$;

revoke execute on function public.ritirati_partita(uuid) from public, anon;
revoke execute on function public.annulla_partita(uuid) from public, anon;
revoke execute on function public.forma_squadre(uuid) from public, anon;
revoke execute on function public.registra_risultato(uuid, integer, integer) from public, anon;
grant execute on function public.ritirati_partita(uuid) to authenticated;
grant execute on function public.annulla_partita(uuid) to authenticated;
grant execute on function public.forma_squadre(uuid) to authenticated;
grant execute on function public.registra_risultato(uuid, integer, integer) to authenticated;
