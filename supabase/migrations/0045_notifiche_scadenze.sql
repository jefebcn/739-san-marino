-- 0045: notifiche delle scadenze per le attività (richiesta di Alex del 16/10/2026).
-- Un terzo interruttore, «Scadenze per le attività»: chi lo accende riceve una notifica 7 giorni prima
-- e il giorno prima di ogni scadenza, bando o nuova regola pubblicata in `scadenze` (migrazione 0044).
-- Resta la regola di sempre: al massimo una notifica al giorno. Quel giorno la scadenza prende il posto
-- del Bollettino o del weekend.
-- DA APPLICARE A MANO dall'SQL Editor (aggiunge una colonna a notifiche_iscrizioni, che ha già dati,
-- e sostituisce mie_notifiche() e notifiche_da_inviare()):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0045_notifiche_scadenze.sql

alter table public.notifiche_iscrizioni add column if not exists scadenze boolean not null default false;

-- Accende o spegne le scadenze su un telefono già iscritto (prima si iscrive con iscrivi_notifiche)
create or replace function public.scegli_scadenze_notifiche(p_endpoint text, p_scadenze boolean)
returns void language sql security definer set search_path = '' as $$
  update public.notifiche_iscrizioni set scadenze = coalesce(p_scadenze, false), aggiornato_il = now() where endpoint = p_endpoint;
$$;

-- Le scelte di questo telefono, con le scadenze
create or replace function public.mie_notifiche(p_endpoint text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('bollettino', bollettino, 'weekend', weekend, 'scadenze', scadenze) from public.notifiche_iscrizioni where endpoint = p_endpoint;
$$;

-- Chi avvisare oggi e con cosa. Prima le scadenze (se ce n'è una tra 7 giorni o domani), poi il weekend
-- il venerdì, poi il Bollettino. Una sola notifica per telefono.
create or replace function public.notifiche_da_inviare(p_segreto text)
returns table (id uuid, endpoint text, p256dh text, auth text, tipo text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_oggi date := (now() at time zone 'Europe/San_Marino')::date;
  v_venerdi boolean := extract(isodow from (now() at time zone 'Europe/San_Marino')) = 5;
  v_scadenze boolean;
begin
  if not public.segreto_notifiche_giusto(p_segreto) then raise exception 'Non autorizzato.'; end if;
  select exists (select 1 from public.scadenze s where s.stato = 'pubblicata' and s.giorno in (v_oggi + 1, v_oggi + 7)) into v_scadenze;
  return query
    select n.id, n.endpoint, n.p256dh, n.auth,
           case when v_scadenze and n.scadenze then 'scadenze'
                when v_venerdi and n.weekend then 'weekend'
                else 'bollettino' end
    from public.notifiche_iscrizioni n
    where n.ultimo_invio is distinct from v_oggi
      and ((v_scadenze and n.scadenze) or (v_venerdi and n.weekend) or n.bollettino);
end $$;

revoke execute on function public.scegli_scadenze_notifiche(text, boolean) from public;
grant execute on function public.scegli_scadenze_notifiche(text, boolean) to anon, authenticated;
