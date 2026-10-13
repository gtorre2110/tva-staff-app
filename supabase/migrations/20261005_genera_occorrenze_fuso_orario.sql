-- ============================================================
-- genera_occorrenze: apertura/chiusura prenotazioni nel fuso italiano
-- ============================================================
-- La funzione calcolava (data + ora_inizio) - anticipo come orario "da
-- orologio" senza fuso, che il database (in UTC) leggeva come UTC: apertura e
-- chiusura risultavano spostate di 1-2 ore. Ora il valore viene interpretato
-- come ora italiana ('Europe/Rome').
--
-- Da lanciare PRIMA della correzione degli orari già salvati
-- (20261005_correzione_orari_prenotazioni_attivita.sql) e senza generare
-- occorrenze tra le due operazioni.
-- ============================================================

create or replace function public.genera_occorrenze(p_modello_id uuid, p_data_inizio date, p_data_fine date)
 returns setof attivita
 language plpgsql
as $function$
declare
  m attivita_modello%rowtype;
  d date;
  nuova attivita%rowtype;
begin
  select * into m from attivita_modello where id = p_modello_id;

  if not found then
    raise exception 'Modello % non trovato', p_modello_id;
  end if;

  for d in
    select gs::date
    from generate_series(p_data_inizio, p_data_fine, interval '1 day') gs
    where extract(dow from gs) = m.giorno_settimana
  loop
    if not exists (
      select 1 from attivita
      where modello_id = m.id and data = d
    ) then
      insert into attivita (
        modello_id, nome, data, ora_inizio, ora_fine, posti_massimi,
        apertura_prenotazioni, chiusura_prenotazioni
      ) values (
        m.id, m.nome, d, m.ora_inizio, m.ora_fine, m.posti_massimi,
        ((d + m.ora_inizio) - (m.anticipo_apertura_ore || ' hours')::interval) at time zone 'Europe/Rome',
        ((d + m.ora_inizio) - (m.anticipo_chiusura_ore || ' hours')::interval) at time zone 'Europe/Rome'
      )
      returning * into nuova;

      -- copia le categorie del modello sulla nuova occorrenza
      insert into attivita_categorie (attivita_id, categoria_id)
      select nuova.id, categoria_id
      from attivita_modello_categorie
      where modello_id = m.id;

      return next nuova;
    end if;
  end loop;
end;
$function$;
