import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formattaOra } from '../lib/attivita'
import './Dashboard.css'
import './Cataloghi.css'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Dashboard() {
  const [data, setData] = useState(oggiISO())
  const [occorrenze, setOccorrenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selezionata, setSelezionata] = useState(null)
  const [macrocategorie, setMacrocategorie] = useState([])
  const [macroPerAttivita, setMacroPerAttivita] = useState(new Map())
  const [schedaMacro, setSchedaMacro] = useState('tutte')

  useEffect(() => {
    caricaOccorrenze()
    setSelezionata(null)
    setSchedaMacro('tutte')
  }, [data])

  async function caricaOccorrenze() {
    setLoading(true)
    setError(null)
    const { data: rows, error: fetchError } = await supabase
      .from('attivita')
      .select('*, prenotazioni(id, stato)')
      .eq('data', data)
      .order('ora_inizio', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }
    setOccorrenze(rows)

    if (rows.length > 0) {
      const [{ data: categorie }, { data: collegamenti }] = await Promise.all([
        supabase.from('categorie').select('*'),
        supabase.from('attivita_categorie').select('attivita_id, categoria_id').in('attivita_id', rows.map((r) => r.id)),
      ])

      const categoriePerId = new Map((categorie || []).map((c) => [c.id, c]))
      const risolviMacro = (categoriaId) => {
        const c = categoriePerId.get(categoriaId)
        if (!c) return null
        return c.categoria_padre_id || c.id
      }

      const mappa = new Map()
      for (const riga of collegamenti || []) {
        const macroId = risolviMacro(riga.categoria_id)
        if (!macroId) continue
        if (!mappa.has(riga.attivita_id)) mappa.set(riga.attivita_id, new Set())
        mappa.get(riga.attivita_id).add(macroId)
      }
      setMacroPerAttivita(mappa)
      setMacrocategorie((categorie || []).filter((c) => !c.categoria_padre_id).sort((a, b) => a.nome.localeCompare(b.nome)))
    } else {
      setMacroPerAttivita(new Map())
    }

    setLoading(false)
  }

  function postiOccupati(occorrenza) {
    return occorrenza.prenotazioni.filter((p) => p.stato === 'confermata').length
  }

  const occorrenzeFiltrate = occorrenze.filter((o) => {
    if (schedaMacro === 'tutte') return true
    const macroSet = macroPerAttivita.get(o.id)
    if (schedaMacro === 'senza-categoria') return !macroSet || macroSet.size === 0
    return macroSet && macroSet.has(schedaMacro)
  })

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Check-in</h1>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="dashboard-date"
        />
      </div>

      {error && <p className="modelli-error">Errore: {error}</p>}
      {loading && <p className="modelli-hint">Caricamento…</p>}

      {!loading && occorrenze.length > 0 && (
        <div className="cataloghi-tabs">
          <button
            className={'cataloghi-tab' + (schedaMacro === 'tutte' ? ' active' : '')}
            onClick={() => setSchedaMacro('tutte')}
          >
            Tutte
          </button>
          {macrocategorie.map((m) => (
            <button
              key={m.id}
              className={'cataloghi-tab' + (schedaMacro === m.id ? ' active' : '')}
              onClick={() => setSchedaMacro(m.id)}
            >
              {m.nome}
            </button>
          ))}
          <button
            className={'cataloghi-tab' + (schedaMacro === 'senza-categoria' ? ' active' : '')}
            onClick={() => setSchedaMacro('senza-categoria')}
          >
            Senza categoria
          </button>
        </div>
      )}

      {!loading && occorrenze.length === 0 && (
        <p className="modelli-hint">Nessuna attività in questa data.</p>
      )}
      {!loading && occorrenze.length > 0 && occorrenzeFiltrate.length === 0 && (
        <p className="modelli-hint">Nessuna attività in questa categoria.</p>
      )}

      <div className="dashboard-list">
        {occorrenzeFiltrate.map((o) => (
          <button
            key={o.id}
            className={'dashboard-item' + (o.annullata ? ' annullata' : '')}
            onClick={() => setSelezionata(o)}
          >
            <span className="dashboard-item-ora">
              {formattaOra(o.ora_inizio)}–{formattaOra(o.ora_fine)}
            </span>
            <span className="dashboard-item-nome">
              {o.nome}
              {o.annullata && <span className="badge badge-alert">Annullata</span>}
            </span>
            <span className="dashboard-item-posti">
              {postiOccupati(o)} / {o.posti_massimi} posti
            </span>
          </button>
        ))}
      </div>

      {selezionata && (
        <GestionePrenotazioni
          occorrenza={selezionata}
          onChiudi={() => setSelezionata(null)}
          onAggiornato={caricaOccorrenze}
        />
      )}
    </div>
  )
}

