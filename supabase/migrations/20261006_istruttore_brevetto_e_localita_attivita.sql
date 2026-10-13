-- ============================================================
-- 1) tipi_brevetto: segno "brevetto da istruttore"
-- ============================================================
-- Serve a mettere per primi, nei registri PDF, i partecipanti che hanno un
-- brevetto da istruttore. Partiamo marcando i tipi con livello 10 o più;
-- poi si può cambiare a mano da Cataloghi > Tipi di brevetto.
alter table tipi_brevetto add column if not exists istruttore boolean not null default false;

update tipi_brevetto set istruttore = true where livello >= 10;

-- ============================================================
-- 2) attivita: località e centro di immersione (facoltativi)
-- ============================================================
-- Compilati dallo staff sull'attività; il registro pre-evento li usa come
-- valori iniziali (correggibili al momento di generare il PDF).
alter table attivita
  add column if not exists localita text,
  add column if not exists centro_immersione text;

-- Controllo (dopo):
-- select count(*) filter (where istruttore) as tipi_istruttore from tipi_brevetto;
-- select column_name from information_schema.columns
--   where table_name = 'attivita' and column_name in ('localita','centro_immersione');
