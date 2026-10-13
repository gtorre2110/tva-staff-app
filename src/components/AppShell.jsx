import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from './BetaBanner'
import './AppShell.css'

export default function AppShell({ session, membro }) {
  const [menuAperto, setMenuAperto] = useState(false)
  const [inSospeso, setInSospeso] = useState(0)
  const [configAperta, setConfigAperta] = useState(false)
  const [confermaEsci, setConfermaEsci] = useState(false)
  const { pathname } = useLocation()

  const isAdmin = membro?.ruolo === 'amministratore'
  const isAssistente = membro?.ruolo === 'assistente_istruttore'

  useEffect(() => {
    let attivo = true

    async function contaInSospeso() {
      const queries = [
        supabase.from('clienti_categorie').select('cliente_id', { count: 'exact', head: true }).eq('confermata', false),
        supabase.from('logbook').select('id', { count: 'exact', head: true }).eq('confermato_da_istruttore', false),
      ]
      if (isAdmin) {
        queries.push(
          supabase.from('membri_staff').select('id', { count: 'exact', head: true }).eq('attivo', false)
        )
      }

      const risultati = await Promise.all(queries)
      const totale = risultati.reduce((somma, r) => somma + (r.count || 0), 0)
      if (attivo) setInSospeso(totale)
    }

    contaInSospeso()
    window.addEventListener('focus', contaInSospeso)
    return () => {
      attivo = false
      window.removeEventListener('focus', contaInSospeso)
    }
  }, [isAdmin])

  // Voci di uso quotidiano, sempre visibili.
  const vociQuotidiane = [
    { to: '/dashboard', label: 'Check-in' },
    { to: '/clienti', label: 'Clienti' },
    { to: '/attivita', label: 'Attività' },
    { to: '/registro-immersioni', label: 'Registro immersioni' },
    { to: '/da-fare', label: 'Da fare', badge: inSospeso },
  ]

  // Voci di configurazione, usate di rado: ripiegate in un gruppo.
  const vociConfigurazione = [
    { to: '/modelli', label: 'Modelli' },
    { to: '/categorie', label: 'Categorie' },
    { to: '/cataloghi', label: 'Cataloghi' },
    ...(!isAssistente ? [{ to: '/codici-invito', label: 'Codici invito' }] : []),
    ...(isAdmin ? [{ to: '/staff', label: 'Staff' }, { to: '/log-modifiche', label: 'Log modifiche' }] : []),
  ]

  const vociSecondarie = [
    { to: '/info', label: 'Info' },
    { to: '/aiuto', label: 'Aiuto' },
  ]

  // Il gruppo si apre da solo se la pagina corrente è una delle sue voci.
  const inConfigurazione = vociConfigurazione.some((v) => pathname === v.to || pathname.startsWith(v.to + '/'))
  const configVisibile = configAperta || inConfigurazione

  function renderVoci(voci, classeLink, chiudi) {
    return voci.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={chiudi}
        className={({ isActive }) => classeLink + (isActive ? ' active' : '')}
      >
        {item.label}
        {!!item.badge && <span className="shell-badge">{item.badge}</span>}
      </NavLink>
    ))
  }

  // Elenco completo delle voci: identico per barra laterale e pannello smartphone.
  function renderMenu(classeLink, chiudi) {
    return (
      <>
        {renderVoci(vociQuotidiane, classeLink, chiudi)}
        <div className="shell-sep" />
        <button
          type="button"
          className={classeLink + ' shell-gruppo-toggle' + (inConfigurazione ? ' contiene-attiva' : '')}
          onClick={() => setConfigAperta(!configVisibile)}
          aria-expanded={configVisibile}
        >
          Configurazione
          <span className="shell-gruppo-freccia" aria-hidden="true">{configVisibile ? '▴' : '▾'}</span>
        </button>
        {configVisibile && (
          <div className="shell-gruppo">{renderVoci(vociConfigurazione, classeLink, chiudi)}</div>
        )}
        {renderVoci(vociSecondarie, classeLink, chiudi)}
        <div className="shell-sep" />
        <button
          type="button"
          className={classeLink + ' shell-esci'}
          onClick={() => {
            if (chiudi) chiudi()
            setConfermaEsci(true)
          }}
        >
          Esci
        </button>
      </>
    )
  }

  return (
    <div className="shell">
      {/* Barra laterale: visibile da tablet in su */}
      <aside className="shell-sidebar">
        <BetaBanner />
        <img src={logo} alt="Logo" className="shell-brand" />
        {membro && (
          <p className="shell-utente">
            {membro.nome} {membro.cognome}
          </p>
        )}
        <nav className="shell-nav">{renderMenu('shell-nav-link')}</nav>
        <div className="shell-user">
          <span>{session.user.email}</span>
        </div>
      </aside>

      {/* Barra superiore compatta: solo da smartphone */}
      <header className="shell-mobile-topbar">
        <BetaBanner />
        <img src={logo} alt="Logo" />
        {membro && <span className="shell-mobile-utente">{membro.nome}</span>}
        {!!inSospeso && (
          <span className="shell-mobile-badge" title="Cose in sospeso">
            {inSospeso}
          </span>
        )}
      </header>

      <main className="shell-content">
        <Outlet />
      </main>

      {/* Pulsante flottante e pannello menu: solo da smartphone, raggiungibile con una mano */}
      <button
        className="shell-fab"
        onClick={() => setMenuAperto(true)}
        aria-label="Apri menu"
        aria-expanded={menuAperto}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
        {!!inSospeso && <span className="shell-fab-badge">{inSospeso}</span>}
      </button>

      {menuAperto && (
        <div className="shell-sheet-overlay" onClick={() => setMenuAperto(false)}>
          <div className="shell-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="shell-sheet-handle" />
            <nav className="shell-sheet-nav">
              {renderMenu('shell-sheet-link', () => setMenuAperto(false))}
            </nav>
            <div className="shell-sheet-user">
              <span>{session.user.email}</span>
            </div>
          </div>
        </div>
      )}

      {confermaEsci && (
        <div className="shell-conferma-overlay" onClick={() => setConfermaEsci(false)}>
          <div className="shell-conferma" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Uscire dall'app?</h2>
            <p>Per rientrare dovrai fare di nuovo il login.</p>
            <div className="shell-conferma-azioni">
              <button type="button" className="btn-secondary" onClick={() => setConfermaEsci(false)}>
                Annulla
              </button>
              <button type="button" className="btn-primary" onClick={() => supabase.auth.signOut()}>
                Esci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
