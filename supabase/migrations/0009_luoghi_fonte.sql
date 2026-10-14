-- 739 San Marino · da dove viene ogni luogo: inserito a mano o importato da una fonte esterna (OpenStreetMap).
-- Applicata automaticamente (solo colonne e indice nuovi).
create extension if not exists http with schema extensions;

alter table public.luoghi
  add column if not exists fonte text not null default 'manuale',
  add column if not exists id_esterno text,
  add column if not exists aggiornato_il timestamptz;

-- Un elemento esterno compare una volta sola: serve per aggiornarlo invece di duplicarlo
create unique index if not exists luoghi_fonte_id_esterno on public.luoghi (fonte, id_esterno);
