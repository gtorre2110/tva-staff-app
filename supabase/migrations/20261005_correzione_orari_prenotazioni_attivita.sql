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
--  * tocca solo le attività "una tantum" (modello_id nullo): quelle generate
--    dai modelli vanno verificate a parte (vedi query di controllo sotto).
-- ============================================================

update attivita
set apertura_prenotazioni = (apertura_prenotazioni at time zone 'UTC') at time zone 'Europe/Rome',
    chiusura_prenotazioni = (chiusura_prenotazioni at time zone 'UTC') at time zone 'Europe/Rome'
where modello_id is null
  and (apertura_prenotazioni is not null or chiusura_prenotazioni is not null);

-- Controllo (dopo): gli orari devono coincidere con quelli che avevi inserito
-- select nome, data, ora_inizio,
--        apertura_prenotazioni at time zone 'Europe/Rome' as apertura,
--        chiusura_prenotazioni at time zone 'Europe/Rome' as chiusura
-- from attivita where modello_id is null order by data desc limit 20;
