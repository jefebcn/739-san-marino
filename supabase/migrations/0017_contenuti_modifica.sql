-- 739 San Marino · contenuti editoriali: la redazione può modificare ed eliminare (completa la 0016).
-- DA APPLICARE A MANO dall'SQL Editor di Supabase (l'applicazione automatica chiede conferma per queste regole):
-- https://raw.githubusercontent.com/jefebcn/739-san-marino/main/supabase/migrations/0017_contenuti_modifica.sql

drop policy if exists "la redazione modifica" on public.contenuti;
create policy "la redazione modifica" on public.contenuti
  for update to authenticated using (public.e_redattore()) with check (public.e_redattore());

drop policy if exists "la redazione elimina" on public.contenuti;
create policy "la redazione elimina" on public.contenuti
  for delete to authenticated using (public.e_redattore());

grant update, delete on public.contenuti to authenticated;
