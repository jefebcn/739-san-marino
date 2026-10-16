-- 0042: un hotel non è un doppione del suo ristorante.
-- Un hotel e il suo ristorante hanno spesso lo stesso telefono e un nome che si somiglia (Hotel Titano e il ristorante
-- La Terrazza, Grand Hotel Primavera e il Ristorante Primavera, Hotel Joli e la profumeria Joli): con la 0039 l'hotel
-- risultava un doppione e restava fuori da Dormire. Ora tra una struttura per dormire e un'altra categoria lo stesso
-- telefono o un nome un po' simile non bastano: serve un nome quasi uguale («Hostaria Da Lino» = «Hostaria da Lino»).
-- Per tutto il resto non cambia niente.
-- Solo funzioni (due nuove e una sostituita) e, in fondo, il ricontrollo dei candidati non ancora decisi:
-- i doppioni sbagliati tornano «nuovi», quelli giusti restano doppioni. Nessun luogo cambia.
-- DA APPLICARE A MANO dall'SQL Editor (sostituisce confronta_candidati e ricontrolla i candidati non decisi):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0042_doppioni_tra_categorie.sql
-- Per tornare indietro: rilanciare confronta_candidati() della 0039.

-- Due nomi quasi uguali: uguali senza spazi e segni, oppure molto simili (trigrammi 0,6)
create or replace function public.nomi_uguali(a text, b text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  with n as (select public.testo_norm(a) as x, public.testo_norm(b) as y)
  select regexp_replace(x, '[^a-z0-9]', '', 'g') = regexp_replace(y, '[^a-z0-9]', '', 'g')
      or extensions.similarity(x, y) >= 0.6
  from n
$$;
grant execute on function public.nomi_uguali(text, text) to anon, authenticated;

-- Possono essere lo stesso posto? Sempre, tranne una struttura per dormire e un'altra categoria (il suo ristorante,
-- il suo negozio): lì serve un nome quasi uguale. Fuori da Dormire le categorie di Overture e OSM non sempre
-- coincidono («Coop. Il Macello» locale e cooperativa culturale), quindi restano confrontabili.
create or replace function public.stesso_posto_possibile(ca text, cb text, na text, nb text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select ca = cb or (ca <> 'dormire' and cb <> 'dormire') or public.nomi_uguali(na, nb)
$$;
grant execute on function public.stesso_posto_possibile(text, text, text, text) to anon, authenticated;

create or replace function public.confronta_candidati()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.luoghi_candidati set stato = 'nuovo', simile_a = null, distanza_m = null, motivo = null
  where stato = 'doppione' and deciso_da is null;

  -- Due ricerche separate, perché ognuna usi il suo indice: per vicinanza (GiST sulla posizione) e per telefono
  with vicini as (
    select c.id, l.id as luogo, c.nome, l.nome as nome_luogo, c.posizione, l.posizione as posizione_luogo,
      public.cifre_telefono(c.telefono) is not null and public.cifre_telefono(c.telefono) = public.cifre_telefono(l.telefono) as stesso_tel
    from public.luoghi_candidati c
    join public.luoghi l
      on extensions.st_dwithin(c.posizione, l.posizione, 400)
     and not (l.fonte = c.fonte and l.id_esterno = c.id_esterno)
     and (
       (extensions.st_dwithin(c.posizione, l.posizione, 120) and public.nomi_simili(c.nome, l.nome)
        and public.stesso_posto_possibile(c.categoria, l.categoria, c.nome, l.nome))
       or (public.cifre_telefono(c.telefono) is not null and public.cifre_telefono(c.telefono) = public.cifre_telefono(l.telefono)
           and public.stesso_posto_possibile(c.categoria, l.categoria, c.nome, l.nome))
     )
    where c.stato = 'nuovo'
  ), lontani as (
    select c.id, l.id as luogo, c.nome, l.nome as nome_luogo, c.posizione, l.posizione as posizione_luogo, true as stesso_tel
    from (select x.*, public.cifre_telefono(x.telefono) as tel from public.luoghi_candidati x where x.stato = 'nuovo') c
    join (select y.*, public.cifre_telefono(y.telefono) as tel from public.luoghi y) l
      on l.tel = c.tel and not (l.fonte = c.fonte and l.id_esterno = c.id_esterno)
    where public.nomi_simili(c.nome, l.nome) and public.stesso_posto_possibile(c.categoria, l.categoria, c.nome, l.nome)
  ), somiglianze as (
    select distinct on (t.id) t.id, t.luogo, round(extensions.st_distance(t.posizione, t.posizione_luogo))::integer as metri,
      case when t.stesso_tel then 'stesso telefono' else 'nome simile' end as perche
    from (select * from vicini union all select * from lontani) t
    order by t.id, extensions.similarity(public.testo_norm(t.nome), public.testo_norm(t.nome_luogo)) desc, extensions.st_distance(t.posizione, t.posizione_luogo)
  )
  update public.luoghi_candidati x set stato = 'doppione', simile_a = s.luogo, distanza_m = s.metri,
    motivo = case s.perche when 'stesso telefono' then 'Stesso telefono di un luogo che c''è già, a ' || s.metri || ' m'
                           else 'Nome simile a un luogo che c''è già, a ' || s.metri || ' m' end
  from somiglianze s where s.id = x.id;

  -- Lo stesso posto due volte nella fonte (stesso nome entro 60 m, o stesso telefono e nome simile ovunque):
  -- resta quello con la qualità più alta
  update public.luoghi_candidati c set stato = 'doppione', motivo = 'Ripetuto nella fonte'
  where c.stato = 'nuovo' and exists (
    select 1 from public.luoghi_candidati d
    where d.id <> c.id and d.fonte = c.fonte and d.stato in ('nuovo', 'pubblicato')
      and public.testo_norm(d.nome) = public.testo_norm(c.nome) and extensions.st_dwithin(d.posizione, c.posizione, 60)
      and (coalesce(d.qualita, 0), d.id_esterno) > (coalesce(c.qualita, 0), c.id_esterno)
  );
  with t as (select x.id, x.fonte, x.nome, x.stato, x.qualita, x.id_esterno, public.cifre_telefono(x.telefono) as tel
             from public.luoghi_candidati x where x.stato in ('nuovo', 'pubblicato') and x.telefono is not null)
  update public.luoghi_candidati c set stato = 'doppione', motivo = 'Ripetuto nella fonte'
  from t
  where c.id = t.id and t.stato = 'nuovo' and exists (
    select 1 from t d
    where d.id <> t.id and d.fonte = t.fonte and d.tel = t.tel and public.nomi_simili(d.nome, t.nome)
      and (coalesce(d.qualita, 0), d.id_esterno) > (coalesce(t.qualita, 0), t.id_esterno)
  );

  select count(*) into n from public.luoghi_candidati where stato = 'doppione';
  return n;
end $$;

-- Ricontrolla subito i candidati non ancora decisi
select public.confronta_candidati();
