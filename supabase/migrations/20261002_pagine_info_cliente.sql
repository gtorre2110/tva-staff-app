-- Pagina "Info" nella app cliente: documenti informativi (es. legge del
-- mare, attrezzatura richiesta, regole di sicurezza) componibili dallo
-- staff in due modi:
--   - tipo 'testo': titolo + testo scritto nella app staff, che genera
--     automaticamente anche un PDF scaricabile (pdf_url facoltativo)
--   - tipo 'pdf': staff carica direttamente un PDF già pronto (pdf_url
--     obbligatorio, contenuto vuoto)
-- Il cliente vede solo le voci con pubblicata = true, ordinate per "ordine".
--
-- NB: a differenza di quasi tutte le altre tabelle, qui NON va applicato il
-- trigger di normalizzazione maiuscola sul campo "contenuto": è testo libero
-- da mostrare come scritto, non un dato anagrafico.

create table if not exists info_pagine (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  tipo text not null check (tipo in ('testo', 'pdf')),
  contenuto text,
  pdf_url text,
  ordine integer not null default 0,
  pubblicata boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create or replace function info_pagine_aggiorna_timestamp()
returns trigger as $$
begin
  new.aggiornato_il = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_info_pagine_timestamp on info_pagine;
create trigger trg_info_pagine_timestamp
  before update on info_pagine
  for each row
  execute function info_pagine_aggiorna_timestamp();

alter table info_pagine enable row level security;

drop policy if exists "staff gestisce le pagine info" on info_pagine;
create policy "staff gestisce le pagine info" on info_pagine
  for all
  using (is_staff())
  with check (is_staff());

drop policy if exists "cliente vede le pagine info pubblicate" on info_pagine;
create policy "cliente vede le pagine info pubblicate" on info_pagine
  for select
  using (pubblicata = true);

-- Bucket storage per i PDF (caricati a mano oppure generati dalla app staff).
insert into storage.buckets (id, name, public)
values ('documenti-info', 'documenti-info', true)
on conflict (id) do nothing;

drop policy if exists "staff gestisce i file info" on storage.objects;
create policy "staff gestisce i file info" on storage.objects
  for all
  using (bucket_id = 'documenti-info' and is_staff())
  with check (bucket_id = 'documenti-info' and is_staff());

drop policy if exists "chiunque legge i file info" on storage.objects;
create policy "chiunque legge i file info" on storage.objects
  for select
  using (bucket_id = 'documenti-info');
