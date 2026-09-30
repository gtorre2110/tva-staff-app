-- ============================================================
-- LOGBOOK: nuovi campi "Scheda di registrazione immersioni: Apnea
-- in mare" — Treviso Apnea
-- ============================================================
-- Da eseguire una sola volta nell'SQL Editor di Supabase (prima
-- staging/beta, poi produzione al momento del rilascio).
--
-- Aggiunge SOLO nuovi campi (tutti facoltativi, nessuno obbligatorio)
-- alla tabella "logbook" già esistente. Nessun campo vecchio viene
-- toccato o rimosso: chi ha già voci di logbook non perde nulla.
-- ============================================================

alter table logbook
  add column if not exists numero_uscita integer,
  add column if not exists specchio_acqua text,
  add column if not exists coordinate_lat text,
  add column if not exists coordinate_long text,
  add column if not exists compagno_immersione text,
  add column if not exists condizioni_cielo text,
  add column if not exists condizioni_superficie text,
  add column if not exists visibilita text,
  add column if not exists temperatura_acqua numeric,
  add column if not exists temperatura_aria numeric,
  add column if not exists numero_tuffi integer,
  add column if not exists tempo_max_immersione text,
  add column if not exists profondita_min_raggiunta numeric,
  add column if not exists assetto text,
  add column if not exists muta_giacca_mm numeric,
  add column if not exists muta_pantaloni_mm numeric,
  add column if not exists muta_bermuda_mm numeric,
  add column if not exists guanti_mm numeric,
  add column if not exists calzari_mm numeric,
  add column if not exists zavorra_kg numeric,
  add column if not exists pinne text;

-- Vincoli sui campi "a scelta multipla" della scheda cartacea, per
-- evitare valori scritti a mano diversi da quelli previsti (tutti
-- ammettono anche NULL, cioè "non specificato").
alter table logbook drop constraint if exists logbook_specchio_acqua_check;
alter table logbook add constraint logbook_specchio_acqua_check
  check (specchio_acqua is null or specchio_acqua in ('lago', 'mare'));

alter table logbook drop constraint if exists logbook_condizioni_cielo_check;
alter table logbook add constraint logbook_condizioni_cielo_check
  check (condizioni_cielo is null or condizioni_cielo in ('sereno', 'velato', 'coperto', 'pioggia'));

alter table logbook drop constraint if exists logbook_condizioni_superficie_check;
alter table logbook add constraint logbook_condizioni_superficie_check
  check (condizioni_superficie is null or condizioni_superficie in ('calma', 'quasi_calma', 'mossa', 'molto_mossa'));

alter table logbook drop constraint if exists logbook_visibilita_check;
alter table logbook add constraint logbook_visibilita_check
  check (visibilita is null or visibilita in ('buona', 'sufficiente', 'scarsa'));

alter table logbook drop constraint if exists logbook_assetto_check;
alter table logbook add constraint logbook_assetto_check
  check (assetto is null or assetto in ('costante', 'variabile', 'no_limits'));

-- ============================================================
-- FINE. Nota: "profondita_raggiunta" (già esistente) viene ora usata
-- come "Max profondità raggiunta" della scheda; "profondita_min_raggiunta"
-- (nuovo) è il campo "Min profondità raggiunta".
-- ============================================================
