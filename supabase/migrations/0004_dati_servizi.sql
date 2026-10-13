-- 739 San Marino · dati reali dei servizi (raccolti il 13/10/2026).
-- Fonti:
--   farmacie   https://www.iss.sm/on-line/home/articolo49000272.html (ISS, aggiornata 03/04/2025)
--   parcheggi  https://www.visitsanmarino.com/pub2/VisitSM/contenuto/Vivi/Parcheggi_a_San_Marino.html (Ufficio del Turismo)
--   funivia    https://www.aass.sm/site/home/trasporti/servizio-funivia.html (AASS, tariffe dal 01/03/2026)
--   bus        https://www.benedettinispa.com/it/rimini-san-marino (orari 15/09/2026 – 21/03/2027)
--   rifiuti    https://www.aass.sm/site/home/ambiente/raccolta-differenziata-porta-a-porta.html (ecocalendari 2026)
-- Coordinate da OpenStreetMap; quelle prese dal centro della strada sono segnate da_verificare.

-- ——— Farmacie (orari invernali; i festivi non sono gestiti: aprono Cailungo e Città) ———
insert into public.luoghi (nome, categoria, indirizzo, telefono, orari, orari_settimana, lat, lng, castello_id, descrizione, da_verificare) values
  ('Farmacia di Cailungo (Ospedale)', 'farmacia', 'Via Scialoja 20, Ospedale di Stato', '0549 994222',
   'Sempre aperta, 24 ore su 24. Dalle 23 alle 6 solo per casi urgenti, festivi compresi.',
   '{"1":[["00:00","24:00"]],"2":[["00:00","24:00"]],"3":[["00:00","24:00"]],"4":[["00:00","24:00"]],"5":[["00:00","24:00"]],"6":[["00:00","24:00"]],"7":[["00:00","24:00"]]}',
   43.9502, 12.4556, 2, 'Di notte e nei festivi il servizio è garantito qui.', false),
  ('Farmacia di Città', 'farmacia', 'Via Donna Felicissima 21', '0549 994872',
   'Lun–sab 9.00–14.45. Domenica e festivi 9.30–12.30 e 15.00–18.00 (in estate 15.30–18.30).',
   '{"1":[["09:00","14:45"]],"2":[["09:00","14:45"]],"3":[["09:00","14:45"]],"4":[["09:00","14:45"]],"5":[["09:00","14:45"]],"6":[["09:00","14:45"]],"7":[["09:30","12:30"],["15:00","18:00"]]}',
   43.9352, 12.4476, 1, null, false),
  ('Farmacia di Borgo Maggiore', 'farmacia', 'Via Oddone Scarito 4', '0549 986222',
   'Lun–sab 8.00–19.30.',
   '{"1":[["08:00","19:30"]],"2":[["08:00","19:30"]],"3":[["08:00","19:30"]],"4":[["08:00","19:30"]],"5":[["08:00","19:30"]],"6":[["08:00","19:30"]]}',
   43.9398, 12.4464, 2, null, false),
  ('Farmacia di Serravalle', 'farmacia', 'Centro Commerciale Atlante, 4° piano, Dogana', '0549 994188',
   'Lun–sab 8.00–19.30.',
   '{"1":[["08:00","19:30"]],"2":[["08:00","19:30"]],"3":[["08:00","19:30"]],"4":[["08:00","19:30"]],"5":[["08:00","19:30"]],"6":[["08:00","19:30"]]}',
   43.9773, 12.4865, 3, null, false),
  ('Farmacia di Fiorentino', 'farmacia', 'Via del Passetto 68', '0549 994893',
   'Mar–ven 8.00–19.30. Lunedì e sabato 8.00–13.45.',
   '{"1":[["08:00","13:45"]],"2":[["08:00","19:30"]],"3":[["08:00","19:30"]],"4":[["08:00","19:30"]],"5":[["08:00","19:30"]],"6":[["08:00","13:45"]]}',
   43.9085, 12.4616, 5, null, false),
  ('Farmacia di Faetano', 'farmacia', 'Piazza della Porta Vecchia 52', '0549 986224',
   'Lunedì, mercoledì e venerdì 8.00–13.45. Chiusa la 2ª e 3ª settimana di agosto.',
   '{"1":[["08:00","13:45"]],"3":[["08:00","13:45"]],"5":[["08:00","13:45"]]}',
   43.9256, 12.4989, 7, null, true),
  ('Farmacia di Gualdicciolo', 'farmacia', 'Via F. da Montebello 5, Gualdicciolo', '0549 986223',
   'Lun–sab 8.00–19.30. Chiusa la 2ª e 3ª settimana di agosto.',
   '{"1":[["08:00","19:30"]],"2":[["08:00","19:30"]],"3":[["08:00","19:30"]],"4":[["08:00","19:30"]],"5":[["08:00","19:30"]],"6":[["08:00","19:30"]]}',
   43.9523, 12.4045, 6, null, true);

