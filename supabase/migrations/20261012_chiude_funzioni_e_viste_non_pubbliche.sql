-- ============================================================
-- SICUREZZA: chiude l'accesso web a funzioni, viste e liste file interni
-- ============================================================
-- Nasce dal Security Advisor di Supabase (12/10/2026) e dal controllo del
-- codice delle app. Cosa corregge:
--
--  1) Quattro funzioni che nessuna app chiama (le usano solo i job di Cron
--     e i trigger, che girano come amministratore del database) erano
--     richiamabili da chiunque via web, anche senza login:
--       invia_email, processa_coda_email, controlla_saldo_basso,
--       controlla_scadenze_certificati
--     In particolare invia_email permetteva a un estraneo di far partire
--     email da noreply@trevisoapnea.it.
--
--  2) La vista clienti_con_stato, che nessuna app usa, ignora le regole di
--     accesso per riga ed era leggibile da chiunque: viene chiusa.
--
--  3) Nei bucket pubblici la policy di lettura permetteva di ELENCARE tutti
--     i file. Le immagini restano visibili dagli indirizzi diretti (i bucket
--     sono pubblici) e l'app non usa mai l'elenco: la lettura via API viene
--     limitata agli utenti con login. L'upsert continua a funzionare.
--
-- NON tocca: is_staff, is_admin, is_assistente_istruttore, le funzioni
-- usate dalle regole di accesso e le funzioni dei trigger.
--
-- Da eseguire UNA volta per database (prima staging, poi produzione), dopo
-- tutte le altre migrazioni di questa cartella. Si può rilanciare senza danni.
-- ============================================================

-- 1) Funzioni interne: niente accesso web --------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as firma
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('invia_email', 'processa_coda_email',
                        'controlla_saldo_basso', 'controlla_scadenze_certificati')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.firma);
  end loop;
end $$;

-- 2) Vista interna: niente accesso web -----------------------------------
do $$
begin
  if to_regclass('public.clienti_con_stato') is not null then
    execute 'revoke all on table public.clienti_con_stato from public, anon, authenticated';
  end if;
end $$;

-- 3) Bucket pubblici: niente elenco dei file senza login -----------------
drop policy if exists "lettura pubblica foto-clienti" on storage.objects;
drop policy if exists "lettura pubblica immagini-brevetti" on storage.objects;
drop policy if exists "chiunque legge foto clienti" on storage.objects;
drop policy if exists "chiunque legge immagini brevetti" on storage.objects;
drop policy if exists "chiunque legge i file info" on storage.objects;

drop policy if exists "lettura foto clienti con login" on storage.objects;
create policy "lettura foto clienti con login" on storage.objects
  for select to authenticated
  using (bucket_id = 'foto-clienti');

drop policy if exists "lettura immagini brevetti con login" on storage.objects;
create policy "lettura immagini brevetti con login" on storage.objects
  for select to authenticated
  using (bucket_id = 'immagini-brevetti');

drop policy if exists "lettura file info con login" on storage.objects;
create policy "lettura file info con login" on storage.objects
  for select to authenticated
  using (bucket_id = 'documenti-info');

-- ============================================================
-- CONTROLLO (dopo): le prime tre colonne devono essere tutte false per
-- anon; la vista non deve essere leggibile.
--
-- select p.proname,
--        has_function_privilege('anon', p.oid, 'execute') as anon,
--        has_function_privilege('authenticated', p.oid, 'execute') as autenticati
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('invia_email','processa_coda_email',
--                     'controlla_saldo_basso','controlla_scadenze_certificati');
--
-- select has_table_privilege('anon', 'public.clienti_con_stato', 'select') as anon_legge,
--        has_table_privilege('authenticated', 'public.clienti_con_stato', 'select') as autenticati_leggono;
--
-- RITORNO (solo se qualcosa si rompe; ripristina l'accesso di prima):
--   grant execute on function public.invia_email(text, text, text) to anon, authenticated;
--   (idem per le altre tre funzioni)
--   grant select on public.clienti_con_stato to anon, authenticated;
--   e ricreare la policy di lettura pubblica del bucket interessato.
-- ============================================================
