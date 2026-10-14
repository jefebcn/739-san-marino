-- 0024: i colori dei castelli presi dai loghi dati da Alex il 14/10/2026 (public/castelli).
-- Cambia solo la colonna colore dei 9 castelli; il colore si usa nelle barre della classifica,
-- nel puntino della testata e nei badge. Da applicare a mano dall'SQL Editor (aggiorna dati esistenti).
update public.castelli as c
set colore = v.colore
from (values
  ('citta', '#0255FA'),
  ('borgo-maggiore', '#FDC844'),
  ('serravalle', '#FC0A12'),
  ('domagnano', '#CA071D'),
  ('fiorentino', '#B637FB'),
  ('acquaviva', '#1BF7FD'),
  ('faetano', '#229557'),
  ('chiesanuova', '#02F378'),
  ('montegiardino', '#27F9B9')
) as v (slug, colore)
where c.slug = v.slug;

-- Controllo: devono uscire 9 righe con i colori nuovi
select id, slug, nome, colore from public.castelli order by id;