-- ——— Parcheggi (a pagamento 8–24 da aprile a settembre, 8–20 da ottobre a marzo) ———
insert into public.luoghi (nome, categoria, indirizzo, descrizione, posti, tariffa, lat, lng, castello_id, da_verificare) values
  ('P1 · Lo Stradone', 'parcheggio', 'Piazzale Lo Stradone', 'Auto, parcometro.', 20, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9347, 12.4472, 1, true),
  ('P1 Bus · Piazzale Calcigni', 'parcheggio', 'Piazzale Calcigni', 'Solo bus, con addetto.', 10, '€25 tariffa unica · carico e scarico fino a 30 min €15', 43.9350, 12.4465, 1, true),
  ('P2A · Piazzale Giangi', 'parcheggio', 'Piazzale M. Giangi', 'Auto, sbarra.', 59, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9329, 12.4488, 1, false),
  ('P2 Bus · Via del Voltone', 'parcheggio', 'Via del Voltone', 'Solo bus, sbarra. Lavori in corso.', null, '€25 tariffa unica · carico e scarico fino a 30 min €15', 43.9308, 12.4491, 1, true),
  ('P3 · Viale Kennedy', 'parcheggio', 'Viale J.F. Kennedy', 'Auto, sbarra.', 141, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9283, 12.4519, 1, false),
  ('P4 · Viale Onofri', 'parcheggio', 'Viale A. Onofri', 'Auto, parcometro.', 47, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9328, 12.4494, 1, true),
  ('P6 · Cava Antica', 'parcheggio', 'Cava Antica', 'Auto, sbarra.', 58, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9346, 12.4493, 1, false),
  ('P7 · Cava degli Umbri', 'parcheggio', 'Cava degli Umbri', 'Auto, sbarra.', 148, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9327, 12.4502, 1, false),
  ('P8 · Via Piana', 'parcheggio', 'Via Piana', 'Auto, sbarra.', 72, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9375, 12.4446, 1, false),
  ('P9 · Multipiano', 'parcheggio', 'Via Piana / Via N. Bonaparte', 'Multipiano coperto, sbarra, aperto 24 ore. Ascensori per il centro storico.', 959, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9345, 12.4456, 1, false),
  ('P10 · Via Bonaparte', 'parcheggio', 'Via N. Bonaparte 43', 'Auto e camper, sbarra.', 68, 'Auto come gli altri · camper €5 per 2 ore, giornata €13 (ott–mar) o €15 (apr–set)', 43.9306, 12.4480, 1, true),
  ('P11 · Borgo Maggiore', 'parcheggio', 'Via Ventotto Luglio, Borgo Maggiore', 'Auto, parcometro. Vicino alla funivia.', 138, '€1,50 la 1ª ora · €3 la 2ª · €4,50 dalla 3ª alla 5ª · €8 la giornata', 43.9411, 12.4449, 2, true),
  ('P12 · Campo dei Giudei', 'parcheggio', 'Viale Campo dei Giudei', 'Aperto nei giorni di grande afflusso, con navetta per il centro.', null, '€5 a persona con navetta andata e ritorno, fino alle 21', 43.9300, 12.4440, 1, true),
  ('P13 · Area camper', 'parcheggio', 'Via Bigelli 15, Baldasserona, Borgo Maggiore', 'Area di sosta camper aperta 24 ore, con scarico e acqua.', null, 'Gratuita', 43.9410, 12.4380, 2, true);