function GestionePrenotazioni({ occorrenza, onChiudi, onAggiornato }) {
  const [prenotazioni, setPrenotazioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [ricerca, setRicerca] = useState('')
  const [risultati, setRisultati] = useState([])
  const [cercando, setCercando] = useState(false)

  useEffect(() => {
    carica()
  }, [occorrenza.id])

  useEffect(() => {
    const q = ricerca.trim()
    if (q.length < 2) {
      setRisultati([])
      return
    }
    const timeout = setTimeout(() => cercaClienti(q), 250)
    return () => clearTimeout(timeout)
  }, [ricerca])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data: rows, error: fetchError } = await supabase
      .from('prenotazioni')
      .select('*')
      .eq('attivita_id', occorrenza.id)
      .order('creato_il', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else setPrenotazioni(rows)
    setLoading(false)
  }

  async function cercaClienti(q) {
    setCercando(true)
    const { data: rows } = await supabase
      .from('clienti')
      .select('id, nome, cognome, prenotazioni_bloccate')
      .or(`nome.ilike.%${q}%,cognome.ilike.%${q}%`)
      .limit(6)
    setRisultati(rows || [])
    setCercando(false)
  }

  async function aggiungiPrenotazione(cliente) {
    const { error: insertError } = await supabase.from('prenotazioni').insert({
      attivita_id: occorrenza.id,
      cliente_id: cliente.id,
      nome: cliente.nome,
      cognome: cliente.cognome,
      stato: 'confermata',
    })

    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'Questo cliente ha già una prenotazione confermata per questa attività.'
          : insertError.message
      )
    } else {
      setRicerca('')
      setRisultati([])
      carica()
      onAggiornato()
    }
  }

  async function toggleCheckIn(p) {
    const nuovoPresente = !p.presente
    const { error: updateError } = await supabase
      .from('prenotazioni')
      .update({
        presente: nuovoPresente,
        presenza_registrata_il: nuovoPresente ? new Date().toISOString() : null,
      })
      .eq('id', p.id)

    if (updateError) setError(updateError.message)
    else carica()
  }

  async function cambiaStato(p, nuovoStato) {
    const { error: updateError } = await supabase
      .from('prenotazioni')
      .update({ stato: nuovoStato })
      .eq('id', p.id)

    if (updateError) setError(updateError.message)
    else {
      carica()
      onAggiornato()
    }
  }

  return (
    <div className="modale-overlay" onClick={onChiudi}>
      <div className="modale modale-larga" onClick={(e) => e.stopPropagation()}>
        <h2>
          {occorrenza.nome} · {formattaOra(occorrenza.ora_inizio)}
        </h2>

        <div className="dashboard-ricerca">
          <input
            type="text"
            placeholder="Cerca cliente per nome o cognome da aggiungere…"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
          {cercando && <p className="modelli-hint">Cerco…</p>}
          {risultati.length > 0 && (
            <ul className="dashboard-risultati">
              {risultati.map((c) => (
                <li key={c.id}>
                  <span>
                    {c.cognome} {c.nome}
                    {c.prenotazioni_bloccate && (
                      <span className="badge badge-alert">Bloccato</span>
                    )}
                  </span>
                  <button className="btn-secondary" onClick={() => aggiungiPrenotazione(c)}>
                    Aggiungi
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="modelli-error">{error}</p>}
        {loading ? (
          <p className="modelli-hint">Caricamento…</p>
        ) : prenotazioni.length === 0 ? (
          <p className="modelli-hint">Nessuna prenotazione.</p>
        ) : (
          <ul className="prenotazioni-list">
            {prenotazioni.map((p) => (
              <li key={p.id} className={p.stato === 'annullata' ? 'annullata' : ''}>
                <label className="prenotazione-checkin">
                  <input
                    type="checkbox"
                    checked={p.presente}
                    disabled={p.stato !== 'confermata'}
                    onChange={() => toggleCheckIn(p)}
                  />
                </label>
                <span className="prenotazione-nome">
                  {p.cognome} {p.nome}
                </span>
                <span className={'badge badge-stato-' + p.stato.replace(/\s+/g, '_')}>
                  {p.stato === 'in_coda' ? 'In lista d\'attesa' : p.stato}
                </span>
                {p.stato !== 'annullata' ? (
                  <button
                    className="btn-secondary"
                    onClick={() => cambiaStato(p, 'annullata')}
                  >
                    Annulla
                  </button>
                ) : (
                  <button
                    className="btn-secondary"
                    onClick={() => cambiaStato(p, 'confermata')}
                  >
                    Riattiva
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="form-actions">
          <button className="btn-secondary" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
