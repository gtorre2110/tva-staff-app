import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formattaDataOra } from '../lib/attivita'
import './Cataloghi.css'
import './LogModifiche.css'

const PAGINA = 50

const TABELLE_LABEL = {
  clienti: 'Clienti',
  clienti_dati_estesi: 'Clienti — dati estesi',
  clienti_movimenti: 'Clienti — movimenti ingressi',
  clienti_categorie: 'Clienti — categorie',
  brevetti: 'Brevetti',
  logbook: 'Logbook',
  attivita_modello: 'Modelli',
  attivita_modello_categorie: 'Modelli — categorie',
  attivita: 'Attività',
  attivita_categorie: 'Attività — categorie',
  categorie: 'Categorie',
  tipi_brevetto: 'Cataloghi — tipi di brevetto',
  istruttori: 'Cataloghi — istruttori',
  localita_immersione: 'Cataloghi — località di immersione',
  centri_immersione: 'Cataloghi — centri di immersione',
  codici_invito: 'Codici invito',
  codici_invito_categorie: 'Codici invito — categorie',
  prenotazioni: 'Check-in / prenotazioni',
  membri_staff: 'Staff',
}

const OPERAZIONE_LABEL = {
  INSERT: 'Creazione',
  UPDATE: 'Modifica',
  DELETE: 'Eliminazione',
}

function etichettaTabella(t) {
  return TABELLE_LABEL[t] || t
}

function descriviRiga(r) {
  if (r.operazione === 'INSERT') return 'Nuovo elemento creato'
  if (r.operazione === 'DELETE') return 'Elemento eliminato'
  if (r.campi_modificati) return `Campi modificati: ${r.campi_modificati}`
  return 'Modifica registrata'
}

export default function LogModifiche() {
  const [righe, setRighe] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [altrePagine, setAltrePagine] = useState(true)
  const [espansa, setEspansa] = useState(null)

  const [filtroTabella, setFiltroTabella] = useState('')
  const [filtroOperazione, setFiltroOperazione] = useState('')
  const [filtroDa, setFiltroDa] = useState('')
  const [filtroA, setFiltroA] = useState('')

  useEffect(() => {
    carica(true)
  }, [filtroTabella, filtroOperazione, filtroDa, filtroA])

  function applicaFiltri(query) {
    if (filtroTabella) query = query.eq('tabella', filtroTabella)
    if (filtroOperazione) query = query.eq('operazione', filtroOperazione)
    if (filtroDa) query = query.gte('creato_il', `${filtroDa}T00:00:00`)
    if (filtroA) query = query.lte('creato_il', `${filtroA}T23:59:59`)
    return query
  }

  async function carica(daCapo) {
    setLoading(true)
    setError(null)

    const partenza = daCapo ? 0 : righe.length
    let query = supabase
      .from('log_modifiche')
      .select('*')
      .order('creato_il', { ascending: false })
      .range(partenza, partenza + PAGINA - 1)

    query = applicaFiltri(query)

    const { data, error: fetchError } = await query
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setRighe(daCapo ? data || [] : [...righe, ...(data || [])])
      setAltrePagine((data || []).length === PAGINA)
    }
    setLoading(false)
  }

  return (
    <div className="cataloghi-page log-page">
      <h1>Log delle modifiche</h1>
      <p className="categorie-sub">
        Cronologia di tutte le modifiche fatte da staff e amministratori sulle sezioni principali
        dell'app. Visibile solo agli amministratori.
      </p>

      <div className="log-filtri">
        <div className="form-field">
          <label>Sezione</label>
          <select value={filtroTabella} onChange={(e) => setFiltroTabella(e.target.value)}>
            <option value="">Tutte</option>
            {Object.entries(TABELLE_LABEL).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>
                {etichetta}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Tipo di modifica</label>
          <select value={filtroOperazione} onChange={(e) => setFiltroOperazione(e.target.value)}>
            <option value="">Tutte</option>
            <option value="INSERT">Creazione</option>
            <option value="UPDATE">Modifica</option>
            <option value="DELETE">Eliminazione</option>
          </select>
        </div>
        <div className="form-field">
          <label>Dal</label>
          <input type="date" value={filtroDa} onChange={(e) => setFiltroDa(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Al</label>
          <input type="date" value={filtroA} onChange={(e) => setFiltroA(e.target.value)} />
        </div>
      </div>

      {error && <p className="modelli-error">{error}</p>}
      {loading && righe.length === 0 && <p className="modelli-hint">Caricamento…</p>}
      {!loading && righe.length === 0 && <p className="modelli-hint">Nessuna modifica trovata.</p>}

      <ul className="catalogo-list log-list">
        {righe.map((r) => (
          <li key={r.id} className="log-riga" onClick={() => setEspansa(espansa === r.id ? null : r.id)}>
            <div className="log-riga-sommario">
              <span className={`log-badge log-badge-${r.operazione}`}>{OPERAZIONE_LABEL[r.operazione] || r.operazione}</span>
              <span className="log-tabella">{etichettaTabella(r.tabella)}</span>
              <span className="log-descrizione">{descriviRiga(r)}</span>
              <span className="log-meta">
                {r.utente_nome || 'Utente sconosciuto'} · {formattaDataOra(r.creato_il)}
              </span>
            </div>
            {espansa === r.id && (
              <div className="log-dettaglio">
                {r.dati_prima && (
                  <div>
                    <h3>Prima</h3>
                    <pre>{JSON.stringify(r.dati_prima, null, 2)}</pre>
                  </div>
                )}
                {r.dati_dopo && (
                  <div>
                    <h3>Dopo</h3>
                    <pre>{JSON.stringify(r.dati_dopo, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {!loading && altrePagine && righe.length > 0 && (
        <div className="log-carica-altre">
          <button className="btn-secondary" onClick={() => carica(false)}>
            Carica altre
          </button>
        </div>
      )}
    </div>
  )
}
