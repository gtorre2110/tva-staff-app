# Staff App — Gestione attività sportive

## Avvio

1. Installa le dipendenze:
   ```
   npm install
   ```
2. Copia `.env.example` in `.env` e inserisci URL e anon key del tuo progetto Supabase (li trovi in Project Settings → API):
   ```
   cp .env.example .env
   ```
3. Avvia il server di sviluppo:
   ```
   npm run dev
   ```

## Login

La pagina di login usa `supabase.auth.signInWithPassword`, quindi i membri dello staff devono già esistere come utenti in Supabase Auth (collegati alla tabella `membri_staff`). Se non hai ancora creato utenti di test, puoi farlo da Authentication → Users nella dashboard Supabase.

## Struttura

```
src/
  supabaseClient.js   # client Supabase condiviso
  App.jsx             # gestisce la sessione (mostra Login o l'app)
  pages/
    Login.jsx / .css  # schermata di accesso
```

La dashboard staff (attività, check-in, anagrafica clienti) verrà aggiunta nei prossimi passi.
