-- 0044: Scadenze, bandi e novità per le attività (Lavorare, richiesta di Alex del 16/10/2026).
-- Le scrive solo la redazione, sempre con la fonte ufficiale (nome e link): niente date inventate.
-- Tipi: fisco (imposte, dichiarazioni), contributi (ISS e previdenza), lavoro, bando (contributi e bandi pubblici),
-- norme (novità di legge con la data in cui valgono), altro. Il pubblico legge solo quelle pubblicate.
-- Solo oggetti nuovi: una tabella con le sue regole. Nessun dato esistente cambia.

create table if not exists public.scadenze (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('fisco', 'contributi', 'lavoro', 'bando', 'norme', 'altro')),
  titolo text not null check (char_length(titolo) between 5 and 140),
  testo text check (char_length(testo) <= 2000),
  per_chi text check (char_length(per_chi) <= 200),
  giorno date not null,          -- la scadenza, o il giorno da cui vale la novità
  dal date,                      -- per i bandi: quando si aprono le domande
  fonte_nome text not null check (char_length(fonte_nome) between 2 and 120),
  fonte_link text not null check (fonte_link ~ '^https://' and char_length(fonte_link) <= 500),
  stato text not null default 'bozza' check (stato in ('bozza', 'pubblicata')),
  autore uuid references auth.users (id) on delete set null default auth.uid(),
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index if not exists scadenze_per_giorno on public.scadenze (stato, giorno);

alter table public.scadenze enable row level security;
drop policy if exists "scadenze pubblicate" on public.scadenze;
create policy "scadenze pubblicate" on public.scadenze for select to anon, authenticated using (stato = 'pubblicata');
drop policy if exists "scadenze redazione legge" on public.scadenze;
create policy "scadenze redazione legge" on public.scadenze for select to authenticated using (public.e_redattore());
drop policy if exists "scadenze redazione scrive" on public.scadenze;
create policy "scadenze redazione scrive" on public.scadenze for insert to authenticated with check (public.e_redattore());
drop policy if exists "scadenze redazione modifica" on public.scadenze;
create policy "scadenze redazione modifica" on public.scadenze for update to authenticated using (public.e_redattore()) with check (public.e_redattore());
drop policy if exists "scadenze redazione elimina" on public.scadenze;
create policy "scadenze redazione elimina" on public.scadenze for delete to authenticated using (public.e_redattore());

grant select on public.scadenze to anon, authenticated;
grant insert, update, delete on public.scadenze to authenticated;
