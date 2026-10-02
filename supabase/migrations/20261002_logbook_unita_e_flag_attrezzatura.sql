-- ============================================================
-- LOGBOOK: due nuovi flag in "Attrezzatura utilizzata"
-- ============================================================
-- Da eseguire una sola volta nell'SQL Editor di Supabase (prima
-- staging/beta, poi produzione al momento del rilascio).
--
-- Aggiunge due semplici flag sì/no, non presenti sulla scheda
-- cartacea originale ma richiesti in aggiunta: "Computer/Orologio" e
-- "Coltello/Tagliasagole". Nessun campo esistente viene toccato.
-- ============================================================

alter table logbook
  add column if not exists usa_computer_orologio boolean not null default false,
  add column if not exists usa_coltello_tagliasagole boolean not null default false;
