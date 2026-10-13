# Migrazioni database — branch beta

Da quando esiste questo branch, ogni modifica allo schema del database
(nuove tabelle, colonne, funzioni, policy RLS, ecc.) va salvata qui come
file `.sql` numerato, ESEGUITO PRIMA sul progetto Supabase di staging.

Convenzione nome file: `AAAAMMGG_descrizione-breve.sql`
Esempio: `20260930_aggiunge_colonna_note_clienti.sql`

Perché: al momento del rilascio in produzione (merge beta -> main), questi
stessi file andranno rieseguiti in ordine sul database di produzione, così
la produzione riceve esattamente le modifiche testate in beta — niente
ricostruito a memoria, niente passaggi dimenticati.

Regola pratica: prima di lanciare una query di modifica schema nello SQL
Editor di Supabase (staging), salva la query in un file qui. Le query di
sola lettura (diagnosi, verifiche) non serve salvarle.
