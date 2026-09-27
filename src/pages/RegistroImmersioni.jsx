import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { scaricaCSV } from '../lib/csv'
import BottoneDrive from '../components/BottoneDrive'
import { formattaData, formattaOra } from '../lib/attivita'
import './Cataloghi.css'
import './RegistroImmersioni.css'

const SCHEDE = [
  { id: 'post', label: 'Post-evento (dai logbook)' },
  { id: 'pre', label: 'Pre-evento (dalle prenotazioni)' },
]

export default function RegistroImmersioni() {
  const [scheda, setScheda] = useState('post')

  return (
    <div className="cataloghi-page">
      <h1>Registro immersioni</h1>
      <p className="categorie-sub">
        Due viste pensate per gli adempimenti della Legge 70/2006: il registro post-evento
        raggruppa le voci di logbook per uscita; quello pre-evento mostra chi è iscritto a
        un'attività e il suo brevetto più alto.
      </p>

      <div className="cataloghi-tabs">
        {SCHEDE.map((s) => (
          <button
            key={s.id}
            className={'cataloghi-tab' + (scheda === s.id ? ' active' : '')}
            onClick={() => setScheda(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {scheda === 'post' && <RegistroPostEvento />}
      {scheda === 'pre' && <RegistroPreEvento />}
    </div>
  )
}

function RegistroPostEvento() {
  const [righe, setRighe] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    carica()
  }, [])

  async function carica() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('registro_immersioni')
      .select('*')
      .order('data', { ascending: false })
    if (fetchError) setError(fetchError.message)
    else setRighe(data || [])
    setLoading(false)
  }

  const colonneCSV = [
    { chiave: 'data', etichetta: 'Data' },
    { chiave: 'ora_inizio', etichetta: 'Orario inizio' },
    { chiave: 'ora_fine', etichetta: 'Orario fine' },
    { chiave: 'localita', etichetta: 'Località' },
    { chiave: 'centro_immersione', etichetta: 'Centro di immersione' },
    { chiave: 'istruttore', etichetta: 'Istruttore' },
    { chiave: 'partecipanti', etichetta: 'Partecipanti' },
    { chiave: 'brevetti', etichetta: 'Brevetti' },
    { chiave: 'profondita_massima_raggiunta', etichetta: 'Profondità massima raggiunta (m)' },
    { chiave: 'autorespiratori', etichetta: 'Autorespiratore/i' },
    { chiave: 'miscele', etichetta: 'Miscela/e' },
  ]

  function esporta() {
    scaricaCSV('registro-immersioni-post-evento.csv', colonneCSV, righe)
  }

  return (
    <div>
      <div className="catalogo-sezione-header">
        <div />
        <span className="catalogo-azioni">
          <button className="btn-primary" onClick={esporta} disabled={righe.length === 0}>
            Esporta CSV
          </button>
          <BottoneDrive
            nomeFile="registro-immersioni-post-evento.csv"
            colonne={colonneCSV}
            righe={righe}
            disabled={righe.length === 0}
          />
        </span>
      </div>

      {error && <p className="modelli-error">{error}</p>}
      {loading && <p className="modelli-hint">Caricamento…</p>}
      {!loading && righe.length === 0 && <p className="modelli-hint">Nessuna uscita registrata ancora.</p>}

      <div className="registro-tabella">
        {righe.map((r, i) => (
          <div className="registro-riga" key={i}>
            <div className="registro-riga-data">
              <strong>{formattaData(r.data)}</strong>
              <span>{formattaOra(r.ora_inizio)}–{formattaOra(r.ora_fine)}</span>
            </div>
            <div className="registro-riga-dettagli">
              <p><strong>Partecipanti:</strong> {r.partecipanti || '—'}</p>
              {r.localita && <p><strong>Località:</strong> {r.localita}</p>}
              {r.centro_immersione && <p><strong>Centro:</strong> {r.centro_immersione}</p>}
              {r.istruttore && <p><strong>Istruttore:</strong> {r.istruttore}</p>}
              {r.brevetti && <p><strong>Brevetti:</strong> {r.brevetti}</p>}
              {r.profondita_massima_raggiunta && <p><strong>Profondità massima:</strong> {r.profondita_massima_raggiunta} m</p>}
              {(r.autorespiratori || r.miscele) && (
                <p>
                  {r.autorespiratori && <><strong>Autorespiratore:</strong> {r.autorespiratori} </>}
                  {r.miscele && <><strong>Miscela:</strong> {r.miscele}</>}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RegistroPreEvento() {
  const [occorrenze, setOccorrenze] = useState([])
  const [selezionata, setSelezionata] = useState('')
  const [iscritti, setIscritti] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingIscritti, setLoadingIscritti] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    caricaOccorrenze()
  }, [])

  useEffect(() => {
    if (selezionata) caricaIscritti(selezionata)
    else setIscritti([])
  }, [selezionata])

  async function caricaOccorrenze() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('attivita')
      .select('id, nome, data, ora_inizio')
      .order('data', { ascending: false })
      .limit(100)
    if (fetchError) setError(fetchError.message)
    else setOccorrenze(data || [])
    setLoading(false)
  }

  async function caricaIscritti(attivitaId) {
    setLoadingIscritti(true)
    setError(null)

    const { data: prenotazioni, error: e1 } = await supabase
      .from('prenotazioni')
      .select('cliente_id, clienti(nome, cognome)')
      .eq('attivita_id', attivitaId)
      .eq('stato', 'confermata')

    if (e1) {
      setError(e1.message)
      setLoadingIscritti(false)
      return
    }

    const clienteIds = (prenotazioni || []).map((p) => p.cliente_id)
    let brevettiPerCliente = new Map()

    if (clienteIds.length > 0) {
      const { data: brevetti, error: e2 } = await supabase
        .from('brevetti')
        .select('cliente_id, tipo_brevetto_libero, tipi_brevetto(tipo_brevetto, didattica, livello)')
        .in('cliente_id', clienteIds)

      if (e2) {
        setError(e2.message)
      } else {
        for (const b of brevetti || []) {
          const livello = b.tipi_brevetto?.livello
          const attuale = brevettiPerCliente.get(b.cliente_id)
          if (livello !== null && livello !== undefined && (!attuale || livello > attuale.livello)) {
            brevettiPerCliente.set(b.cliente_id, {
              livello,
              descrizione: `${b.tipi_brevetto.didattica} — ${b.tipi_brevetto.tipo_brevetto} (liv. ${livello})`,
            })
          }
        }
      }
    }

    setIscritti(
      (prenotazioni || []).map((p) => ({
        cliente_id: p.cliente_id,
        nome: p.clienti?.nome,
        cognome: p.clienti?.cognome,
        brevetto: brevettiPerCliente.get(p.cliente_id)?.descrizione || 'Nessun brevetto con livello numerico',
      }))
    )
    setLoadingIscritti(false)
  }

  const attivitaSelezionata = occorrenze.find((o) => o.id === selezionata)

  const colonneCSV = [
    { chiave: 'cognome', etichetta: 'Cognome' },
    { chiave: 'nome', etichetta: 'Nome' },
    { chiave: 'brevetto', etichetta: 'Brevetto più alto' },
  ]

  function esporta() {
    if (!attivitaSelezionata) return
    scaricaCSV(`registro-pre-evento-${attivitaSelezionata.data}.csv`, colonneCSV, iscritti)
  }

  return (
    <div>
      {error && <p className="modelli-error">{error}</p>}

      <div className="form-field registro-select">
        <label>Scegli un'attività</label>
        {loading ? (
          <p className="modelli-hint">Caricamento…</p>
        ) : (
          <select value={selezionata} onChange={(e) => setSelezionata(e.target.value)}>
            <option value="">Seleziona…</option>
            {occorrenze.map((o) => (
              <option key={o.id} value={o.id}>
                {formattaData(o.data)} — {o.nome} ({formattaOra(o.ora_inizio)})
              </option>
            ))}
          </select>
        )}
      </div>

      {selezionata && (
        <>
          <div className="catalogo-sezione-header">
            <div />
            <span className="catalogo-azioni">
              <button className="btn-primary" onClick={esporta} disabled={iscritti.length === 0}>
                Esporta CSV
              </button>
              <BottoneDrive
                nomeFile={attivitaSelezionata ? `registro-pre-evento-${attivitaSelezionata.data}.csv` : 'registro-pre-evento.csv'}
                colonne={colonneCSV}
                righe={iscritti}
                disabled={iscritti.length === 0}
              />
            </span>
          </div>

          {loadingIscritti ? (
            <p className="modelli-hint">Caricamento…</p>
          ) : iscritti.length === 0 ? (
            <p className="modelli-hint">Nessun iscritto confermato per questa attività.</p>
          ) : (
            <ul className="catalogo-list">
              {iscritti.map((i) => (
                <li key={i.cliente_id}>
                  <span>
                    <strong>{i.cognome} {i.nome}</strong> — {i.brevetto}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
