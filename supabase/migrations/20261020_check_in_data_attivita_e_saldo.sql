-- 20261020_check_in_data_attivita_e_saldo.sql
-- Anomalia del 20/10: il -1 del check-in prendeva la data del giorno del
-- check-in invece di quella dell'attività.
--
-- 1. clienti_movimenti.prenotazione_id: collega il -1 alla sua prenotazione
--    (un solo -1 per prenotazione).
-- 2. Riempimento una tantum di prenotazione_id sui -1 già registrati dal
--    check-in: il -1 e presenza_registrata_il nascono nella stessa
--    transazione e hanno lo stesso orario esatto.
-- 3. gestisci_presenza: il -1 prende data e ora di inizio dell'attività
--    (ora italiana); togliendo la spunta si elimina il -1 collegato alla
--    prenotazione (per i -1 vecchi senza collegamento: stessa data italiana).
-- 4. aggiorna_saldo_da_movimento: il saldo segue anche UPDATE e DELETE dei
--    movimenti (prima solo INSERT: un movimento eliminato non restituiva
--    l'ingresso).
--
-- Non ricalcola i saldi esistenti e non sposta le date dei movimenti già
-- registrati: quello è lo script di correzione separato.

begin;

-- 1. Colonna di collegamento -------------------------------------------------
alter table public.clienti_movimenti
  add column if not exists prenotazione_id uuid
  references public.prenotazioni(id) on delete set null;

create unique index if not exists clienti_movimenti_prenotazione_id_key
  on public.clienti_movimenti (prenotazione_id)
  where prenotazione_id is not null;

-- 4. Saldo su INSERT, UPDATE e DELETE (prima del riempimento, così l'UPDATE
--    del punto 2 passa già dalla nuova funzione: variazione invariata = saldo
--    invariato) ----------------------------------------------------------------
create or replace function public.aggiorna_saldo_da_movimento()
returns trigger
language plpgsql
as $function$
begin
  if TG_OP = 'INSERT' then
    update clienti
      set ingressi_disponibili = ingressi_disponibili + new.variazione
      where id = new.cliente_id;

  elsif TG_OP = 'DELETE' then
    update clienti
      set ingressi_disponibili = ingressi_disponibili - old.variazione
      where id = old.cliente_id;

  elsif TG_OP = 'UPDATE' then
    if new.cliente_id = old.cliente_id then
      if new.variazione <> old.variazione then
        update clienti
          set ingressi_disponibili = ingressi_disponibili + (new.variazione - old.variazione)
          where id = new.cliente_id;
      end if;
    else
      update clienti
        set ingressi_disponibili = ingressi_disponibili - old.variazione
        where id = old.cliente_id;
      update clienti
        set ingressi_disponibili = ingressi_disponibili + new.variazione
        where id = new.cliente_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_aggiorna_saldo on public.clienti_movimenti;
create trigger trg_aggiorna_saldo
  after insert or update or delete on public.clienti_movimenti
  for each row execute function public.aggiorna_saldo_da_movimento();

-- 2. Riempimento una tantum di prenotazione_id --------------------------------
update public.clienti_movimenti m
   set prenotazione_id = p.id
  from public.prenotazioni p
 where m.prenotazione_id is null
   and m.variazione = -1
   and m.cliente_id = p.cliente_id
   and m.creato_il = p.presenza_registrata_il
   and p.presente = true;

-- 3. Check-in con la data dell'attività ---------------------------------------
create or replace function public.gestisci_presenza()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_nome  text;
  v_data  date;
  v_ora   time;
  v_id    uuid;
begin
  if new.presente = true and old.presente = false then
    select nome, data, ora_inizio into v_nome, v_data, v_ora
      from attivita where id = new.attivita_id;

    insert into clienti_movimenti (cliente_id, variazione, motivo, prenotazione_id, creato_il)
      values (
        new.cliente_id,
        -1,
        'presenza: ' || coalesce(v_nome, new.attivita_id::text),
        new.id,
        coalesce((v_data + coalesce(v_ora, time '12:00')) at time zone 'Europe/Rome', now())
      );

    new.presenza_registrata_il = now();

  elsif new.presente = false and old.presente = true then
    -- -1 collegato alla prenotazione
    select id into v_id
      from clienti_movimenti
      where prenotazione_id = new.id
      limit 1;

    -- -1 vecchio senza collegamento: stessa data dell'attività, in ora italiana
    if v_id is null then
      select data into v_data from attivita where id = new.attivita_id;

      select id into v_id
        from clienti_movimenti
        where cliente_id = new.cliente_id
          and prenotazione_id is null
          and variazione = -1
          and motivo ilike 'presenza:%'
          and (creato_il at time zone 'Europe/Rome')::date = v_data
        order by creato_il desc
        limit 1;
    end if;

    if v_id is not null then
      delete from clienti_movimenti where id = v_id;  -- il saldo risale di 1 (punto 4)
    end if;

    new.presenza_registrata_il = null;
  end if;

  return new;
end;
$function$;

commit;
