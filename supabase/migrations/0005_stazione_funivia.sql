-- 739 San Marino · posizione corretta della stazione della funivia a Borgo Maggiore.
-- DA APPLICARE: modifica una riga esistente, quindi va confermata a mano dal pannello Supabase (SQL Editor).
update public.luoghi
set indirizzo = 'Piazzale Campo della Fiera 10, Borgo Maggiore', lat = 43.9403, lng = 12.4462,
    orari = 'Tutti i giorni dalle 7.45; ultima corsa 19.00 (ott–mar), 19.45 (apr–giu e set), 00.45 (luglio–6 settembre).'
where nome = 'Funivia · stazione di Borgo Maggiore';
