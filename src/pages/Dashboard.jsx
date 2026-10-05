import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formattaOra } from '../lib/attivita'
import { certificatoScaduto, certificatoInScadenza, formattaData } from '../lib/clienti'
import './Dashboard.css'
import './Cataloghi.css'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function iniziali(nome, cognome) {
  return ((cognome?.[0] || '') + (nome?.[0] || '')).toUpperCase() || '?'
}

export default function Dashboard() {
  const [data, setData] = useState(oggiISO())
  const [occorrenze, setOccorrenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selezionata, setSelezionata] = useState(null)
  const [macrocategorie, setMacrocategorie] = useState([])
  const [macroPerAttivita, setMacroPerAttivita] = useState(new Map())
  const [macroNomiPerAttivita, setMacroNomiPerAttivita] = useState(new Map())
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
    // Tiene aggiornata la scheda selezionata (conteggio posti, ecc.) se ancora presente
    setSelezionata((sel) => (sel ? rows.find((r) => r.id === sel.id) || null : null))

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
      const mappaNomi = new Map()
      for (const riga of collegamenti || []) {
        const macroId = risolviMacro(riga.categoria_id)
        if (!macroId) continue
        if (!mappa.has(riga.attivita_id)) mappa.set(riga.attivita_id, new Set())
        mappa.get(riga.attivita_id).add(macroId)
        if (!mappaNomi.has(riga.attivita_id)) {
          mappaNomi.set(riga.attivita_id, categoriePerId.get(macroId)?.nome || '')
        }
      }
      setMacroPerAttivita(mappa)
      setMacroNomiPerAttivita(mappaNomi)
      setMacrocategorie((categorie || []).filter((c) => !c.categoria_padre_id).sort((a, b) => a.nome.localeCompare(b.nome)))
    } else {
      setMacroPerAttivita(new Map())
      setMacroNomiPerAttivita(new Map())
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

  if (selezionata) {
    return (
      <CheckInAttivita
        occorrenza={selezionata}
        macroNome={macroNomiPerAttivita.get(selezionata.id)}
        onCambia={() => setSelezionata(null)}
        onAggiornato={caricaOccorrenze}
      />
    )
  }

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
    </div>
  )
}

function CheckInAttivita({ occorrenza, macroNome, onCambia, onAggiornato }) {
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
      .select('*, clienti(nome, cognome, ingressi_disponibili, scadenza_certificato_medico, prenotazioni_bloccate, motivo_blocco)')
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

  function checkInConEventualeConferma(p, warn) {
    if (!p.presente && warn) {
      if (!confirm(`${warn}.\n\nVuoi registrare comunque la presenza?`)) return
    }
    toggleCheckIn(p)
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
    else {
      carica()
      onAggiornato()
    }
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

  const confermate = prenotazioni.filter((p) => p.stato === 'confermata')
  const altre = prenotazioni.filter((p) => p.stato !== 'confermata')
  const presenti = confermate.filter((p) => p.presente).length
  const pct = confermate.length > 0 ? Math.round((presenti / confermate.length) * 100) : 0

  return (
    <div className="dashboard-page">
      <div className="checkin-topbar">
        <div className="checkin-topbar-info">
          <div className="checkin-topbar-kicker">
            {[macroNome, formattaOra(occorrenza.ora_inizio)].filter(Boolean).join(' · ').toUpperCase()}
          </div>
          <div className="checkin-topbar-titolo">{occorrenza.nome}</div>
        </div>
        <button className="btn-secondary" onClick={onCambia}>Cambia attività</button>
      </div>

      <div className="checkin-progresso">
        <div className="checkin-barra">
          <div className="checkin-barra-riempita" style={{ width: pct + '%' }} />
        </div>
        <div className="checkin-progresso-label">
          <strong>{presenti}</strong> presenti su {confermate.length} prenotati
        </div>
      </div>

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
      ) : confermate.length === 0 ? (
        <p className="modelli-hint">Nessuna prenotazione confermata.</p>
      ) : (
        <div className="checkin-persone">
          {confermate.map((p) => {
            const cl = p.clienti || {}
            const scaduto = certificatoScaduto(cl)
            const inScadenza = certificatoInScadenza(cl)
            const bloccatoCert = scaduto
            const bloccatoStaff = !!cl.prenotazioni_bloccate
            const bloccato = bloccatoCert || bloccatoStaff

            let warn = null
            if (bloccatoStaff) warn = 'Prenotazioni bloccate dallo staff' + (cl.motivo_blocco ? `: ${cl.motivo_blocco}` : '')
            else if (scaduto) warn = `Certificato scaduto il ${formattaData(cl.scadenza_certificato_medico)}`
            else if (inScadenza) warn = `Certificato scade il ${formattaData(cl.scadenza_certificato_medico)}`
            else if (!p.presente && cl.ingressi_disponibili === 1) warn = 'Ultimo ingresso disponibile'
            else if (p.presente && cl.ingressi_disponibili <= 0) warn = 'Ingressi esauriti'

            return (
              <article className={'checkin-persona-card' + (p.presente ? ' presente' : '')} key={p.id}>
                <div className="checkin-persona-avatar">{iniziali(cl.nome, cl.cognome)}</div>
                <div className="checkin-persona-info">
                  <div className="checkin-persona-nome">{cl.cognome} {cl.nome}</div>
                  <div className="checkin-persona-saldo">Ingressi disponibili: {cl.ingressi_disponibili ?? '—'}</div>
                  {p.tardiva && <div className="checkin-persona-warn alert">Prenotazione TARDIVA (dopo la chiusura) — da verificare</div>}
                  {warn && <div className={'checkin-persona-warn' + (bloccato ? ' alert' : '')}>{warn}</div>}
                </div>
                <button
                  className={'checkin-persona-btn' + (p.presente ? ' presente' : '') + (bloccato && !p.presente ? ' bloccato' : '')}
                  onClick={() => checkInConEventualeConferma(p, warn)}
                >
                  {bloccato && !p.presente ? 'Check-in (bloccato)' : p.presente ? 'Presente ✓' : 'Check-in'}
                </button>
              </article>
            )
          })}
        </div>
      )}

      {altre.length > 0 && (
        <details className="checkin-altre">
          <summary>Altre prenotazioni ({altre.length})</summary>
          <ul className="prenotazioni-list">
            {altre.map((p) => (
              <li key={p.id} className={p.stato === 'annullata' ? 'annullata' : ''}>
                <span className="prenotazione-nome">{p.cognome} {p.nome}{p.tardiva ? ' · TARDIVA' : ''}</span>
                <span className={'badge badge-stato-' + p.stato.replace(/\s+/g, '_')}>
                  {p.stato === 'in_coda' ? 'In lista d\'attesa' : p.stato}
                </span>
                {p.stato !== 'annullata' ? (
                  <button className="btn-secondary" onClick={() => cambiaStato(p, 'annullata')}>
                    Annulla
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => cambiaStato(p, 'confermata')}>
                    Riattiva
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
