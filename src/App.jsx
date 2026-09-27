import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Registrati from './pages/Registrati'
import PasswordDimenticata from './pages/PasswordDimenticata'
import NuovaPassword from './pages/NuovaPassword'
import RichiediAccesso from './pages/RichiediAccesso'
import InAttesa from './pages/InAttesa'
import AppShell from './components/AppShell'
import Clienti from './pages/Clienti'
import ClienteDettaglio from './pages/ClienteDettaglio'
import Modelli from './pages/Modelli'
import Attivita from './pages/Attivita'
import Dashboard from './pages/Dashboard'
import Categorie from './pages/Categorie'
import Cataloghi from './pages/Cataloghi'
import CodiciInvito from './pages/CodiciInvito'
import RegistroImmersioni from './pages/RegistroImmersioni'
import DaFare from './pages/DaFare'
import Aiuto from './pages/Aiuto'
import Staff from './pages/Staff'
import LogModifiche from './pages/LogModifiche'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [membro, setMembro] = useState(undefined)
  const [recupero, setRecupero] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecupero(true)
      setSession(s)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) caricaMembro()
    else setMembro(undefined)
  }, [session])

  async function caricaMembro() {
    setMembro(undefined)
    const { data } = await supabase
      .from('membri_staff')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
    setMembro(data)
  }

  if (session === undefined) return null

  // Link di recupero password cliccato: mostra il form per impostarne una nuova,
  // indipendentemente dallo stato normale di sessione/membro.
  if (recupero) {
    return <NuovaPassword onCompletato={() => setRecupero(false)} />
  }

  if (!session) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registrati" element={<Registrati />} />
          <Route path="/password-dimenticata" element={<PasswordDimenticata />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  if (membro === undefined) return null

  if (!membro) {
    return <RichiediAccesso onCompletato={caricaMembro} />
  }

  if (!membro.attivo) {
    return <InAttesa />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell session={session} membro={membro} />}>
          <Route path="/" element={<Navigate to="/clienti" replace />} />
          <Route path="/clienti" element={<Clienti />} />
          <Route path="/clienti/:id" element={<ClienteDettaglio />} />
          <Route path="/modelli" element={<Modelli />} />
          <Route path="/attivita" element={<Attivita />} />
          <Route path="/categorie" element={<Categorie />} />
          <Route path="/cataloghi" element={<Cataloghi />} />
          <Route path="/codici-invito" element={<CodiciInvito />} />
          <Route path="/registro-immersioni" element={<RegistroImmersioni />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/da-fare" element={<DaFare membro={membro} />} />
          <Route path="/aiuto" element={<Aiuto />} />
          {membro.ruolo === 'amministratore' && <Route path="/staff" element={<Staff />} />}
          {membro.ruolo === 'amministratore' && <Route path="/log-modifiche" element={<LogModifiche />} />}
          <Route path="*" element={<Navigate to="/clienti" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
