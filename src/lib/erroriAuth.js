// Traduce in italiano gli errori di Supabase Auth (accesso, registrazione,
// recupero e cambio password). Usa il codice quando c'è, altrimenti il testo.
const PER_CODICE = {
  invalid_credentials: 'Email o password non corrette.',
  email_not_confirmed: 'Email non ancora confermata: apri il link che ti abbiamo inviato (controlla anche lo spam).',
  user_already_exists: 'Questa email è già registrata: accedi oppure usa "Password dimenticata?".',
  email_exists: 'Questa email è già registrata: accedi oppure usa "Password dimenticata?".',
  weak_password: 'Password troppo debole: usa almeno 6 caratteri.',
  same_password: 'La nuova password deve essere diversa da quella attuale.',
  email_address_invalid: 'Indirizzo email non valido.',
  validation_failed: 'Controlla i dati inseriti.',
  over_email_send_rate_limit: 'Troppe email inviate in poco tempo: riprova tra qualche minuto.',
  over_request_rate_limit: 'Troppi tentativi in poco tempo: riprova tra qualche minuto.',
  signup_disabled: 'Le nuove registrazioni sono momentaneamente chiuse.',
  user_banned: 'Account sospeso: contatta lo staff.',
  session_expired: 'Sessione scaduta: accedi di nuovo.',
  otp_expired: 'Il link è scaduto o è già stato usato: richiedine uno nuovo.',
}

const PER_TESTO = [
  [/invalid login credentials/i, PER_CODICE.invalid_credentials],
  [/email not confirmed/i, PER_CODICE.email_not_confirmed],
  [/already (been )?registered|already exists/i, PER_CODICE.user_already_exists],
  [/password should be at least/i, PER_CODICE.weak_password],
  [/different from the old password/i, PER_CODICE.same_password],
  [/invalid.*email|email.*invalid/i, PER_CODICE.email_address_invalid],
  [/rate limit|security purposes|too many/i, PER_CODICE.over_request_rate_limit],
  [/signups? not allowed/i, PER_CODICE.signup_disabled],
  [/expired/i, PER_CODICE.otp_expired],
  [/failed to fetch|network/i, 'Connessione assente o instabile: riprova.'],
]

export function messaggioErroreAuth(errore) {
  if (!errore) return null
  if (errore.code && PER_CODICE[errore.code]) return PER_CODICE[errore.code]
  const testo = errore.message || ''
  for (const [regola, messaggio] of PER_TESTO) if (regola.test(testo)) return messaggio
  return testo || 'Si è verificato un errore: riprova.'
}

// Con la conferma email attiva, Supabase non segnala l'email già usata:
// restituisce un utente senza identità e non invia nessuna email.
export function emailGiaRegistrata(data) {
  return Array.isArray(data?.user?.identities) && data.user.identities.length === 0
}
