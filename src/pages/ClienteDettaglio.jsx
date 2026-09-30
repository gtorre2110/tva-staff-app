import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { leggiBozza, scriviBozza, esisteBozza, dimenticaBozza } from '../lib/useBozza'
import MovimentiCliente from './MovimentiCliente'
import CategorieClienteStato from './CategorieClienteStato'
import DatiEstesiCliente from './DatiEstesiCliente'
import BrevettiCliente from './BrevettiCliente'
import LogbookCliente from './LogbookCliente'
import ConfermaModal from '../components/ConfermaModal'
import FotoCliente from './FotoCliente'
import { certificatoScaduto, certificatoInScadenza, scadenzaIngressiAllenamenti } from '../lib/clienti'
import { useIsAssistente } from '../lib/membroContext'
import './ClienteDettaglio.css'

const VUOTO = {
  nome: '',
  cognome: '',
  telefono: '',
  email: '',
  scadenza_certificato_medico: '',
  ingressi_disponibili: 0,
  prenotazioni_bloccate: false,
  motivo_blocco: '',
  accetta_email: false,
}

export default function ClienteDettaglio() {
  const { id } = useParams()
  const isAssistente = useIsAssistente()
  const nuovo = id === 'nuovo'
  const navigate = useNavigate()
  const bozzaKey = `cliente-${id}`

  const [form, setForm] = useState(() => leggiBozza(bozzaKey) || VUOTO)
  const [bozzaRipristinata] = useState(() => !nuovo && esisteBozza(bozzaKey))
  const [loading, setLoading] = useState(!nuovo)
  const [salvataggio, setSalvataggio] = useState(false)
  const [eliminazione, setEliminazione] = useState(false)
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  const [error, setError] = useState(null)
  const [scadenzaIngressi, setScadenzaIngressi] = useState(null)

  useEffect(() => {
    if (isAssistente) {
      navigate('/clienti', { replace: true })
      return
    }
    if (!nuovo) {
      caricaCliente()
      scadenzaIngressiAllenamenti(supabase, id).then(setScadenzaIngressi)
    }
  }, [id])

  if (isAssistente) return null

  async function caricaCliente() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('clienti')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      setError(fetchError.message)
    } else if (!esisteBozza(bozzaKey)) {
      // Non sovrascriviamo eventuali modifiche non salvate già ripristinate
      setForm({ ...VUOTO, ...data })
    }
    setLoading(false)
  }

  function aggiorna(campo, valore) {
    setForm((prev) => {
      const next = { ...prev, [campo]: valore }
      scriviBozza(bozzaKey, next)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvataggio(true)
    setError(null)

    const payload = {
      nome: (form.nome || '').trim(),
      cognome: (form.cognome || '').trim(),
      telefono: (form.telefono || '').trim() || null,
      email: (form.email || '').trim() || null,
      scadenza_certificato_medico: form.scadenza_certificato_medico || null,
      prenotazioni_bloccate: form.prenotazioni_bloccate,
      accetta_email: form.accetta_email,
      motivo_blocco: form.prenotazioni_bloccate ? (form.motivo_blocco || '').trim() || null : null,
    }

    let opError
    if (nuovo) {
      payload.ingressi_disponibili = Number(form.ingressi_disponibili) || 0
      const { error: insertError } = await supabase.from('clienti').insert(payload)
      opError = insertError
    } else {
      const { error: updateError } = await supabase
        .from('clienti')
        .update(payload)
        .eq('id', id)
      opError = updateError
    }

    setSalvataggio(false)

    if (opError) {
      setError(opError.message)
    } else {
      dimenticaBozza(bozzaKey)
      navigate('/clienti')
    }
  }

  async function handleElimina() {
    setEliminazione(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc('elimina_cliente', { p_cliente_id: id })

    setEliminazione(false)
    setConfermaEliminazione(false)

    if (rpcError) {
      setError(rpcError.message)
    } else {
      dimenticaBozza(bozzaKey)
      navigate('/clienti')
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div className="cliente-dettaglio">
      <Link to="/clienti" className="back-link">
        ← Torna all'elenco
      </Link>

      {!nuovo && (
        <FotoCliente cliente={form} onAggiornata={(url) => aggiorna('foto_url', url)} />
      )}

      <div className="cliente-dettaglio-header">
        <h1>{nuovo ? 'Nuovo cliente' : `${form.cognome} ${form.nome}`}</h1>
        {!nuovo && !isAssistente && (
          <button
            type="button"
            className="btn-secondary btn-elimina"
            onClick={() => setConfermaEliminazione(true)}
          >
            Elimina cliente
          </button>
        )}
      </div>

      {confermaEliminazione && (
        <ConfermaModal
          titolo="Eliminare questo cliente?"
          testo={`Stai eliminando in modo irrecuperabile ${form.nome} ${form.cognome} e tutti i suoi dati collegati (prenotazioni, movimenti ingressi, categorie, dati estesi, brevetti, logbook). Confermi?`}
          confermando={eliminazione}
          onAnnulla={() => setConfermaEliminazione(false)}
          onConferma={handleElimina}
        />
      )}

      {bozzaRipristinata && (
        <p className="avviso-bozza">
          Modifiche non salvate ripristinate automaticamente.
        </p>
      )}

      <form onSubmit={handleSubmit} className="cliente-form">
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="nome">Nome</label>
            <input
              id="nome"
              value={form.nome}
              onChange={(e) => aggiorna('nome', e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="cognome">Cognome</label>
            <input
              id="cognome"
              value={form.cognome}
              onChange={(e) => aggiorna('cognome', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="telefono">Telefono</label>
            <input
              id="telefono"
              value={form.telefono || ''}
              onChange={(e) => aggiorna('telefono', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email || ''}
              onChange={(e) => aggiorna('email', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="scadenza">Scadenza certificato medico</label>
            <input
              id="scadenza"
              type="date"
              className={
                certificatoScaduto(form)
                  ? 'campo-cert-scaduto'
                  : certificatoInScadenza(form)
                  ? 'campo-cert-in-scadenza'
                  : ''
              }
              value={form.scadenza_certificato_medico || ''}
              onChange={(e) => aggiorna('scadenza_certificato_medico', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="ingressi">
              Ingressi disponibili
              {scadenzaIngressi && ` (scadenza: ${new Date(scadenzaIngressi).toLocaleDateString('it-IT')})`}
            </label>
            <input
              id="ingressi"
              type="number"
              value={form.ingressi_disponibili}
              disabled={!nuovo}
              onChange={(e) => aggiorna('ingressi_disponibili', e.target.value)}
            />
            {!nuovo && (
              <span className="field-hint">
                Per modificare il saldo usa "Ingressi" qui sotto, così resta lo storico.
              </span>
            )}
          </div>
        </div>

        <div className="form-field form-field-checkbox">
          <label>
            <input
              type="checkbox"
              checked={form.prenotazioni_bloccate}
              onChange={(e) => aggiorna('prenotazioni_bloccate', e.target.checked)}
            />
            Prenotazioni bloccate
          </label>
        </div>

        <div className="form-field form-field-checkbox">
          <label>
            <input
              type="checkbox"
              checked={form.accetta_email}
              onChange={(e) => aggiorna('accetta_email', e.target.checked)}
            />
            Il cliente accetta di ricevere email (scadenze, saldo, lista d'attesa)
          </label>
        </div>

        {form.prenotazioni_bloccate && (
          <div className="form-field">
            <label htmlFor="motivo">Motivo del blocco</label>
            <input
              id="motivo"
              value={form.motivo_blocco || ''}
              onChange={(e) => aggiorna('motivo_blocco', e.target.value)}
            />
          </div>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={salvataggio}>
            {salvataggio ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </form>

      {!nuovo && (
        <>
          <MovimentiCliente clienteId={id} onSaldoAggiornato={caricaCliente} />
          <CategorieClienteStato clienteId={id} />
          <DatiEstesiCliente clienteId={id} />
          <BrevettiCliente clienteId={id} />
          <LogbookCliente clienteId={id} />
        </>
      )}
    </div>
  )
}
