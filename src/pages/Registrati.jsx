import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from '../components/BetaBanner'
import CampoPassword from '../components/CampoPassword'
import './Login.css'

export default function Registrati() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [emailInviata, setEmailInviata] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (!data.session) {
      setEmailInviata(true)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-hero">
        <svg
          className="login-hero-lines"
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <circle cx="200" cy="400" r="140" fill="none" stroke="#2a333d" strokeWidth="1.5" />
          <line x1="0" y1="260" x2="400" y2="260" stroke="#2a333d" strokeWidth="1.5" />
          <circle cx="200" cy="260" r="6" fill="#2a333d" />
        </svg>
        <div className="login-hero-content">
          <BetaBanner />
          <img src={logo} alt="Logo" className="login-hero-logo" />
          <span className="login-hero-kicker">Gestione attività</span>
          <h1>Richiedi accesso</h1>
          <p>
            Crea il tuo account per lavorare nello staff. Dopo la registrazione un
            amministratore dovrà approvarti prima che tu possa accedere.
          </p>
        </div>
      </div>

      <div className="login-panel">
        {emailInviata ? (
          <div className="login-form">
            <h2>Controlla la tua email</h2>
            <p className="field-hint">
              Ti abbiamo inviato un'email di conferma a <strong>{email}</strong>. Confermala,
              poi torna qui per accedere.
            </p>
            <Link to="/login" className="btn-primary" style={{ marginTop: '1.5rem' }}>
              Vai al login
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Crea account staff</h2>

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <CampoPassword
              id="password"
              label="Password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading ? 'Creazione…' : 'Continua'}
            </button>

            <p className="field-hint" style={{ marginTop: '1rem' }}>
              Hai già un account? <Link to="/login">Accedi</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
