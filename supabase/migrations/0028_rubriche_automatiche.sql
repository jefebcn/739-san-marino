-- 0028: le due rubriche che si scrivono da sole (passo 1.5). Crea solo funzioni nuove.
--
-- «Le partite della settimana» (domenica sera): le partite giocate da lunedì a domenica, i tornei finiti
-- e i metri guadagnati da ogni castello nella settimana. «La vetta del mese» (fine mese): i metri guadagnati
-- da ogni castello nel mese e quante persone li hanno portati. Solo totali e partite: nessun nome di persona.

-- La settimana (lunedì-domenica, ora di San Marino) che contiene p_giorno
create or replace function public.partite_settimana(p_giorno date default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with limiti as (
    select (date_trunc('week', coalesce(p_giorno, (now() at time zone 'Europe/San_Marino')::date)::timestamp) at time zone 'Europe/San_Marino') as dal
  ), periodo as (
    select dal, dal + interval '7 days' as al from limiti
  )
  select jsonb_build_object(
    'dal', (select dal from periodo),
    'al', (select al from periodo),
    'partite', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'sport_id', p.sport_id, 'titolo', p.titolo, 'inizio', p.inizio, 'luogo_nome', p.luogo_nome,
        'punteggio_a', p.punteggio_a, 'punteggio_b', p.punteggio_b,
        'torneo', (select t.titolo from public.torneo_incontri i join public.tornei t on t.id = i.torneo_id where i.partita_id = p.id)
      ) order by p.inizio)
      from public.partite p, periodo
      where p.stato = 'giocata' and p.inizio >= periodo.dal and p.inizio < periodo.al
    ), '[]'::jsonb),
    'tornei', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'titolo', t.titolo, 'sport_id', t.sport_id,
        'castello', (select s.castello_id from public.torneo_squadre s where s.id = t.vincitrice)))
      from public.tornei t, periodo
      where t.stato = 'concluso' and t.al >= (periodo.dal at time zone 'Europe/San_Marino')::date
        and t.al < (periodo.al at time zone 'Europe/San_Marino')::date
    ), '[]'::jsonb),
    'castelli', coalesce((
      select jsonb_agg(jsonb_build_object('castello_id', x.castello_id, 'metri', x.metri) order by x.metri desc)
      from (
        select pr.castello_id, sum(m.metri)::integer as metri
        from public.metri_movimenti m join public.profili pr on pr.id = m.utente_id, periodo
        where pr.castello_id is not null and m.creato_il >= periodo.dal and m.creato_il < periodo.al
        group by pr.castello_id
        having sum(m.metri) > 0
      ) x
    ), '[]'::jsonb)
  );
$$;

-- Il mese (ora di San Marino) che contiene p_giorno: metri e persone per castello, dal più alto
create or replace function public.vetta_mese(p_giorno date default null)
returns table (castello_id smallint, metri integer, persone integer, posizione integer)
language sql stable security definer set search_path = '' as $$
  with periodo as (
    select (date_trunc('month', coalesce(p_giorno, (now() at time zone 'Europe/San_Marino')::date)::timestamp) at time zone 'Europe/San_Marino') as dal
  )
  select c.id, coalesce(sum(m.metri), 0)::integer, count(distinct m.utente_id)::integer,
         (rank() over (order by coalesce(sum(m.metri), 0) desc))::integer
  from public.castelli c
  cross join periodo
  left join public.profili pr on pr.castello_id = c.id
  left join public.metri_movimenti m on m.utente_id = pr.id and m.creato_il >= periodo.dal and m.creato_il < periodo.dal + interval '1 month'
  group by c.id
  order by 2 desc, c.id;
$$;

revoke execute on function public.partite_settimana(date) from public;
revoke execute on function public.vetta_mese(date) from public;
grant execute on function public.partite_settimana(date) to anon, authenticated;
grant execute on function public.vetta_mese(date) to anon, authenticated;
