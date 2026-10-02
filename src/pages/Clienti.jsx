import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import {
  certificatoScaduto,
  certificatoInScadenza,
  scadenzaPassata,
  scadenzaInArrivo,
  formattaData,
} from '../lib/clienti'
import { useIsAssistente } from '../lib/membroContext'
import './Clienti.css'
import './Cataloghi.css'
import './CategorieClienteStato.css'

export default function Clienti() {
  const isAssistente = useIsAssistente()
  const [clienti, setClienti] = useState([])
  const [categorie, setCategorie] = useState([])
  const [collegamenti, setCollegamenti] = useState([]) // [{cliente_id, categoria_id, confermata}]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ricerca, setRicerca] = useState('')
  const [schedaCategoria, setSchedaCategoria] = useState('tutti')
  const [sottocategoria, setSottocategoria] = useState('tutte')

  useEffect(() => {
    caricaClienti()
  }, [])

  async function caricaClienti() {
    setLoading(true)
    setError(null)
    const [{ data, error: fetchError }, { data: categorieData }, { data: collegamentiData }] =
      await Promise.all([
        supabase.from('clienti').select('*').order('cognome', { ascending: true }),
        supabase.from('categorie').select('*').order('nome'),
        supabase.from('clienti_categorie').select('cliente_id, categoria_id, confermata'),
      ])

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setClienti(data)
      setCategorie(categorieData || [])
      setCollegamenti(collegamentiData || [])
    }
    setLoading(false)
  }

  const macrocategorie = useMemo(
    () => categorie.filter((c) => !c.categoria_padre_id).sort((a, b) => a.nome.localeCompare(b.nome)),
    [categorie]
  )

  const categoriePerId = useMemo(() => new Map(categorie.map((c) => [c.id, c])), [categorie])

  function macroDi(categoriaId) {
    const c = categoriePerId.get(categoriaId)
    if (!c) return null
    return c.categoria_padre_id || c.id
  }

  // Per ogni cliente: categorie confermate (risolte anche a livello di macro
  // per i tab) e richieste in attesa di conferma.
  const datiPerCliente = useMemo(() => {
    const mappa = new Map()
    for (const riga of collegamenti) {
      if (!mappa.has(riga.cliente_id)) {
        mappa.set(riga.cliente_id, { confermate: [], macroConfermate: new Set(), richieste: [] })
      }
      const voce = mappa.get(riga.cliente_id)
      if (riga.confermata) {
        voce.confermate.push(riga.categoria_id)
        const macro = macroDi(riga.categoria_id)
        if (macro) voce.macroConfermate.add(macro)
      } else {
        voce.richieste.push(riga.categoria_id)
      }
    }
    return mappa
  }, [collegamenti, categoriePerId])

  function datiCliente(clienteId) {
    return datiPerCliente.get(clienteId) || { confermate: [], macroConfermate: new Set(), richieste: [] }
  }

  const figlieSchedaAttiva = useMemo(() => {
    if (schedaCategoria === 'tutti' || schedaCategoria === 'da-confermare' || schedaCategoria === 'senza-categoria') {
      return []
    }
    return categorie.filter((c) => c.categoria_padre_id === schedaCategoria)
  }, [categorie, schedaCategoria])

  useEffect(() => {
    setSottocategoria('tutte')
  }, [schedaCategoria])

  const clientiPerScheda = useMemo(() => {
    return clienti.filter((c) => {
      const dati = datiCliente(c.id)
      if (schedaCategoria === 'tutti') return true
      if (schedaCategoria === 'da-confermare') return dati.richieste.length > 0
      if (schedaCategoria === 'senza-categoria') return dati.confermate.length === 0 && dati.richieste.length === 0
      // tab di una macrocategoria
      if (sottocategoria === 'tutte') return dati.macroConfermate.has(schedaCategoria)
      return dati.confermate.includes(sottocategoria)
    })
  }, [clienti, datiPerCliente, schedaCategoria, sottocategoria])

  const clientiFiltrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase()
    if (!q) return clientiPerScheda
    return clientiPerScheda.filter((c) =>
      `${c.nome} ${c.cognome}`.toLowerCase().includes(q)
    )
  }, [clientiPerScheda, ricerca])

  const conteggi = useMemo(() => {
    const c = {
      tutti: clienti.length,
      'da-confermare': 0,
      'senza-categoria': 0,
    }
    for (const cliente of clienti) {
      const dati = datiCliente(cliente.id)
      if (dati.richieste.length > 0) c['da-confermare']++
      else if (dati.confermate.length === 0) c['senza-categoria']++
    }
    for (const m of macrocategorie) {
      c[m.id] = clienti.filter((cl) => datiCliente(cl.id).macroConfermate.has(m.id)).length
    }
    return c
  }, [clienti, datiPerCliente, macrocategorie])

  async function confermaRichiesta(clienteId, categoriaId) {
    setError(null)
    const { error: opError } = await supabase
      .from('clienti_categorie')
      .update({ confermata: true })
      .eq('cliente_id', clienteId)
      .eq('categoria_id', categoriaId)
    if (opError) setError(opError.message)
    else caricaClienti()
  }

  async function rifiutaRichiesta(clienteId, categoriaId) {
    setError(null)
    const { error: opError } = await supabase
      .from('clienti_categorie')
      .delete()
      .eq('cliente_id', clienteId)
      .eq('categoria_id', categoriaId)
    if (opError) setError(opError.message)
    else caricaClienti()
  }

  return (
    <div className="clienti-page">
      <div className="clienti-header">
        <div>
          <h1>Clienti</h1>
          <p className="clienti-count">
            {loading ? 'Caricamento…' : `${clientiFiltrati.length} di ${clientiPerScheda.length}`}
          </p>
        </div>
        {!isAssistente && (
          <Link to="nuovo" className="btn-primary">
            + Nuovo cliente
          </Link>
        )}
      </div>

      <div className="cataloghi-tabs">
        <button
          className={'cataloghi-tab' + (schedaCategoria === 'tutti' ? ' active' : '')}
          onClick={() => setSchedaCategoria('tutti')}
        >
          Tutti ({conteggi.tutti ?? 0})
        </button>
        <button
          className={'cataloghi-tab' + (schedaCategoria === 'da-confermare' ? ' active' : '')}
          onClick={() => setSchedaCategoria('da-confermare')}
        >
          Da confermare ({conteggi['da-confermare'] ?? 0})
        </button>
        <button
          className={'cataloghi-tab' + (schedaCategoria === 'senza-categoria' ? ' active' : '')}
          onClick={() => setSchedaCategoria('senza-categoria')}
        >
          Senza categoria ({conteggi['senza-categoria'] ?? 0})
        </button>
        {macrocategorie.map((m) => (
          <button
            key={m.id}
            className={'cataloghi-tab' + (schedaCategoria === m.id ? ' active' : '')}
            onClick={() => setSchedaCategoria(m.id)}
          >
            {m.nome} ({conteggi[m.id] ?? 0})
          </button>
        ))}
      </div>

      {figlieSchedaAttiva.length > 0 && (
        <div className="clienti-sottocategorie">
          <button
            className={'chip-filtro' + (sottocategoria === 'tutte' ? ' active' : '')}
            onClick={() => setSottocategoria('tutte')}
          >
            Tutte
          </button>
          {figlieSchedaAttiva.map((f) => (
            <button
              key={f.id}
              className={'chip-filtro' + (sottocategoria === f.id ? ' active' : '')}
              onClick={() => setSottocategoria(f.id)}
            >
              {f.nome}
            </button>
          ))}
        </div>
      )}

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
          const dati = datiCliente(cliente.id)

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

              {cliente.dan_scadenza && (
                <div className="cliente-card-row">
                  <span className="cliente-card-label">DAN</span>
                  <span
                    className={
                      'cliente-card-value cert-pill' +
                      (scadenzaPassata(cliente.dan_scadenza)
                        ? ' cert-scaduto'
                        : scadenzaInArrivo(cliente.dan_scadenza)
                        ? ' cert-in-scadenza'
                        : '')
                    }
                  >
                    {formattaData(cliente.dan_scadenza)}
                    {scadenzaPassata(cliente.dan_scadenza) && ' · scaduto'}
                    {!scadenzaPassata(cliente.dan_scadenza) &&
                      scadenzaInArrivo(cliente.dan_scadenza) &&
                      ' · in scadenza'}
                  </span>
                </div>
              )}

              {cliente.fipsas_scadenza && (
                <div className="cliente-card-row">
                  <span className="cliente-card-label">FIPSAS</span>
                  <span
                    className={
                      'cliente-card-value cert-pill' +
                      (scadenzaPassata(cliente.fipsas_scadenza)
                        ? ' cert-scaduto'
                        : scadenzaInArrivo(cliente.fipsas_scadenza)
                        ? ' cert-in-scadenza'
                        : '')
                    }
                  >
                    {formattaData(cliente.fipsas_scadenza)}
                    {scadenzaPassata(cliente.fipsas_scadenza) && ' · scaduto'}
                    {!scadenzaPassata(cliente.fipsas_scadenza) &&
                      scadenzaInArrivo(cliente.fipsas_scadenza) &&
                      ' · in scadenza'}
                  </span>
                </div>
              )}

              {(dati.confermate.length > 0 || dati.richieste.length > 0) && (
                <div className="categorie-cliente-chips">
                  {dati.confermate.map((categoriaId) => {
                    const cat = categoriePerId.get(categoriaId)
                    if (!cat) return null
                    return (
                      <span key={categoriaId} className="chip-stato chip-stato-confermata">
                        <span className="chip-stato-nome">{cat.nome}</span>
                      </span>
                    )
                  })}
                  {dati.richieste.map((categoriaId) => {
                    const cat = categoriePerId.get(categoriaId)
                    if (!cat) return null
                    return (
                      <span key={categoriaId} className="chip-stato chip-stato-richiesta">
                        <span className="chip-stato-nome">{cat.nome}</span>
                        {!isAssistente && (
                          <>
                            <button
                              type="button"
                              className="chip-stato-azione"
                              title="Conferma"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                confermaRichiesta(cliente.id, categoriaId)
                              }}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="chip-stato-azione"
                              title="Rifiuta"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                rifiutaRichiesta(cliente.id, categoriaId)
                              }}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </span>
                    )
                  })}
                </div>
              )}

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
