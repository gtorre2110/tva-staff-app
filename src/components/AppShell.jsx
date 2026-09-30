import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import BetaBanner from './BetaBanner'
import './AppShell.css'

export default function AppShell({ session, membro }) {
  const [menuAperto, setMenuAperto] = useState(false)
  const [inSospeso, setInSospeso] = useState(0)

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

  const navItems = [
    { to: '/clienti', label: 'Clienti' },
    { to: '/modelli', label: 'Modelli' },
    { to: '/attivita', label: 'Attività' },
    { to: '/categorie', label: 'Categorie' },
    { to: '/cataloghi', label: 'Cataloghi' },
    ...(!isAssistente ? [{ to: '/codici-invito', label: 'Codici invito' }] : []),
    { to: '/registro-immersioni', label: 'Registro immersioni' },
    { to: '/dashboard', label: 'Check-in' },
    { to: '/da-fare', label: 'Da fare', badge: inSospeso },
    { to: '/aiuto', label: 'Aiuto' },
  ]

  if (isAdmin) {
    navItems.push({ to: '/staff', label: 'Staff' })
    navItems.push({ to: '/log-modifiche', label: 'Log modifiche' })
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
        <nav className="shell-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'shell-nav-link' + (isActive ? ' active' : '')}
            >
              {item.label}
              {!!item.badge && <span className="shell-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="shell-user">
          <span>{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()}>Esci</button>
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
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuAperto(false)}
                  className={({ isActive }) => 'shell-sheet-link' + (isActive ? ' active' : '')}
                >
                  {item.label}
                  {!!item.badge && <span className="shell-badge">{item.badge}</span>}
                </NavLink>
              ))}
            </nav>
            <div className="shell-sheet-user">
              <span>{session.user.email}</span>
              <button
                onClick={() => {
                  setMenuAperto(false)
                  supabase.auth.signOut()
                }}
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
