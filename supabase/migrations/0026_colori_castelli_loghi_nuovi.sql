-- 0026: i colori dei castelli presi dalla seconda versione dei loghi dati da Alex il 14/10/2026 (public/castelli).
-- Domagnano passa dal rosso all'arancione; gli altri cambiano di poco. Cambia solo la colonna colore.
-- Da applicare a mano dall'SQL Editor (aggiorna dati esistenti).
update public.castelli as c
set colore = v.colore
from (values
  ('citta', '#014BFB'),
  ('borgo-maggiore', '#FBB908'),
  ('serravalle', '#FA0716'),
  ('domagnano', '#FC6705'),
  ('fiorentino', '#8A02FA'),
  ('acquaviva', '#04E4FC'),
  ('faetano', '#02B866'),
  ('chiesanuova', '#03C749'),
  ('montegiardino', '#06F9C8')
) as v (slug, colore)
where c.slug = v.slug;

-- Controllo: devono uscire 9 righe con i colori nuovi
select id, slug, nome, colore from public.castelli order by id;
