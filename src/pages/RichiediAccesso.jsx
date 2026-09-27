import { useState } from 'react'
import { useBozza } from '../lib/useBozza'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import './Login.css'

const VUOTO = { nome: '', cognome: '' }

export default function RichiediAccesso({ onCompletato }) {
  const [form, setForm, pulisciBozza] = useBozza('richiesta-accesso-staff', VUOTO)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: rpcError } = await supabase.rpc('richiedi_accesso_staff', {
      p_nome: form.nome.trim(),
      p_cognome: form.cognome.trim(),
    })

    setLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    pulisciBozza()
    onCompletato()
  }

  return (
    <div className="login-screen">
      <div className="login-hero">
        <div className="login-hero-content">
          <img src={logo} alt="Logo" className="login-hero-logo" />
          <span className="login-hero-kicker">Ultimo passo</span>
          <h1>I tuoi dati</h1>
          <p>Una volta inviata la richiesta, un amministratore dovrà approvarla.</p>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Completa la richiesta</h2>

          <label htmlFor="nome">Nome</label>
          <input id="nome" value={form.nome} onChange={(e) => aggiorna('nome', e.target.value)} required />

          <label htmlFor="cognome">Cognome</label>
          <input
            id="cognome"
            value={form.cognome}
            onChange={(e) => aggiorna('cognome', e.target.value)}
            required
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Invio…' : 'Invia richiesta'}
          </button>
        </form>
      </div>
    </div>
  )
}
