-- Permette al cliente di indicare quale brevetto è "quello da usare" quando
-- ne ha più di uno (es. per il registro pre-evento, prima che ci sia un
-- logbook a determinarlo). Un solo brevetto per cliente può essere marcato
-- come riferimento (indice unico parziale).

alter table brevetti add column if not exists brevetto_riferimento boolean not null default false;

drop index if exists brevetti_un_riferimento_per_cliente;
create unique index brevetti_un_riferimento_per_cliente
  on brevetti (cliente_id)
  where brevetto_riferimento;

-- Ordina i partecipanti del registro post-evento per livello di brevetto
-- (decrescente), a parità di livello per cognome — stesso criterio usato
-- lato app anche nel registro pre-evento (dove il brevetto mostrato può
-- derivare dal flag di riferimento sopra, non sempre dal livello più alto).
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
  select cliente_id, nome, cognome, immagine_url, brevetto_descrizione
  from (
    select distinct
      c.id as cliente_id,
      c.nome,
      c.cognome,
      coalesce(b.immagine_url, tb.immagine_url) as immagine_url,
      coalesce(
        nullif(trim(tb.didattica || ' ' || tb.tipo_brevetto), ''),
        nullif(trim(b.didattica_libera || ' ' || b.tipo_brevetto_libero), '')
      ) as brevetto_descrizione,
      tb.livello
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
  ) t
  order by t.livello desc nulls last, t.cognome, t.nome;
$$;
