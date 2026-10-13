import logo from './assets/logo.png'

// Modalità manutenzione: si accende impostando su Vercel la variabile
// VITE_MANUTENZIONE=1 (e rifacendo il deploy). Per controllare l'app mentre
// è in manutenzione si apre una volta l'indirizzo con ?prova=Nettuno: da quel
// momento, fino alla chiusura della scheda del browser, l'app si vede normalmente.
export function inManutenzione() {
  if (import.meta.env.VITE_MANUTENZIONE !== '1') return false
  try {
    const parametro = new URLSearchParams(window.location.search).get('prova')
    if (parametro === 'Nettuno') sessionStorage.setItem('tva_prova', '1')
    if (sessionStorage.getItem('tva_prova') === '1') return false
  } catch {
    // browser senza sessionStorage: resta la schermata di manutenzione
  }
  return true
}

export default function Manutenzione() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem 1.25rem',
        textAlign: 'center',
        background: '#f4fafe',
        color: '#006699',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <img src={logo} alt="Treviso Apnea" style={{ height: '4.5rem', width: 'auto' }} />
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Stiamo aggiornando l'app</h1>
      <p style={{ margin: 0, fontSize: '1rem', maxWidth: '22rem' }}>
        Torniamo online tra poco. Grazie per la pazienza.
      </p>
    </div>
  )
}
