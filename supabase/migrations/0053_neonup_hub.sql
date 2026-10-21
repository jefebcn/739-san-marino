-- NeonUp, fase 2: invio diretto all'HUB-SM (21/10/2026, richiesta di Alex: «procedi con la fase 2»). Solo oggetti nuovi.
--
-- Il web service è quello del manuale «WEB Service Fatturazione elettronica OE» 2.0 (1/6/2026): SOAP 1.1, document/literal,
-- namespace http://api.tribfews.ciscoop.sm/, elementi figli senza namespace, soapAction vuota.
--   produzione  https://www.pa.sm/tribfews/tribfews
--   test        https://www.pa.sm/tribfewstest/tribfews  (token generati su TribWeb di TEST, non validi in produzione)
-- Il TokenFE dell'azienda sta cifrato nel Vault di Supabase (un segreto per azienda): non torna mai al browser e
-- nessuna chiave nuova serve su Vercel. Le chiamate le fa il database, da una coda lavorata da pg_cron ogni minuto
-- (`neon_hub_lavora`), così non dipendono dal tempo massimo di una richiesta dell'app.
-- Metodi usati: listFERSMTempFiles (verifica del token, sola lettura), putFERSMFile (invio), getFERSMRicevuta (esito:
-- RicevutaConsegna o RicevutaScarto), listFERSMFilesIn e getFERSMFileIn (fatture ricevute), richiediRettificaFERSMFileIn.

-- Il collegamento di un'azienda
create table if not exists public.neon_hub (
  azienda_id uuid primary key references public.neon_aziende (id) on delete cascade,
  token_id uuid,                                                        -- il segreto nel Vault
  ambiente text not null default 'test' check (ambiente in ('test', 'produzione')),
  stato text not null default 'da_verificare' check (stato in ('da_verificare', 'ok', 'errore', 'scollegato')),
  messaggio text,
  scade timestamptz,                                                    -- dtTokenExpire dall'HUB-SM
  verificato_il timestamptz,
  ultime_ricevute_il timestamptz,
  impostato_da uuid references auth.users (id) on delete set null,
  aggiornato_il timestamptz not null default now()
);

-- Le richieste all'HUB-SM, una per riga
create table if not exists public.neon_hub_coda (
  id bigint generated always as identity primary key,
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  azione text not null check (azione in ('verifica', 'invia', 'esito', 'ricevute', 'rettifica')),
  documento_id uuid references public.neon_documenti (id) on delete cascade,
  passiva_id uuid,
  dati jsonb not null default '{}'::jsonb,
  stato text not null default 'attesa' check (stato in ('attesa', 'fatto', 'errore')),
  tentativi integer not null default 0,
  prossimo timestamptz not null default now(),
  codice integer,
  messaggio text,
  creato_da uuid references auth.users (id) on delete set null,
  creato_il timestamptz not null default now(),
  fatto_il timestamptz
);
create index if not exists neon_hub_coda_da_fare on public.neon_hub_coda (prossimo) where stato = 'attesa';
create index if not exists neon_hub_coda_per_documento on public.neon_hub_coda (documento_id);

-- I file mandati (copia esatta di quello che è partito, con l'impronta data dall'HUB-SM)
create table if not exists public.neon_hub_file (
  id bigint generated always as identity primary key,
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  documento_id uuid not null references public.neon_documenti (id) on delete cascade,
  nome text not null,
  ambiente text not null,
  xml text not null,
  hash text,
  inviato_il timestamptz,
  creato_il timestamptz not null default now()
);
create index if not exists neon_hub_file_per_documento on public.neon_hub_file (documento_id);

-- Le ricevute dell'HUB-SM per i file mandati (hanno valore probatorio: si tengono)
create table if not exists public.neon_hub_ricevute (
  id bigint generated always as identity primary key,
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  documento_id uuid not null references public.neon_documenti (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('consegna', 'scarto', 'altro')),
  xml text not null,
  ricevuta_il timestamptz not null default now()
);
create index if not exists neon_hub_ricevute_per_documento on public.neon_hub_ricevute (documento_id);

-- Le fatture ricevute dai fornitori sammarinesi
create table if not exists public.neon_passive (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.neon_aziende (id) on delete cascade,
  ambiente text not null,
  nome text not null,
  contenuto bytea not null,
  xml text,                                                             -- se il file è leggibile (anche estratto da un .p7m)
  td text,
  cedente text,
  cedente_cod_oe text,
  numero text,
  data date,
  totale numeric(14, 2),
  confermata_il timestamptz,                                            -- conferma di consegna dell'HUB-SM
  stato text not null default 'nuova' check (stato in ('nuova', 'vista', 'registrata', 'rettifica')),
  nota text check (char_length(nota) <= 500),
  scaricata_il timestamptz not null default now(),
  unique (azienda_id, ambiente, nome)
);

