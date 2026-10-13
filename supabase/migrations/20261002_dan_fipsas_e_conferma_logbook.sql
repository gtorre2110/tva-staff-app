-- Anagrafica cliente: numero e scadenza assicurazione DAN, numero tessera FIPSAS
alter table clienti
  add column if not exists dan_numero text,
  add column if not exists dan_scadenza date,
  add column if not exists fipsas_numero text,
  add column if not exists fipsas_scadenza date;

-- Logbook: tracciamo CHI (quale membro dello staff) ha confermato una voce,
-- per poter limitare chi può togliere la conferma a quella persona o a un
-- amministratore.
alter table logbook
  add column if not exists confermato_da_membro_id uuid references membri_staff(id);
