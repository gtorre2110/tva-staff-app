-- Assistente istruttore: sulle Categorie può solo AGGIUNGERE, non modificare
-- né eliminare (stesso criterio già applicato a Cataloghi, Modelli e
-- Attività in assistente_istruttore.sql). Eliminare una categoria la toglie
-- anche da clienti e attività collegate, quindi è un'azione da riservare
-- a staff e amministratori.
--
-- Politiche RESTRITTIVE: si sommano a quelle già esistenti senza toccarle;
-- per chi non è assistente istruttore non cambia nulla.

drop policy if exists "assistente_no_update" on categorie;
create policy "assistente_no_update" on categorie as restrictive
  for update using (not is_assistente_istruttore());

drop policy if exists "assistente_no_delete" on categorie;
create policy "assistente_no_delete" on categorie as restrictive
  for delete using (not is_assistente_istruttore());
