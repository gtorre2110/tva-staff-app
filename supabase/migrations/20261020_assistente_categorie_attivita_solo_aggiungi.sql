-- 20261020_assistente_categorie_attivita_solo_aggiungi.sql
-- Assistente istruttore: sulle categorie collegate ad attività e modelli può
-- solo AGGIUNGERE, non togliere (stesso criterio di Categorie, Cataloghi,
-- Modelli e Attività). Motivo: togliendo tutte le categorie di un'attività
-- (per esempio un corso) l'attività diventa visibile e prenotabile da tutti i
-- clienti. Verificato il 20/10 su main: le tabelle avevano solo la policy
-- "staff gestisce collegamenti…" (ALL, is_staff()), che vale anche per
-- l'assistente.
--
-- Politiche RESTRITTIVE: si sommano a quelle esistenti senza toccarle; per
-- chi non è assistente istruttore non cambia nulla. Nessun dato modificato.

begin;

drop policy if exists "assistente_no_delete" on public.attivita_categorie;
create policy "assistente_no_delete" on public.attivita_categorie as restrictive
  for delete using (not is_assistente_istruttore());

drop policy if exists "assistente_no_update" on public.attivita_categorie;
create policy "assistente_no_update" on public.attivita_categorie as restrictive
  for update using (not is_assistente_istruttore());

drop policy if exists "assistente_no_delete" on public.attivita_modello_categorie;
create policy "assistente_no_delete" on public.attivita_modello_categorie as restrictive
  for delete using (not is_assistente_istruttore());

drop policy if exists "assistente_no_update" on public.attivita_modello_categorie;
create policy "assistente_no_update" on public.attivita_modello_categorie as restrictive
  for update using (not is_assistente_istruttore());

commit;
