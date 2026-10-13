-- La policy "cliente modifica il proprio logbook" esisteva già ma permetteva
-- al cliente di aggiornare qualunque propria voce, anche una già confermata
-- dall'istruttore. La restringiamo: il cliente può modificare una voce solo
-- se non è (ancora) confermata, e non può usare l'update per auto-confermarla.
drop policy if exists "cliente modifica il proprio logbook" on logbook;

create policy "cliente modifica il proprio logbook" on logbook
  for update
  using (
    confermato_da_istruttore = false
    and exists (
      select 1 from clienti c
      where c.id = logbook.cliente_id and c.auth_user_id = auth.uid()
    )
  )
  with check (
    confermato_da_istruttore = false
    and exists (
      select 1 from clienti c
      where c.id = logbook.cliente_id and c.auth_user_id = auth.uid()
    )
  );
