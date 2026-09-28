import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { certificatoScaduto, certificatoInScadenza, formattaData } from '../lib/clienti'
import { useIsAssistente } from '../lib/membroContext'
import './Clienti.css'

export default function Clienti() {
  const isAssistente = useIsAssistente()
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ricerca, setRicerca] = useState('')

  useEffect(() => {
    caricaClienti()
  }, [])

  async function caricaClienti() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('clienti')
      .select('*')
      .order('cognome', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setClienti(data)
    }
    setLoading(false)
  }

  const clientiFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase()
    if (!q) return clienti
    return clienti.filter((c) =>
      `${c.nome} ${c.cognome}`.toLowerCase().includes(q)
    )
  }, [clienti, ricerca])

  return (
    <div className="clienti-page">
      <div className="clienti-header">
        <div>
          <h1>Clienti</h1>
          <p className="clienti-count">
            {loading ? 'Caricamento…' : `${clientiFiltrati.length} di ${clienti.length}`}
          </p>
        </div>
        {!isAssistente && (
          <Link to="nuovo" className="btn-primary">
            + Nuovo cliente
          </Link>
        )}
      </div>

      <input
        type="search"
        className="clienti-search"
        placeholder="Cerca per nome o cognome…"
        value={ricerca}
        onChange={(e) => setRicerca(e.target.value)}
      />

      {error && <p className="clienti-error">Errore nel caricamento: {error}</p>}

      {!loading && clientiFiltrati.length === 0 && !error && (
        <p className="clienti-empty">Nessun cliente trovato.</p>
      )}

      <div className="clienti-grid">
        {clientiFiltrati.map((cliente) => {
          const scaduto = certificatoScaduto(cliente)
          const inScadenza = certificatoInScadenza(cliente)
          const CardTag = isAssistente ? 'div' : Link
          const cardProps = isAssistente ? {} : { to: String(cliente.id) }

          return (
            <CardTag key={cliente.id} className="cliente-card" {...cardProps}>
              <div className="cliente-card-top">
                <h2>
                  {cliente.cognome} {cliente.nome}
                </h2>
                {cliente.prenotazioni_bloccate && (
                  <span className="badge badge-alert">Bloccato</span>
                )}
              </div>

              <div className="cliente-card-row">
                <span className="cliente-card-label">Ingressi</span>
                <span
                  className={
                    'cliente-card-value' +
                    (cliente.ingressi_disponibili < 0 ? ' value-alert' : '')
                  }
                >
                  {cliente.ingressi_disponibili}
                </span>
              </div>

              <div className="cliente-card-row">
                <span className="cliente-card-label">Certificato</span>
                <span
                  className={
                    'cliente-card-value cert-pill' +
                    (scaduto ? ' cert-scaduto' : inScadenza ? ' cert-in-scadenza' : '')
                  }
                >
                  {formattaData(cliente.scadenza_certificato_medico)}
                  {scaduto && ' · scaduto'}
                  {!scaduto && inScadenza && ' · in scadenza'}
                </span>
              </div>

              {(cliente.telefono || cliente.email) && (
                <div className="cliente-card-contact">
                  {cliente.telefono && <span>{cliente.telefono}</span>}
                  {cliente.email && <span>{cliente.email}</span>}
                </div>
              )}
            </CardTag>
          )
        })}
      </div>
    </div>
  )
}
