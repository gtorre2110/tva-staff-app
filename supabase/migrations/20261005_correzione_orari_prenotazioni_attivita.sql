-- ============================================================
-- ATTIVITÀ: correzione di apertura/chiusura prenotazioni salvate sfasate
-- ============================================================
-- Il form salvava l'orario "da orologio" (es. 10:00) senza fuso e il database
-- lo leggeva come UTC: l'app lo mostrava poi con +2 ore (+1 d'inverno).
-- Qui riportiamo i valori già salvati all'orario realmente inserito.
--
-- ATTENZIONE:
--  * da eseguire UNA SOLA VOLTA per database (rilanciarlo sposterebbe di
--    nuovo gli orari);
--  * da lanciare subito dopo che il nuovo codice dell'app è online su quel
--    database, e senza creare attività nel frattempo (le attività create col
--    nuovo codice sono già corrette);
--  * tocca TUTTE le attività: anche quelle generate dai modelli avevano lo
--    stesso sfasamento (la funzione genera_occorrenze va corretta prima, con
--    20261005_genera_occorrenze_fuso_orario.sql).
-- ============================================================

update attivita
set apertura_prenotazioni = (apertura_prenotazioni at time zone 'UTC') at time zone 'Europe/Rome',
    chiusura_prenotazioni = (chiusura_prenotazioni at time zone 'UTC') at time zone 'Europe/Rome'
where (apertura_prenotazioni is not null or chiusura_prenotazioni is not null);

-- Controllo (dopo): gli orari devono coincidere con quelli che avevi inserito
-- select nome, data, ora_inizio,
--        apertura_prenotazioni at time zone 'Europe/Rome' as apertura,
--        chiusura_prenotazioni at time zone 'Europe/Rome' as chiusura
-- from attivita order by data desc limit 20;