-- ——— Funivia ———
insert into public.linee (id, tipo, nome, descrizione, colore, biglietto, fonte, da_verificare, ordine) values
  ('funivia', 'funivia', 'Funivia Borgo – Città',
   'Una corsa ogni 15 minuti circa, continua nei momenti di grande afflusso. Il viaggio dura meno di 2 minuti. Chiusa per collaudi dal 21 al 23 ottobre 2026.',
   '#2C79AE',
   '€4 corsa singola (ridotto €3) · €7 andata e ritorno (ridotto €5) · €10 giornaliero · gratis sotto i 120 cm',
   'https://www.aass.sm/site/home/trasporti/servizio-funivia.html', false, 1),
  ('bus-rimini', 'bus', 'Bus Rimini – San Marino',
   'Da Rimini Stazione FS a San Marino Ex Stazione (P2), circa 55 minuti. Fermate: Arco d''Augusto, Cerasolo, Dogana, Serravalle, Domagnano, Borgo Maggiore, Murata. Nei festivi vale l''orario della domenica.',
   '#E8573A',
   '€7 a corsa (tariffe 2025)',
   'https://www.benedettinispa.com/it/rimini-san-marino', false, 2);

-- Corse della funivia, in entrambe le direzioni, ogni 15 minuti dalle 7.45 all'ultima corsa del periodo.
insert into public.partenze (linea_id, direzione, ora, dal, al)
select 'funivia', d.dir, t::time, p.dal, p.al
from (values ('Borgo Maggiore → Città'), ('Città → Borgo Maggiore')) d(dir)
cross join (values
  ('2026-10-01'::date, '2026-10-20'::date, '19:00'::time),
  ('2026-10-24', '2026-12-31', '19:00'),
  ('2027-01-01', '2027-03-31', '19:00'),
  ('2027-04-01', '2027-06-30', '19:45'),
  ('2027-07-01', '2027-09-06', '23:45'),
  ('2027-09-07', '2027-09-30', '19:45'),
  ('2027-10-01', '2027-12-31', '19:00')
) p(dal, al, ultima)
cross join lateral generate_series('2000-01-01 07:45'::timestamp, '2000-01-01'::timestamp + p.ultima, interval '15 minutes') t;

-- In estate le corse continuano dopo mezzanotte fino alle 00.45 (contate sul giorno dopo).
insert into public.partenze (linea_id, direzione, ora, dal, al)
select 'funivia', d.dir, t::time, '2027-07-02', '2027-09-07'
from (values ('Borgo Maggiore → Città'), ('Città → Borgo Maggiore')) d(dir)
cross join generate_series('2000-01-01 00:00'::timestamp, '2000-01-01 00:45'::timestamp, interval '15 minutes') t;

-- Corse del bus Rimini – San Marino
insert into public.partenze (linea_id, direzione, ora, giorni, dal, al)
select 'bus-rimini', x.dir, o::time, x.giorni::smallint[], x.dal::date, x.al::date
from (values
  -- dal 15/9 al 7/11/2026, tutti i giorni
  ('Rimini → San Marino', '{08:00,09:25,10:40,11:45,14:25,15:40,17:00,19:00}', '{1,2,3,4,5,6,7}', '2026-09-15', '2026-11-07'),
  ('San Marino → Rimini', '{08:10,09:15,10:30,12:00,14:15,15:30,17:00,19:00}', '{1,2,3,4,5,6,7}', '2026-09-15', '2026-11-07'),
  -- dall'8/11/2026 al 21/3/2027, da lunedì a sabato
  ('Rimini → San Marino', '{08:00,09:25,10:40,11:45,14:25,15:40,17:00,19:00}', '{1,2,3,4,5,6}', '2026-11-08', '2027-03-21'),
  ('San Marino → Rimini', '{08:10,09:15,10:30,12:00,14:15,15:30,17:00,19:00}', '{1,2,3,4,5,6}', '2026-11-08', '2027-03-21'),
  -- dall'8/11/2026 al 21/3/2027, domenica e festivi
  ('Rimini → San Marino', '{08:00,09:25,11:45,14:25,17:00,18:30}', '{7}', '2026-11-08', '2027-03-21'),
  ('San Marino → Rimini', '{08:10,10:30,12:00,15:30,17:00,18:30}', '{7}', '2026-11-08', '2027-03-21')
) x(dir, ore, giorni, dal, al)
cross join lateral unnest(x.ore::text[]) o;

