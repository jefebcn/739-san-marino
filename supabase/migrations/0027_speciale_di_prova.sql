-- 0027: uno speciale di prova (passo 1.4), per vedere la pagina /speciali/esempio-speciale e la scheda in Oggi.
-- Collega i due eventi di esempio già nel database (14 e 16 ottobre 2026), la piazza e la Guaita, e come
-- «parcheggi e navette» la funivia di Borgo Maggiore, il P9 e il P11. Nessun dato inventato: il testo dice che è una prova.
-- Da applicare a mano dall'SQL Editor (aggiunge una riga alla tabella dei contenuti).
--
-- Per toglierlo quando arriva il primo speciale vero:
--   delete from public.contenuti where slug = 'esempio-speciale';

insert into public.contenuti (tipo, titolo, slug, sommario, corpo, luoghi, eventi, pubblicato_il, stato, autore)
select 'speciale',
       'Esempio: speciale di prova',
       'esempio-speciale',
       'Come si presenta uno speciale di 739: programma giorno per giorno, mappa, parcheggi e avvisi.',
       E'Questa è una **pagina di prova**: serve a vedere com''è fatto uno speciale prima del Natale delle Meraviglie.\n\nUno speciale raccoglie un''occasione dell''anno in un posto solo. Qui va l''introduzione scritta dalla redazione; sotto, da soli, arrivano il programma diviso per giorno, la mappa dei luoghi, i parcheggi e le navette e gli avvisi dei giorni dello speciale.\n\nLa stessa struttura vale per le Giornate Medievali e per la festa del 3 settembre.',
       array[
         'd77ed1a1-8997-44df-8a22-a6351ede3f65',  -- Piazza della Libertà (Pianello)
         '93662430-4dbc-4d45-8eec-313a8934b46a',  -- Prima Torre, Guaita
         '15847833-27ef-4129-9eb4-bd21c254ef25',  -- Funivia, stazione di Borgo Maggiore
         '91225cb2-3964-45bf-b7bf-02667c1a58ae',  -- P9 Multipiano
         '9ea3dc9b-5f28-40c8-893d-6977dd8e0172'   -- P11 Borgo Maggiore
       ]::uuid[],
       array[
         'ee25da26-1d35-4e22-95c4-043f9592dbc2',  -- Esempio, Musica dal vivo
         '3f8d74b2-2fe4-470e-838d-208fcf123870'   -- Esempio, Visita guidata alle torri
       ]::uuid[],
       now(),
       'pubblicato',
       null
where not exists (select 1 from public.contenuti where slug = 'esempio-speciale');

-- Controllo: deve uscire una riga
select titolo, slug, stato, cardinality(eventi) as eventi, cardinality(luoghi) as luoghi from public.contenuti where slug = 'esempio-speciale';
