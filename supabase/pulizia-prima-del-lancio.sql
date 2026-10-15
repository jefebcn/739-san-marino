-- Pulizia prima del lancio pubblico: toglie i dati di prova. Da lanciare UNA volta dall'SQL Editor, il giorno del lancio.
-- Non è una migrazione: cancella solo righe di esempio, lo schema non cambia.
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/pulizia-prima-del-lancio.sql

-- I 2 eventi di esempio («Esempio · Musica dal vivo», «Esempio · Visita guidata alle torri»)
delete from public.eventi where titolo like 'Esempio · %';

-- L'ufficio di esempio (migrazione 0020)
delete from public.luoghi where nome = 'Esempio: ufficio pubblico' and fonte = 'manuale';

-- Lo speciale di prova (migrazione 0027)
delete from public.contenuti where slug = 'esempio-speciale';

-- Controllo: tutte e tre le righe devono dire 0
select 'eventi di esempio' as cosa, count(*) from public.eventi where titolo like 'Esempio · %'
union all select 'ufficio di esempio', count(*) from public.luoghi where nome = 'Esempio: ufficio pubblico'
union all select 'speciale di prova', count(*) from public.contenuti where slug = 'esempio-speciale';

-- NON si cancellano Piazza della Libertà, Prima Torre (Guaita) e la stazione della funivia: sono luoghi veri con
-- «Posizione da verificare». Si controllano sul posto o sulla mappa e poi si toglie l'etichetta, per esempio:
--   update public.luoghi set da_verificare = false, verificato_il = current_date where nome = 'Prima Torre · Guaita';
