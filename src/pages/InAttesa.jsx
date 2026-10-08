import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from '../components/BetaBanner'
import './Login.css'

export default function InAttesa() {
  return (
    <div className="login-screen">
      <div className="login-hero">
        <div className="login-hero-content">
          <BetaBanner />
          <img src={logo} alt="Logo" className="login-hero-logo" />
          <span className="login-hero-kicker">Richiesta inviata</span>
          <h1>In attesa di approvazione</h1>
          <p>Un amministratore deve attivare il tuo account prima che tu possa accedere.</p>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-form">
          <h2>Quasi pronto</h2>
          <p className="field-hint">
            Ti avviseremo (o contatta direttamente un amministratore) quando il tuo account
            sarà attivo. Puoi ricaricare questa pagina più tardi per controllare.
          </p>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => supabase.auth.signOut()}
          >
            Esci
          </button>
        </div>
      </div>
    </div>
  )
}
