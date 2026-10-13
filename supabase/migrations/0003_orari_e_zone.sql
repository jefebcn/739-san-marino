-- 739 San Marino · adeguamento ai dati reali dei servizi.
-- A San Marino le farmacie non fanno turni a rotazione: Cailungo (Ospedale) è sempre aperta,
-- quindi al posto dei turni servono gli orari settimanali, per sapere chi è aperto adesso.
-- La tabella turni_farmacie (0002) resta vuota e non è usata dall'app: si può eliminare dal pannello Supabase.

-- Orari settimanali: {"1": [["09:00","14:45"]], …, "7": [...]} con 1 = lunedì. "24:00" = mezzanotte.
alter table public.luoghi add column orari_settimana jsonb;

-- La raccolta cambia anche per zona dentro lo stesso castello (centro storico, alta e bassa densità).
alter table public.raccolta_rifiuti add column zona text not null default 'Tutto il castello';
alter table public.raccolta_rifiuti drop constraint raccolta_rifiuti_castello_id_frazione_key;
alter table public.raccolta_rifiuti add constraint raccolta_rifiuti_castello_zona_frazione_key unique (castello_id, zona, frazione);
alter table public.raccolta_rifiuti drop constraint raccolta_rifiuti_frazione_check;
alter table public.raccolta_rifiuti add constraint raccolta_rifiuti_frazione_check
  check (frazione in ('organico','carta','plastica','metalli','vetro','secco','verde'));
