-- Affianca alla vista "registro_immersioni" (che aggrega i dati di
-- un'uscita in stringhe, comoda per il CSV) una funzione che, data la
-- stessa identica chiave di raggruppamento, restituisce i singoli
-- partecipanti con la loro immagine del brevetto — serve per l'export PDF
-- del registro (prima parte: dati dell'uscita come oggi; seconda parte:
-- una scheda per partecipante con nome, cognome e immagine del brevetto).
--
-- NB: le chiavi passate come parametro sono i valori già "risolti" che
-- mostra la vista (coalesce tra nome catalogo e testo libero), non gli id:
-- la app passa esattamente i valori della riga di registro_immersioni che
-- l'utente ha scelto di esportare.

create or replace function registro_immersioni_partecipanti(
  p_data date,
  p_ora_inizio time,
  p_ora_fine time,
  p_localita text,
  p_centro text,
  p_istruttore text
)
returns table (
  cliente_id uuid,
  nome text,
  cognome text,
  immagine_url text,
  brevetto_descrizione text
)
language sql
stable
as $$
  select distinct
    c.id as cliente_id,
    c.nome,
    c.cognome,
    coalesce(b.immagine_url, tb.immagine_url) as immagine_url,
    coalesce(
      nullif(trim(tb.didattica || ' ' || tb.tipo_brevetto), ''),
      nullif(trim(b.didattica_libera || ' ' || b.tipo_brevetto_libero), '')
    ) as brevetto_descrizione
  from logbook l
  join clienti c on c.id = l.cliente_id
  left join istruttori i on i.id = l.istruttore_id
  left join localita_immersione li on li.id = l.localita_id
  left join centri_immersione ci on ci.id = l.centro_immersione_id
  left join brevetti b on b.id = l.brevetto_id
  left join tipi_brevetto tb on tb.id = b.tipo_brevetto_id
  where l.data = p_data
    and l.ora_inizio = p_ora_inizio
    and l.ora_fine = p_ora_fine
    and coalesce(li.nome, l.luogo) is not distinct from p_localita
    and coalesce(ci.nome, l.centro_immersione_libero) is not distinct from p_centro
    and coalesce(i.nome, l.istruttore_nome_libero) is not distinct from p_istruttore
  order by c.cognome, c.nome;
$$;
