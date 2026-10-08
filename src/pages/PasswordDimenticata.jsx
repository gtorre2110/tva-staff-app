import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from '../components/BetaBanner'
import './Login.css'

export default function PasswordDimenticata() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inviata, setInviata] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nuova-password`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
    } else {
      setInviata(true)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-hero">
        <div className="login-hero-content">
          <BetaBanner />
          <img src={logo} alt="Logo" className="login-hero-logo" />
          <span className="login-hero-kicker">Gestione attività</span>
          <h1>Password dimenticata</h1>
          <p>Ti mandiamo un link per impostarne una nuova.</p>
        </div>
      </div>

      <div className="login-panel">
        {inviata ? (
          <div className="login-form">
            <h2>Controlla la tua email</h2>
            <p className="field-hint">
              Se l'indirizzo <strong>{email}</strong> corrisponde a un account, riceverai
              a breve un link per impostare una nuova password.
            </p>
            <Link to="/login" className="btn-primary" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              Torna al login
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Recupera l'accesso</h2>

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading ? 'Invio…' : 'Invia link di recupero'}
            </button>

            <p className="field-hint" style={{ marginTop: '1rem' }}>
              <Link to="/login">Torna al login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
