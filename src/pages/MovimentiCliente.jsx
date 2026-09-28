import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './MovimentiCliente.css'

// Testi standard sempre proposti, anche se non ancora usati da nessuno.
const MOTIVI_STANDARD = [
  'Rinnovo abbonamento',
  'Acquisto pacchetto ingressi',
  'Correzione saldo',
  'Omaggio / promozione',
]

export default function MovimentiCliente({ clienteId, onSaldoAggiornato }) {
  const [movimenti, setMovimenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [motiviUsati, setMotiviUsati] = useState([])

  const [variazione, setVariazione] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvataggio, setSalvataggio] = useState(false)

  useEffect(() => {
    caricaMovimenti()
  }, [clienteId])

  useEffect(() => {
    caricaMotiviUsati()
  }, [])

  async function caricaMotiviUsati() {
    const { data } = await supabase
      .from('clienti_movimenti')
      .select('motivo')
      .not('motivo', 'is', null)
      .order('creato_il', { ascending: false })
      .limit(300)

    const unici = [...new Set((data || []).map((r) => r.motivo).filter(Boolean))]
    setMotiviUsati(unici)
  }

  const suggerimentiMotivo = [...new Set([...MOTIVI_STANDARD, ...motiviUsati])]

  async function caricaMovimenti() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('clienti_movimenti')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('creato_il', { ascending: false })
      .limit(20)

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setMovimenti(data)
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const valore = Number(variazione)
    if (!valore) return

    setSalvataggio(true)
    setError(null)

    const { error: insertError } = await supabase.from('clienti_movimenti').insert({
      cliente_id: clienteId,
      variazione: valore,
      motivo: motivo.trim() || null,
    })

    setSalvataggio(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setVariazione('')
    setMotivo('')
    await caricaMovimenti()
    await caricaMotiviUsati()
    onSaldoAggiornato?.()
  }

  return (
    <div className="movimenti-box">
      <h2>Ingressi</h2>

      <form onSubmit={handleSubmit} className="movimenti-form">
        <input
          type="number"
          placeholder="es. 10 o -1"
          value={variazione}
          onChange={(e) => setVariazione(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Motivo (es. rinnovo abbonamento)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          list="motivi-suggeriti"
        />
        <datalist id="motivi-suggeriti">
          {suggerimentiMotivo.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <button type="submit" className="btn-primary" disabled={salvataggio}>
          {salvataggio ? 'Registro…' : 'Registra'}
        </button>
      </form>
      <p className="movimenti-hint">
        Usa un valore positivo per aggiungere ingressi (es. 10), negativo per toglierne (es. -1).
      </p>

      {error && <p className="movimenti-error">{error}</p>}

      {loading ? (
        <p className="movimenti-hint">Caricamento movimenti…</p>
      ) : movimenti.length === 0 ? (
        <p className="movimenti-hint">Nessun movimento registrato.</p>
      ) : (
        <ul className="movimenti-list">
          {movimenti.map((m) => (
            <li key={m.id}>
              <span className={'movimenti-valore' + (m.variazione < 0 ? ' negativo' : '')}>
                {m.variazione > 0 ? `+${m.variazione}` : m.variazione}
              </span>
              <span className="movimenti-motivo">{m.motivo || '—'}</span>
              <span className="movimenti-data">
                {new Date(m.creato_il).toLocaleDateString('it-IT')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
