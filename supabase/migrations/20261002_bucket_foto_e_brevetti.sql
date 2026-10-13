-- I bucket "foto-clienti" e "immagini-brevetti" esistono sul progetto
-- Supabase di produzione (creati a mano, prima che esistesse questo branch
-- beta) ma non sul progetto di staging, separato: da qui l'errore "Bucket
-- not found" caricando una foto brevetto (o una foto profilo) in beta.
-- Li ricreiamo qui via SQL così restano documentati e riproducibili, come
-- già fatto per "documenti-info".
--
-- Scrivono sia i clienti (propria foto profilo, propria immagine brevetto)
-- sia lo staff (immagine standard di catalogo, foto di qualunque cliente):
-- qualunque utente autenticato (cliente o staff) può caricare/sostituire;
-- i bucket sono pubblici in lettura, come già per documenti-info.

insert into storage.buckets (id, name, public)
values
  ('foto-clienti', 'foto-clienti', true),
  ('immagini-brevetti', 'immagini-brevetti', true)
on conflict (id) do nothing;

drop policy if exists "utenti autenticati gestiscono foto clienti" on storage.objects;
create policy "utenti autenticati gestiscono foto clienti" on storage.objects
  for all
  using (bucket_id = 'foto-clienti' and auth.uid() is not null)
  with check (bucket_id = 'foto-clienti' and auth.uid() is not null);

drop policy if exists "utenti autenticati gestiscono immagini brevetti" on storage.objects;
create policy "utenti autenticati gestiscono immagini brevetti" on storage.objects
  for all
  using (bucket_id = 'immagini-brevetti' and auth.uid() is not null)
  with check (bucket_id = 'immagini-brevetti' and auth.uid() is not null);

drop policy if exists "chiunque legge foto clienti" on storage.objects;
create policy "chiunque legge foto clienti" on storage.objects
  for select
  using (bucket_id = 'foto-clienti');

drop policy if exists "chiunque legge immagini brevetti" on storage.objects;
create policy "chiunque legge immagini brevetti" on storage.objects
  for select
  using (bucket_id = 'immagini-brevetti');
