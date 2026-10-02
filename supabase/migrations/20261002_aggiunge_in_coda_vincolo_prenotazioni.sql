-- ============================================================
-- PRENOTAZIONI: aggiunge "in_coda" al vincolo sullo stato
-- ============================================================
-- Il vincolo attuale ammette solo 'confermata' e 'annullata', ma il
-- codice dell'app (lista d'attesa, già presente anche su main) prova
-- a inserire righe con stato 'in_coda' — oggi quell'insert fallisce
-- con un errore di vincolo violato.
--
-- Da eseguire una sola volta nell'SQL Editor di Supabase (prima
-- staging/beta, poi produzione: verificare con la query diagnostica
-- se il problema è presente anche lì, perché il codice che lo usa è
-- già su main).
-- ============================================================

alter table prenotazioni drop constraint if exists prenotazioni_stato_check;
alter table prenotazioni add constraint prenotazioni_stato_check
  check (stato = any (array['confermata'::text, 'annullata'::text, 'in_coda'::text]));

-- ============================================================
-- FINE. Dopo questa modifica, "Mettiti in lista d'attesa" funziona
-- (inserimento e promozione automatica inclusi).
-- ============================================================
