-- 0020: un ufficio di esempio per la sezione Vivere, Uffici pubblici (passo 0.9).
-- Da applicare a mano DOPO la 0013 (campi della scheda) e la 0019 (categoria «ufficio»).
-- Non è un dato vero: nome, pratica e documenti dicono «Esempio» ed è segnato «Da verificare».
-- Si cancella quando arrivano gli uffici veri:
--   delete from public.luoghi where nome = 'Esempio: ufficio pubblico';

insert into public.luoghi (nome, categoria, descrizione, lat, lng, castello_id, da_verificare, area, sottocategoria, cosa_fare, fonte_nome)
select
  'Esempio: ufficio pubblico',
  'ufficio',
  'Scheda di esempio: mostra come appariranno gli uffici pubblici. Va sostituita con un ufficio vero, controllato alla fonte.',
  43.9363, 12.4469, 1, true, 'vivere', 'Esempio',
  '[{"titolo": "Esempio: rinnovare un documento", "testo": "Pratica di esempio: qui ci saranno i passi da seguire, spiegati in poche righe.", "documenti": ["Esempio: il documento da rinnovare", "Esempio: una foto tessera"]}]'::jsonb,
  '739, dato di esempio'
where not exists (select 1 from public.luoghi where nome = 'Esempio: ufficio pubblico');
