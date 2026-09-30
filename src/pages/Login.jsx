import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import CampoPassword from '../components/CampoPassword'
import BetaBanner from '../components/BetaBanner'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email o password non corrette.'
          : signInError.message
      )
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
          <h1>Accesso staff</h1>
          <p>
            Prenotazioni, check-in e anagrafica clienti in un unico posto.
            Accedi con le credenziali che ti ha assegnato l'amministratore.
          </p>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Bentornato</h2>

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
            autoComplete="current-password"
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
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>

          <p className="field-hint" style={{ marginTop: '0.9rem' }}>
            <Link to="/password-dimenticata">Password dimenticata?</Link>
          </p>
        </form>

        <p className="field-hint" style={{ marginTop: '1.5rem' }}>
          Fai parte dello staff e non hai ancora un account?{' '}
          <Link to="/registrati">Richiedi accesso</Link>
        </p>
      </div>
    </div>
  )
}
