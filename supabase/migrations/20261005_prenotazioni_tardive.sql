-- ============================================================
-- PRENOTAZIONI TARDIVE
-- ============================================================
-- Dopo la chiusura delle prenotazioni (e finché l'attività non è iniziata)
-- il cliente può comunque registrare la prenotazione, che viene marcata
-- "tardiva":
--   * posti liberi  -> stato 'confermata' + tardiva = true
--   * posti esauriti -> stato 'in_coda' (in fondo) + tardiva = true
-- Lo staff vede la segnalazione al check-in e decide chi è presente.
--
-- Si somma alle regole esistenti: non tocca la policy attuale per le
-- prenotazioni nei tempi.
-- ============================================================

-- 1) flag sulla prenotazione
alter table prenotazioni add column if not exists tardiva boolean not null default false;

-- 2) la vista espone anche "prenotabile_tardi" (colonna in fondo: le
--    colonne esistenti restano invariate)
create or replace view attivita_con_disponibilita as
 select a.id,
    a.nome,
    a.data,
    a.ora_inizio,
    a.ora_fine,
    a.posti_massimi,
    a.apertura_prenotazioni,
    a.chiusura_prenotazioni,
    a.annullata,
    a.posti_massimi - count(p.id) filter (where p.stato = 'confermata'::text) as posti_disponibili,
    now() >= a.apertura_prenotazioni and now() <= a.chiusura_prenotazioni and not a.annullata as prenotabile_ora,
    now() > a.chiusura_prenotazioni
      and now() < ((a.data + a.ora_inizio) at time zone 'Europe/Rome')
      and not a.annullata as prenotabile_tardi
   from attivita a
     left join prenotazioni p on p.attivita_id = a.id
  group by a.id;

-- 3) il cliente può inserire la prenotazione tardiva
drop policy if exists "cliente crea prenotazione tardiva" on prenotazioni;
create policy "cliente crea prenotazione tardiva" on prenotazioni
  for insert
  with check (
    tardiva = true
    and exists (
      select 1 from clienti c
      where c.id = prenotazioni.cliente_id
        and c.auth_user_id = auth.uid()
        and c.prenotazioni_bloccate = false
        and (c.scadenza_certificato_medico is null or c.scadenza_certificato_medico >= current_date)
    )
    and (
      (stato = 'confermata' and exists (
        select 1 from attivita_con_disponibilita d
        where d.id = prenotazioni.attivita_id and d.prenotabile_tardi and d.posti_disponibili > 0))
      or
      (stato = 'in_coda' and exists (
        select 1 from attivita_con_disponibilita d
        where d.id = prenotazioni.attivita_id and d.prenotabile_tardi and d.posti_disponibili = 0))
    )
  );

-- Controllo (dopo): deve restituire la colonna e la nuova policy
-- select column_name from information_schema.columns where table_name='prenotazioni' and column_name='tardiva';
-- select policyname from pg_policies where tablename='prenotazioni' and cmd='INSERT';
