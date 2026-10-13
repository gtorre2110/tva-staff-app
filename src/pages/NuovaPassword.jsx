import { useState } from 'react'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from '../components/BetaBanner'
import CampoPassword from '../components/CampoPassword'
import './Login.css'

export default function NuovaPassword({ onCompletato }) {
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fatto, setFatto] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== conferma) {
      setError('Le due password non coincidono.')
      return
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) setError(updateError.message)
    else setFatto(true)
  }

  return (
    <div className="login-screen">
      <div className="login-hero">
        <div className="login-hero-content">
          <BetaBanner />
          <img src={logo} alt="Logo" className="login-hero-logo" />
          <span className="login-hero-kicker">Recupero accesso</span>
          <h1>Nuova password</h1>
          <p>Scegli una nuova password per il tuo account.</p>
        </div>
      </div>

      <div className="login-panel">
        {fatto ? (
          <div className="login-form">
            <h2>Fatto!</h2>
            <p className="field-hint">La tua password è stata aggiornata.</p>
            <button type="button" style={{ marginTop: '1.5rem' }} onClick={onCompletato}>
              Continua
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Imposta una nuova password</h2>

            <CampoPassword
              id="password"
              label="Nuova password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <CampoPassword
              id="conferma"
              label="Conferma password"
              autoComplete="new-password"
              minLength={6}
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              required
            />

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading ? 'Salvataggio…' : 'Salva nuova password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