-- ——— Raccolta porta a porta (settimana tipo dagli ecocalendari 2026; nelle settimane con festivi i giorni cambiano) ———
-- Serravalle e Domagnano non hanno il porta a porta: si usano i cassonetti stradali.
with modelli(modello, frazione, giorni, note) as (values
  ('centro-citta', 'organico', '{1,3,6}', null),
  ('centro-citta', 'secco',    '{1,3,4,6}', null),
  ('centro-citta', 'carta',    '{1,3,4,6}', null),
  ('centro-citta', 'metalli',  '{1,4}', null),
  ('centro-citta', 'plastica', '{2,5}', null),
  ('centro-citta', 'vetro',    '{2,5}', null),
  ('centro-borgo', 'organico', '{1,5}', null),
  ('centro-borgo', 'secco',    '{2,6}', null),
  ('centro-borgo', 'carta',    '{3,6}', null),
  ('centro-borgo', 'metalli',  '{3}', null),
  ('centro-borgo', 'plastica', '{5}', null),
  ('centro-borgo', 'vetro',    '{5}', null),
  ('alta',  'organico', '{1,3,5}', null),
  ('alta',  'plastica', '{2}', 'Insieme ai metalli'),
  ('alta',  'metalli',  '{2}', 'Insieme alla plastica'),
  ('alta',  'carta',    '{3}', null),
  ('alta',  'secco',    '{4}', null),
  ('alta',  'vetro',    '{6}', null),
  ('bassa', 'organico', '{1,5}', null),
  ('bassa', 'secco',    '{1}', null),
  ('bassa', 'plastica', '{2}', 'A settimane alterne, insieme ai metalli'),
  ('bassa', 'metalli',  '{2}', 'A settimane alterne, insieme alla plastica'),
  ('bassa', 'carta',    '{5}', 'A settimane alterne'),
  ('bassa', 'vetro',    '{6}', 'Circa una volta al mese')
),
zone(castello_id, zona, modello, orario) as (values
  (1, 'Centro storico', 'centro-citta', 'Esporre i contenitori entro le 8.'),
  (2, 'Centro storico', 'centro-borgo', 'Esporre i contenitori entro le 8.'),
  (1, 'Alta densità', 'alta', 'Esporre entro le 7 (ottobre–maggio) o le 6 (giugno–settembre).'),
  (1, 'Bassa densità', 'bassa', 'Esporre entro le 7 (ottobre–maggio) o le 6 (giugno–settembre).')
)
insert into public.raccolta_rifiuti (castello_id, zona, frazione, giorni, orario, note, da_verificare)
select z.castello_id, z.zona, m.frazione, m.giorni::smallint[], z.orario, m.note, true
from (
  select * from zone
  union all
  select c, zz.zona, zz.modello, zz.orario
  from unnest(array[5, 6, 7, 8, 9]) c
  cross join (values
    ('Alta densità', 'alta', 'Esporre entro le 7 (ottobre–maggio) o le 6 (giugno–settembre).'),
    ('Bassa densità', 'bassa', 'Esporre entro le 7 (ottobre–maggio) o le 6 (giugno–settembre).')
  ) zz(zona, modello, orario)
) z
join modelli m on m.modello = z.modello;