alter table public.neon_hub enable row level security;
alter table public.neon_hub_coda enable row level security;
alter table public.neon_hub_file enable row level security;
alter table public.neon_hub_ricevute enable row level security;
alter table public.neon_passive enable row level security;

-- Si leggono dentro la propria azienda; il collegamento (con l'id del segreto) solo dalle funzioni
create policy neon_hub_coda_leggo on public.neon_hub_coda for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_hub_file_leggo on public.neon_hub_file for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_hub_ricevute_leggo on public.neon_hub_ricevute for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
create policy neon_passive_leggo on public.neon_passive for select to authenticated using (public.neon_puo(azienda_id, 'leggere'));
revoke all on public.neon_hub, public.neon_hub_coda, public.neon_hub_file, public.neon_hub_ricevute, public.neon_passive from anon, authenticated;
grant select (id, azienda_id, azione, documento_id, passiva_id, stato, tentativi, prossimo, codice, messaggio, creato_il, fatto_il) on public.neon_hub_coda to authenticated;
grant select on public.neon_hub_file, public.neon_hub_ricevute to authenticated;
grant select (id, azienda_id, ambiente, nome, xml, td, cedente, cedente_cod_oe, numero, data, totale, confermata_il, stato, nota, scaricata_il) on public.neon_passive to authenticated;

-- Testo sicuro dentro un elemento XML
create or replace function public.neon_xml_testo(t text)
returns text language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&apos;')
$$;

-- Una chiamata al web service: busta SOAP, risposta in jsonb {returnCode, message, listfiles[], bytestream, dtTokenExpire, tipoFile}
create or replace function public.neon_ws(p_ambiente text, p_metodo text, p_corpo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_url text := case p_ambiente when 'produzione' then 'https://www.pa.sm/tribfews/tribfews' else 'https://www.pa.sm/tribfewstest/tribfews' end;
  r extensions.http_response;
  x xml;
  ret xml;
begin
  if p_metodo !~ '^[A-Za-z]+$' then raise exception 'Metodo non valido'; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '60');
  begin
    select * into r from extensions.http((
      'POST', v_url,
      array[extensions.http_header('SOAPAction', '""'), extensions.http_header('User-Agent', 'NeonUp-739/1.0 (https://739-san-marino.vercel.app/neonup)')],
      'text/xml; charset=utf-8',
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:api="http://api.tribfews.ciscoop.sm/"><soapenv:Body><api:'
        || p_metodo || '>' || p_corpo || '</api:' || p_metodo || '></soapenv:Body></soapenv:Envelope>'
    )::extensions.http_request);
  exception when others then
    return jsonb_build_object('returnCode', -9999, 'message', 'HUB-SM non raggiungibile: ' || left(sqlerrm, 200));
  end;
  begin
    x := xmlparse(document r.content);
  exception when others then
    return jsonb_build_object('returnCode', -9998, 'message', 'Risposta non leggibile (HTTP ' || r.status || ')');
  end;
  ret := (xpath('//*[local-name()="return"]', x))[1];
  if ret is null then
    return jsonb_build_object('returnCode', -9997, 'message',
      coalesce((xpath('//*[local-name()="faultstring"]/text()', x))[1]::text, 'Risposta inattesa (HTTP ' || r.status || ')'));
  end if;
  return jsonb_build_object(
    'returnCode', coalesce(((xpath('/*/*[local-name()="returnCode"]/text()', ret))[1]::text)::integer, -9996),
    'message', (xpath('/*/*[local-name()="message"]/text()', ret))[1]::text,
    'listfiles', coalesce((select jsonb_agg(v::text) from unnest(xpath('/*/*[local-name()="listfiles"]/text()', ret)) v), '[]'::jsonb),
    'bytestream', (xpath('/*/*[local-name()="bytestream"]/text()', ret))[1]::text,
    'dtTokenExpire', (xpath('/*/*[local-name()="dtTokenExpire"]/text()', ret))[1]::text,
    'tipoFile', (xpath('/*/*[local-name()="tipoFile"]/text()', ret))[1]::text);
end $$;

-- Il token in chiaro, solo dentro il database
create or replace function public.neon_hub_token(p_azienda uuid)
returns text language sql stable security definer set search_path = '' as $$
  select s.decrypted_secret from public.neon_hub h join vault.decrypted_secrets s on s.id = h.token_id where h.azienda_id = p_azienda
$$;

-- Lo stato del collegamento (mai il token)
create or replace function public.neon_hub_stato(p_azienda uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not public.neon_puo(p_azienda, 'leggere') then null else
    coalesce((select jsonb_build_object('ambiente', h.ambiente, 'stato', h.stato, 'messaggio', h.messaggio, 'scade', h.scade,
      'verificato_il', h.verificato_il, 'ultime_ricevute_il', h.ultime_ricevute_il,
      'in_coda', (select count(*) from public.neon_hub_coda c where c.azienda_id = p_azienda and c.stato = 'attesa'))
      from public.neon_hub h where h.azienda_id = p_azienda), jsonb_build_object('stato', 'scollegato')) end
$$;

-- Il titolare collega l'azienda con il suo TokenFE (o lo cambia): si verifica alla prossima passata della coda
create or replace function public.neon_hub_collega(p_azienda uuid, p_token text, p_ambiente text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.neon_hub; v_token text := trim(coalesce(p_token, '')); v_id uuid;
begin
  if not public.neon_puo(p_azienda, 'titolare') then raise exception 'Solo il titolare collega l''azienda all''HUB-SM.'; end if;
  if p_ambiente not in ('test', 'produzione') then raise exception 'Ambiente non valido.'; end if;
  if char_length(v_token) not between 10 and 4000 or v_token ~ '\s' then raise exception 'Il token non sembra giusto: copialo intero da TribWEB.'; end if;
  if (select cod_oe from public.neon_aziende where id = p_azienda) is null then raise exception 'Prima scrivi il codice operatore economico nei dati dell''azienda.'; end if;
  select * into h from public.neon_hub where azienda_id = p_azienda for update;
  if h.token_id is null then
    v_id := vault.create_secret(v_token, 'neonup_token_' || p_azienda::text, 'TokenFE HUB-SM di un''azienda NeonUp (0053)');
  else
    v_id := h.token_id;
    perform vault.update_secret(v_id, v_token);
  end if;
  insert into public.neon_hub (azienda_id, token_id, ambiente, stato, messaggio, scade, verificato_il, impostato_da, aggiornato_il)
  values (p_azienda, v_id, p_ambiente, 'da_verificare', null, null, null, auth.uid(), now())
  on conflict (azienda_id) do update set token_id = excluded.token_id, ambiente = excluded.ambiente, stato = 'da_verificare',
    messaggio = null, scade = null, verificato_il = null, impostato_da = auth.uid(), aggiornato_il = now();
  update public.neon_hub_coda set stato = 'errore', messaggio = 'Superata da un nuovo collegamento', fatto_il = now()
  where azienda_id = p_azienda and stato = 'attesa' and azione = 'verifica';
  insert into public.neon_hub_coda (azienda_id, azione, creato_da) values (p_azienda, 'verifica', auth.uid());
end $$;

-- Il titolare scollega: il token nel Vault viene sovrascritto
create or replace function public.neon_hub_scollega(p_azienda uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.neon_hub;
begin
  if not public.neon_puo(p_azienda, 'titolare') then raise exception 'Solo il titolare scollega l''azienda.'; end if;
  select * into h from public.neon_hub where azienda_id = p_azienda for update;
  if h.azienda_id is null then return; end if;
  if h.token_id is not null then perform vault.update_secret(h.token_id, 'scollegato'); end if;
  update public.neon_hub set stato = 'scollegato', messaggio = null, scade = null, aggiornato_il = now() where azienda_id = p_azienda;
  update public.neon_hub_coda set stato = 'errore', messaggio = 'Azienda scollegata', fatto_il = now() where azienda_id = p_azienda and stato = 'attesa';
end $$;

-- Mando una fattura: il file (preparato dall'app con fe-rsm.ts) va in coda, con controlli che corrisponda al documento
create or replace function public.neon_hub_invia(p_documento uuid, p_xml text)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti; h public.neon_hub; x xml; v_prog text;
begin
  select * into d from public.neon_documenti where id = p_documento for update;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.stato <> 'emesso' or not d.elettronica or d.fe_file is null then raise exception 'Prima prepara il file della fattura elettronica.'; end if;
  if d.fe_stato not in ('', 'da_inviare') then raise exception 'Questo file è già stato mandato: se è stato scartato prepara un file nuovo.'; end if;
  select * into h from public.neon_hub where azienda_id = d.azienda_id;
  if h.stato is distinct from 'ok' then raise exception 'L''azienda non è collegata all''HUB-SM (o il token non è stato ancora verificato).'; end if;
  if exists (select 1 from public.neon_hub_coda where documento_id = p_documento and azione = 'invia' and stato = 'attesa') then
    raise exception 'La fattura è già in invio.';
  end if;
  if octet_length(p_xml) > 5 * 1024 * 1024 then raise exception 'Il file supera 5 MB.'; end if;
  begin
    x := xmlparse(document p_xml);
  exception when others then raise exception 'Il file non è un XML valido.';
  end;
  v_prog := split_part(d.fe_file, '_', 2);
  if (xpath('//*[local-name()="DatiGeneraliDocumento"]/*[local-name()="Numero"]/text()', x))[1]::text is distinct from d.numero
     or (xpath('//*[local-name()="DatiGeneraliDocumento"]/*[local-name()="Data"]/text()', x))[1]::text is distinct from d.data::text
     or (xpath('//*[local-name()="CedentePrestatore"]//*[local-name()="IdCodice"]/text()', x))[1]::text is distinct from (d.cedente->>'cod_oe')
     or (xpath('//*[local-name()="ProgressivoInvio"]/text()', x))[1]::text is distinct from v_prog then
    raise exception 'Il file non corrisponde al documento: aggiorna la pagina e riprova.';
  end if;
  insert into public.neon_hub_file (azienda_id, documento_id, nome, ambiente, xml) values (d.azienda_id, p_documento, d.fe_file || '.xml', h.ambiente, p_xml);
  insert into public.neon_hub_coda (azienda_id, azione, documento_id, dati, creato_da)
  values (d.azienda_id, 'invia', p_documento, jsonb_build_object('file', d.fe_file || '.xml'), auth.uid());
end $$;

-- Dopo uno scarto la fattura «si considera non emessa» e va rifatta: si possono riprendere i dati di azienda e cliente
-- corretti nelle anagrafiche (codice operatore, indirizzo), mantenendo numero, data e righe
create or replace function public.neon_aggiorna_scartata(p_documento uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti; a public.neon_aziende; s public.neon_soggetti;
begin
  select * into d from public.neon_documenti where id = p_documento for update;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.fe_stato <> 'scartata' then raise exception 'Si può fare solo con una fattura scartata.'; end if;
  select * into a from public.neon_aziende where id = d.azienda_id;
  select * into s from public.neon_soggetti where id = d.soggetto_id;
  if a.cod_oe is null or s.cod_oe is null or s.nazione <> 'SM' then raise exception 'Azienda e cliente devono avere il codice operatore economico.'; end if;
  update public.neon_documenti set
    cedente = jsonb_build_object('denominazione', a.denominazione, 'cod_oe', a.cod_oe, 'indirizzo', a.indirizzo,
      'numero_civico', a.numero_civico, 'cap', a.cap, 'comune', a.comune, 'telefono', a.telefono, 'email', a.email, 'iban', a.iban),
    cessionario = jsonb_build_object('denominazione', s.denominazione, 'nazione', s.nazione, 'cod_oe', s.cod_oe,
      'partita_iva', s.partita_iva, 'codice_fiscale', s.codice_fiscale, 'indirizzo', s.indirizzo, 'numero_civico', s.numero_civico,
      'cap', s.cap, 'comune', s.comune, 'provincia', s.provincia, 'email', s.email),
    fe_nota = 'Dati di azienda e cliente aggiornati il ' || to_char(now() at time zone 'Europe/San_Marino', 'DD/MM/YYYY HH24:MI'),
    aggiornato_il = now()
  where id = p_documento;
end $$;

-- Controlla subito l'esito di una fattura mandata
create or replace function public.neon_hub_controlla(p_documento uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.neon_documenti;
begin
  select * into d from public.neon_documenti where id = p_documento;
  if d.id is null or not public.neon_puo(d.azienda_id, 'vendere') then raise exception 'Documento non trovato.'; end if;
  if d.fe_stato <> 'inviata' then raise exception 'La fattura non è in attesa di esito.'; end if;
  update public.neon_hub_coda set prossimo = now() where documento_id = p_documento and azione = 'esito' and stato = 'attesa';
  if not found then
    insert into public.neon_hub_coda (azienda_id, azione, documento_id, dati, creato_da)
    values (d.azienda_id, 'esito', p_documento, jsonb_build_object('file', d.fe_file || '.xml'), auth.uid());
  end if;
end $$;

-- Scarica subito le fatture ricevute
create or replace function public.neon_hub_cerca_ricevute(p_azienda uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.neon_puo(p_azienda, 'vendere') then raise exception 'Non puoi farlo per questa azienda.'; end if;
  if (select stato from public.neon_hub where azienda_id = p_azienda) is distinct from 'ok' then raise exception 'L''azienda non è collegata all''HUB-SM.'; end if;
  if not exists (select 1 from public.neon_hub_coda where azienda_id = p_azienda and azione = 'ricevute' and stato = 'attesa') then
    insert into public.neon_hub_coda (azienda_id, azione, creato_da) values (p_azienda, 'ricevute', auth.uid());
  else
    update public.neon_hub_coda set prossimo = now() where azienda_id = p_azienda and azione = 'ricevute' and stato = 'attesa';
  end if;
end $$;

-- Una fattura ricevuta: vista, registrata, oppure richiesta di rettifica al fornitore (mail di cortesia dall'HUB-SM)
create or replace function public.neon_passiva_segna(p_id uuid, p_stato text, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.neon_passive;
begin
  select * into p from public.neon_passive where id = p_id for update;
  if p.id is null or not public.neon_puo(p.azienda_id, 'vendere') then raise exception 'Fattura non trovata.'; end if;
  if p_stato not in ('nuova', 'vista', 'registrata', 'rettifica') then raise exception 'Stato non valido.'; end if;
  if char_length(coalesce(p_nota, '')) > 500 then raise exception 'La nota è troppo lunga.'; end if;
  if p_stato = 'rettifica' then
    if p.stato = 'rettifica' then raise exception 'La rettifica è già stata chiesta.'; end if;
    if char_length(trim(coalesce(p_nota, ''))) < 5 then raise exception 'Scrivi il motivo della rettifica.'; end if;
    if p.td = 'TD29' then raise exception 'Per una comunicazione TD29 non si chiede la rettifica.'; end if;
    insert into public.neon_hub_coda (azienda_id, azione, passiva_id, dati, creato_da)
    values (p.azienda_id, 'rettifica', p_id, jsonb_build_object('file', p.nome, 'motivo', trim(p_nota)), auth.uid());
  end if;
  update public.neon_passive set stato = p_stato, nota = coalesce(nullif(trim(coalesce(p_nota, '')), ''), nota) where id = p_id;
end $$;

-- Dati principali di una fattura ricevuta, letti dal suo XML
create or replace function public.neon_leggi_fattura(p_xml text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare x xml;
begin
  x := xmlparse(document p_xml);
  return jsonb_build_object(
    'td', (xpath('//*[local-name()="DatiGeneraliDocumento"]/*[local-name()="TipoDocumento"]/text()', x))[1]::text,
    'numero', (xpath('//*[local-name()="DatiGeneraliDocumento"]/*[local-name()="Numero"]/text()', x))[1]::text,
    'data', (xpath('//*[local-name()="DatiGeneraliDocumento"]/*[local-name()="Data"]/text()', x))[1]::text,
    'totale', (xpath('//*[local-name()="DatiGeneraliDocumento"]/*[local-name()="ImportoTotaleDocumento"]/text()', x))[1]::text,
    'cedente', coalesce((xpath('//*[local-name()="CedentePrestatore"]//*[local-name()="Denominazione"]/text()', x))[1]::text,
      (xpath('//*[local-name()="CedentePrestatore"]//*[local-name()="Cognome"]/text()', x))[1]::text),
    'cod_oe', (xpath('//*[local-name()="CedentePrestatore"]//*[local-name()="IdCodice"]/text()', x))[1]::text);
exception when others then return null;
end $$;

-- Il lavoro della coda, ogni minuto da pg_cron: al massimo 12 chiamate per passata
create or replace function public.neon_hub_lavora()
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.neon_hub_coda;
  h public.neon_hub;
  a public.neon_aziende;
  d public.neon_documenti;
  f public.neon_hub_file;
  w jsonb; w2 jsonb;
  v_token text; v_rc integer; v_msg text;
  v_corpo text; v_xml text; v_tipo text; v_err text;
  v_bytes bytea; v_testo text; v_info jsonb; v_inizio integer; v_fine integer;
  v_riga text; v_nome text; v_file text; v_scaricate integer;
  v_chiamate integer := 0;
begin
  -- In automatico: le fatture ricevute ogni 3 ore per chi è collegato
  insert into public.neon_hub_coda (azienda_id, azione)
  select h2.azienda_id, 'ricevute' from public.neon_hub h2
  where h2.stato = 'ok' and (h2.ultime_ricevute_il is null or h2.ultime_ricevute_il < now() - interval '3 hours')
    and not exists (select 1 from public.neon_hub_coda q where q.azienda_id = h2.azienda_id and q.azione = 'ricevute' and q.stato = 'attesa');

  for c in select * from public.neon_hub_coda where stato = 'attesa' and prossimo <= now() order by prossimo, id limit 12 for update skip locked loop
    select * into h from public.neon_hub where azienda_id = c.azienda_id;
    select * into a from public.neon_aziende where id = c.azienda_id;
    if h.azienda_id is null or h.stato = 'scollegato' or (h.stato <> 'ok' and c.azione <> 'verifica') then
      update public.neon_hub_coda set stato = 'errore', messaggio = 'Azienda non collegata all''HUB-SM', fatto_il = now() where id = c.id;
      continue;
    end if;
    v_token := public.neon_hub_token(c.azienda_id);
    v_corpo := '<token>' || public.neon_xml_testo(v_token) || '</token><codoe>' || a.cod_oe::integer::text || '</codoe>';
    v_chiamate := v_chiamate + 1;

    if c.azione = 'verifica' then
      w := public.neon_ws(h.ambiente, 'listFERSMTempFiles', v_corpo);
      v_rc := (w->>'returnCode')::integer;
      if v_rc > 0 then
        update public.neon_hub set stato = 'ok', messaggio = null, scade = nullif(w->>'dtTokenExpire', '')::timestamptz, verificato_il = now(), aggiornato_il = now()
        where azienda_id = c.azienda_id;
        update public.neon_hub_coda set stato = 'fatto', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      elsif v_rc <= -9996 and c.tentativi < 5 then
        update public.neon_hub_coda set tentativi = tentativi + 1, prossimo = now() + interval '5 minutes', codice = v_rc, messaggio = w->>'message' where id = c.id;
      else
        update public.neon_hub set stato = 'errore', messaggio = coalesce(w->>'message', 'Token non valido') || ' (codice ' || v_rc || ')', aggiornato_il = now()
        where azienda_id = c.azienda_id;
        update public.neon_hub_coda set stato = 'errore', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      end if;

    elsif c.azione = 'invia' then
      select * into d from public.neon_documenti where id = c.documento_id;
      select * into f from public.neon_hub_file where documento_id = c.documento_id and nome = c.dati->>'file' order by id desc limit 1;
      w := public.neon_ws(h.ambiente, 'putFERSMFile', v_corpo || '<filename>' || public.neon_xml_testo(f.nome) || '</filename><stream>'
        || encode(convert_to(f.xml, 'UTF8'), 'base64') || '</stream>');
      v_rc := (w->>'returnCode')::integer;
      if v_rc > 0 then
        update public.neon_hub_file set hash = split_part(coalesce(w->'listfiles'->>0, ''), ';', 2), inviato_il = now() where id = f.id;
        update public.neon_documenti set fe_stato = 'inviata', fe_nota = null, fe_aggiornato_il = now() where id = c.documento_id;
        update public.neon_hub_coda set stato = 'fatto', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
        insert into public.neon_hub_coda (azienda_id, azione, documento_id, dati, prossimo)
        values (c.azienda_id, 'esito', c.documento_id, jsonb_build_object('file', f.nome), now() + interval '10 minutes');
      elsif v_rc <= -9996 and c.tentativi < 5 then
        update public.neon_hub_coda set tentativi = tentativi + 1, prossimo = now() + (interval '5 minutes' * (tentativi + 1)), codice = v_rc, messaggio = w->>'message' where id = c.id;
      else
        if v_rc = -1 then update public.neon_hub set stato = 'errore', messaggio = 'Token non valido o scaduto', aggiornato_il = now() where azienda_id = c.azienda_id; end if;
        update public.neon_documenti set fe_nota = 'Invio non riuscito: ' || coalesce(w->>'message', 'errore') || ' (codice ' || v_rc || ')', fe_aggiornato_il = now()
        where id = c.documento_id;
        update public.neon_hub_coda set stato = 'errore', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      end if;

    elsif c.azione = 'esito' then
      select * into d from public.neon_documenti where id = c.documento_id;
      if d.fe_stato <> 'inviata' then
        update public.neon_hub_coda set stato = 'fatto', messaggio = 'Esito già noto', fatto_il = now() where id = c.id;
        continue;
      end if;
      w := public.neon_ws(h.ambiente, 'getFERSMRicevuta', v_corpo || '<filename>' || public.neon_xml_testo(c.dati->>'file') || '</filename>');
      v_rc := (w->>'returnCode')::integer;
      v_xml := null; v_tipo := null; v_err := null;
      if nullif(w->>'bytestream', '') is not null then
        begin
          v_xml := convert_from(decode(regexp_replace(w->>'bytestream', '\s', '', 'g'), 'base64'), 'UTF8');
          v_tipo := case (xpath('local-name(/*)', xmlparse(document v_xml)))[1]::text
            when 'RicevutaConsegna' then 'consegna' when 'RicevutaScarto' then 'scarto' else 'altro' end;
          if v_tipo = 'scarto' then
            select string_agg(coalesce(e.cod, '') || ': ' || coalesce(e.des, ''), '; ') into v_err
            from (select (xpath('/*/*[local-name()="Codice"]/text()', z))[1]::text cod, (xpath('/*/*[local-name()="Descrizione"]/text()', z))[1]::text des
                  from unnest(xpath('//*[local-name()="Errore"]', xmlparse(document v_xml))) z) e;
          end if;
        exception when others then v_tipo := 'altro';
        end;
      end if;
      if v_xml is not null then
        insert into public.neon_hub_ricevute (azienda_id, documento_id, nome, tipo, xml)
        values (c.azienda_id, c.documento_id, coalesce(w->'listfiles'->>0, c.dati->>'file'), v_tipo, v_xml);
      end if;
      if v_tipo = 'consegna' then
        update public.neon_documenti set fe_stato = 'consegnata', fe_nota = null, fe_aggiornato_il = now() where id = c.documento_id;
        update public.neon_hub_coda set stato = 'fatto', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      elsif v_tipo = 'scarto' or v_rc = -252 then
        update public.neon_documenti set fe_stato = 'scartata', fe_nota = left(coalesce(v_err, w->>'message', 'Scartata dall''HUB-SM'), 500), fe_aggiornato_il = now()
        where id = c.documento_id;
        update public.neon_hub_coda set stato = 'fatto', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      elsif c.tentativi < 150 and v_rc not in (-1, -230) then
        -- -540 non ancora acquisito, -542 riprovare tra 30 minuti, rete: si riprova (per circa tre giorni)
        update public.neon_hub_coda set tentativi = tentativi + 1, prossimo = now() + interval '30 minutes', codice = v_rc, messaggio = w->>'message' where id = c.id;
      else
        update public.neon_documenti set fe_nota = left('Esito non disponibile: ' || coalesce(w->>'message', '') || ' (codice ' || v_rc || ')', 500), fe_aggiornato_il = now()
        where id = c.documento_id;
        update public.neon_hub_coda set stato = 'errore', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      end if;

    elsif c.azione = 'ricevute' then
      w := public.neon_ws(h.ambiente, 'listFERSMFilesIn', v_corpo
        || '<dataricezmin>' || to_char(coalesce(h.ultime_ricevute_il - interval '2 days', now() - interval '60 days'), 'YYYY-MM-DD"T"00:00:00') || '</dataricezmin>'
        || '<dataricezmax>' || to_char(now() + interval '1 day', 'YYYY-MM-DD"T"00:00:00') || '</dataricezmax>');
      v_rc := (w->>'returnCode')::integer;
      if v_rc > 0 then
        v_scaricate := 0;
        for v_riga in select jsonb_array_elements_text(w->'listfiles') loop
          v_nome := split_part(v_riga, ';', 2);
          continue when v_nome = '' or exists (select 1 from public.neon_passive where azienda_id = c.azienda_id and ambiente = h.ambiente and nome = v_nome);
          exit when v_scaricate >= 20;
          v_scaricate := v_scaricate + 1;
          -- Il manuale scrive i nomi dell'elenco senza estensione: si prova il nome com'è, poi con .xml e .xml.p7m
          w2 := null;
          for v_file in select unnest(case when v_nome ~ '\.' then array[v_nome] else array[v_nome || '.xml', v_nome || '.xml.p7m', v_nome] end) loop
            w2 := public.neon_ws(h.ambiente, 'getFERSMFileIn', v_corpo || '<filename>' || public.neon_xml_testo(v_file) || '</filename>');
            exit when (w2->>'returnCode')::integer > 0 and nullif(w2->>'bytestream', '') is not null;
          end loop;
          continue when (w2->>'returnCode')::integer <= 0 or nullif(w2->>'bytestream', '') is null;
          v_bytes := decode(regexp_replace(w2->>'bytestream', '\s', '', 'g'), 'base64');
          -- XML semplice, oppure estratto da un .p7m (firma CAdES) cercando la fattura dentro il file
          v_testo := null;
          begin
            v_testo := convert_from(v_bytes, 'UTF8');
          exception when others then
            v_testo := convert_from(v_bytes, 'LATIN1');
          end;
          v_inizio := strpos(v_testo, '<?xml');
          if v_inizio = 0 then v_inizio := strpos(v_testo, '<'); end if;
          v_fine := length(v_testo) - strpos(reverse(v_testo), reverse('FatturaElettronica>')) + 1;
          v_xml := case when v_inizio > 0 and v_fine > v_inizio then substr(v_testo, v_inizio, v_fine - v_inizio + 1) end;
          v_info := case when v_xml is not null then public.neon_leggi_fattura(v_xml) end;
          if v_info is null then v_xml := null; end if;
          insert into public.neon_passive (azienda_id, ambiente, nome, contenuto, xml, td, cedente, cedente_cod_oe, numero, data, totale, confermata_il)
          values (c.azienda_id, h.ambiente, v_nome, v_bytes, v_xml, v_info->>'td', v_info->>'cedente', v_info->>'cod_oe', v_info->>'numero',
            nullif(v_info->>'data', '')::date, nullif(v_info->>'totale', '')::numeric, nullif(split_part(v_riga, ';', 3), '')::timestamp at time zone 'Europe/San_Marino')
          on conflict (azienda_id, ambiente, nome) do nothing;
        end loop;
        update public.neon_hub set ultime_ricevute_il = case when v_scaricate >= 20 then ultime_ricevute_il else now() end where azienda_id = c.azienda_id;
        update public.neon_hub_coda set stato = 'fatto', codice = v_rc, messaggio = v_scaricate || ' scaricate', fatto_il = now() where id = c.id;
        if v_scaricate >= 20 then insert into public.neon_hub_coda (azienda_id, azione, prossimo) values (c.azienda_id, 'ricevute', now() + interval '1 minute'); end if;
      elsif v_rc <= -9996 and c.tentativi < 3 then
        update public.neon_hub_coda set tentativi = tentativi + 1, prossimo = now() + interval '15 minutes', codice = v_rc, messaggio = w->>'message' where id = c.id;
      else
        if v_rc = -1 then update public.neon_hub set stato = 'errore', messaggio = 'Token non valido o scaduto', aggiornato_il = now() where azienda_id = c.azienda_id; end if;
        update public.neon_hub set ultime_ricevute_il = now() where azienda_id = c.azienda_id;
        update public.neon_hub_coda set stato = 'errore', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      end if;

    elsif c.azione = 'rettifica' then
      w := public.neon_ws(h.ambiente, 'richiediRettificaFERSMFileIn', v_corpo || '<filename>' || public.neon_xml_testo(c.dati->>'file')
        || '</filename><reason>' || public.neon_xml_testo(left(c.dati->>'motivo', 500)) || '</reason>');
      v_rc := (w->>'returnCode')::integer;
      if v_rc > 0 then
        update public.neon_hub_coda set stato = 'fatto', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      elsif v_rc <= -9996 and c.tentativi < 5 then
        update public.neon_hub_coda set tentativi = tentativi + 1, prossimo = now() + interval '10 minutes', codice = v_rc, messaggio = w->>'message' where id = c.id;
      else
        update public.neon_passive set stato = 'vista', nota = left('Rettifica non riuscita: ' || coalesce(w->>'message', '') || ' (codice ' || v_rc || ')', 500) where id = c.passiva_id;
        update public.neon_hub_coda set stato = 'errore', codice = v_rc, messaggio = w->>'message', fatto_il = now() where id = c.id;
      end if;
    end if;
    exit when v_chiamate >= 12;
  end loop;
end $$;

revoke all on function public.neon_ws(text, text, text), public.neon_hub_token(uuid), public.neon_hub_lavora() from public, anon, authenticated;
revoke all on function public.neon_hub_stato(uuid), public.neon_hub_collega(uuid, text, text), public.neon_hub_scollega(uuid),
  public.neon_hub_invia(uuid, text), public.neon_hub_controlla(uuid), public.neon_hub_cerca_ricevute(uuid), public.neon_passiva_segna(uuid, text, text),
  public.neon_aggiorna_scartata(uuid) from public, anon;
grant execute on function public.neon_hub_stato(uuid), public.neon_hub_collega(uuid, text, text), public.neon_hub_scollega(uuid),
  public.neon_hub_invia(uuid, text), public.neon_hub_controlla(uuid), public.neon_hub_cerca_ricevute(uuid), public.neon_passiva_segna(uuid, text, text),
  public.neon_aggiorna_scartata(uuid) to authenticated;

select cron.schedule('neonup-hub', '* * * * *', 'select public.neon_hub_lavora()');
